const path = require("path");
const fs   = require("fs");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const OpenAI = require("openai");
const rateLimit = require("express-rate-limit");
const { getDb } = require("./db");

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "50kb" }));
app.use(cookieParser());

// Servir le build React (dist/) en production, sinon public/ en développement
const staticDir = fs.existsSync(path.join(__dirname, "dist", "index.html"))
  ? path.join(__dirname, "dist")
  : path.join(__dirname, "public");
app.use(express.static(staticDir));

// ── Rate limiters ────────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Trop de requêtes. Veuillez réessayer dans une minute." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Trop de tentatives. Veuillez réessayer dans 15 minutes." },
});

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Trop de messages envoyés. Veuillez attendre une minute." },
});

app.use(globalLimiter);

const groqApiKey = (process.env.GROQ_API_KEY || "").trim();
if (!groqApiKey) {
  console.warn("⚠️  No GROQ_API_KEY found. Set it in a .env file to enable AI responses.");
}

const jwtSecret = (process.env.JWT_SECRET || "change-me").trim();
if (jwtSecret === "change-me") {
  console.warn("⚠️  JWT_SECRET is using the default value. Update .env to a secure random string.");
}

const openai = groqApiKey
  ? new OpenAI({ apiKey: groqApiKey, baseURL: "https://api.groq.com/openai/v1" })
  : null;

// ── Templates IA ─────────────────────────────────────────────────────────────
const TEMPLATE_PROMPTS = [
  {
    id: "assistant",
    name: "🤖 Assistant général",
    system: {
      fr: "Tu es un assistant virtuel intelligent, clair et bienveillant. Tu réponds de façon concise et structurée. Utilise des listes et du markdown pour organiser tes réponses.",
      en: "You are a smart, clear and helpful assistant. Reply concisely and in a structured way. Use lists and markdown to organize your answers.",
    },
  },
  {
    id: "code-helper",
    name: "💻 Aide au code",
    system: {
      fr: "Tu es un expert développeur full-stack. Tu aides à écrire, déboguer et optimiser du code dans tous les langages. Fournis toujours des exemples de code dans des blocs markdown avec la syntaxe appropriée. Explique chaque étape clairement.",
      en: "You are a full-stack expert developer. You help write, debug and optimize code in any language. Always provide code examples in markdown blocks with proper syntax. Explain each step clearly.",
    },
  },
  {
    id: "translator",
    name: "🌍 Traducteur",
    system: {
      fr: "Tu es un traducteur professionnel expert en langues. Traduis les textes demandés avec précision en gardant le sens, le ton et le style de l'original. Précise la langue source et cible, et propose des alternatives si nécessaire.",
      en: "You are a professional language expert translator. Translate texts accurately while preserving meaning, tone and style. Mention source and target language, and suggest alternatives when useful.",
    },
  },
  {
    id: "summarizer",
    name: "📝 Résumeur",
    system: {
      fr: "Tu es un expert en synthèse de texte. Résume les textes en extrayant les idées clés, points importants et conclusions. Propose plusieurs formats : résumé court (3 lignes), résumé détaillé et points clés sous forme de liste.",
      en: "You are a text summarization expert. Summarize texts by extracting key ideas, important points and conclusions. Offer multiple formats: short summary (3 lines), detailed summary and key points as a list.",
    },
  },
  {
    id: "math-science",
    name: "🔢 Maths & Sciences",
    system: {
      fr: "Tu es un professeur de mathématiques et sciences expert. Tu expliques les concepts étape par étape avec des exemples concrets. Tu résous les problèmes en montrant chaque étape du raisonnement. Utilise des formules claires et des explications simples.",
      en: "You are an expert math and science teacher. You explain concepts step by step with concrete examples. You solve problems showing each reasoning step. Use clear formulas and simple explanations.",
    },
  },
  {
    id: "writing",
    name: "✍️ Rédaction",
    system: {
      fr: "Tu es un rédacteur professionnel créatif. Tu aides à écrire des emails, lettres, articles, histoires, discours et tout type de contenu. Tu proposes différents tons (formel, décontracté, persuasif) et améliores les textes existants.",
      en: "You are a professional creative writer. You help write emails, letters, articles, stories, speeches and any content. You offer different tones (formal, casual, persuasive) and improve existing texts.",
    },
  },
  {
    id: "productivity",
    name: "🚀 Productivité",
    system: {
      fr: "Tu es un coach de productivité et gestion du temps expert. Tu donnes des conseils concrets, des méthodes éprouvées (GTD, Pomodoro, Eisenhower) et aides à prioriser, planifier et surmonter la procrastination.",
      en: "You are an expert productivity and time management coach. You give concrete advice, proven methods (GTD, Pomodoro, Eisenhower) and help prioritize, plan and overcome procrastination.",
    },
  },
  {
    id: "research",
    name: "🔍 Recherche & Analyse",
    system: {
      fr: "Tu es un expert en recherche et analyse d'informations. Tu synthétises des sujets complexes, compares des options, analyses des données et fournis des réponses approfondies avec des sources et perspectives multiples.",
      en: "You are an expert in research and information analysis. You synthesize complex topics, compare options, analyze data and provide in-depth answers with sources and multiple perspectives.",
    },
  },
];

// ── Auth helpers ─────────────────────────────────────────────────────────────
function signToken(user) {
  return jwt.sign({ userId: user.id, email: user.email }, jwtSecret, { expiresIn: "7d" });
}

function requireAuth(req, res, next) {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ error: "Non authentifié." });
  try {
    req.user = jwt.verify(token, jwtSecret);
    next();
  } catch {
    return res.status(401).json({ error: "Jeton invalide ou expiré." });
  }
}

// ── DB helpers — Utilisateurs ─────────────────────────────────────────────────
async function getUserByEmail(email) {
  const db = await getDb();
  const result = await db.execute({
    sql: "SELECT * FROM users WHERE email = ?",
    args: [email.toLowerCase()],
  });
  return result.rows[0] || null;
}

async function getUserById(id) {
  const db = await getDb();
  const result = await db.execute({ sql: "SELECT * FROM users WHERE id = ?", args: [id] });
  return result.rows[0] || null;
}

async function createUser(email, passwordHash, displayName) {
  const db = await getDb();
  const result = await db.execute({
    sql: "INSERT INTO users (email, password_hash, display_name, created_at) VALUES (?, ?, ?, ?)",
    args: [email.toLowerCase(), passwordHash, displayName || null, Date.now()],
  });
  return { id: Number(result.lastInsertRowid), email: email.toLowerCase(), display_name: displayName || null };
}

// ── DB helpers — Conversations ────────────────────────────────────────────────
async function getAllConversations(userId) {
  const db = await getDb();
  const result = await db.execute({
    sql: `SELECT c.id, c.title, c.created_at, c.updated_at,
            (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) AS message_count
          FROM conversations c
          WHERE c.user_id = ?
          ORDER BY COALESCE(c.updated_at, c.created_at) DESC
          LIMIT 50`,
    args: [userId],
  });
  return result.rows;
}

async function getConversationById(id, userId) {
  const db = await getDb();
  const result = await db.execute({
    sql: "SELECT * FROM conversations WHERE id = ? AND user_id = ?",
    args: [id, userId],
  });
  return result.rows[0] || null;
}

async function createConversation(userId) {
  const db = await getDb();
  const now = Date.now();
  const result = await db.execute({
    sql: "INSERT INTO conversations (user_id, created_at, updated_at) VALUES (?, ?, ?)",
    args: [userId, now, now],
  });
  return { id: Number(result.lastInsertRowid), user_id: userId, title: null, created_at: now, updated_at: now };
}

async function deleteConversation(id, userId) {
  const db = await getDb();
  await db.execute({ sql: "DELETE FROM messages WHERE conversation_id = ?", args: [id] });
  await db.execute({ sql: "DELETE FROM conversations WHERE id = ? AND user_id = ?", args: [id, userId] });
}

async function renameConversation(id, userId, title) {
  const db = await getDb();
  await db.execute({
    sql: "UPDATE conversations SET title = ? WHERE id = ? AND user_id = ?",
    args: [title, id, userId],
  });
}

async function updateConversationTitle(conversationId, title) {
  const db = await getDb();
  await db.execute({
    sql: "UPDATE conversations SET title = ? WHERE id = ?",
    args: [title, conversationId],
  });
}

// ── DB helpers — Messages ─────────────────────────────────────────────────────
async function addMessage(conversationId, role, content) {
  const db = await getDb();
  const now = Date.now();
  await db.execute({
    sql: "INSERT INTO messages (conversation_id, role, content, created_at) VALUES (?, ?, ?, ?)",
    args: [conversationId, role, content, now],
  });
  // Mettre à jour le timestamp de la conversation
  await db.execute({
    sql: "UPDATE conversations SET updated_at = ? WHERE id = ?",
    args: [now, conversationId],
  });
}

async function getMessages(conversationId, limit = 50) {
  const db = await getDb();
  const result = await db.execute({
    sql: "SELECT role, content, created_at FROM messages WHERE conversation_id = ? ORDER BY id DESC LIMIT ?",
    args: [conversationId, limit],
  });
  return [...result.rows].reverse();
}

async function searchMessages(conversationId, query) {
  const db = await getDb();
  const result = await db.execute({
    sql: "SELECT role, content, created_at FROM messages WHERE conversation_id = ? AND content LIKE ? ORDER BY id DESC LIMIT 30",
    args: [conversationId, `%${query}%`],
  });
  return result.rows;
}

// ── Routes Auth ───────────────────────────────────────────────────────────────

// Inscription
app.post("/api/auth/register", authLimiter, async (req, res) => {
  const { email, password, displayName } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email et mot de passe requis." });

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return res.status(400).json({ error: "Format d'email invalide." });
  if (password.length < 8) return res.status(400).json({ error: "Le mot de passe doit contenir au moins 8 caractères." });
  if (await getUserByEmail(email)) return res.status(400).json({ error: "Cet email est déjà utilisé." });

  try {
    const hash = await bcrypt.hash(password, 10);
    const name = typeof displayName === "string" ? displayName.trim().slice(0, 50) || null : null;
    const user = await createUser(email, hash, name);
    const token = signToken(user);
    res.cookie("token", token, { httpOnly: true, sameSite: "lax", maxAge: 7 * 24 * 60 * 60 * 1000 });
    return res.json({ ok: true, user: { email: user.email, displayName: user.display_name } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Impossible de créer le compte." });
  }
});

// Connexion
app.post("/api/auth/login", authLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email et mot de passe requis." });

  const user = await getUserByEmail(email);
  if (!user) return res.status(401).json({ error: "Identifiants invalides." });

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) return res.status(401).json({ error: "Identifiants invalides." });

  const token = signToken(user);
  res.cookie("token", token, { httpOnly: true, sameSite: "lax", maxAge: 7 * 24 * 60 * 60 * 1000 });
  return res.json({ ok: true, user: { email: user.email, displayName: user.display_name } });
});

// Déconnexion
app.post("/api/auth/logout", (_req, res) => {
  res.clearCookie("token");
  res.json({ ok: true });
});

// Infos utilisateur connecté
app.get("/api/auth/me", requireAuth, async (req, res) => {
  const user = await getUserById(req.user.userId);
  if (!user) return res.status(404).json({ error: "Utilisateur introuvable." });
  res.json({ user: { email: user.email, displayName: user.display_name } });
});

// Mise à jour du profil (nom d'affichage + mot de passe)
app.patch("/api/auth/profile", requireAuth, async (req, res) => {
  const { displayName, currentPassword, newPassword } = req.body;
  const db = await getDb();
  const user = await getUserById(req.user.userId);
  if (!user) return res.status(404).json({ error: "Utilisateur introuvable." });

  const updates = [];
  const args = [];

  if (displayName !== undefined) {
    const name = String(displayName).trim().slice(0, 50);
    updates.push("display_name = ?");
    args.push(name || null);
  }

  if (newPassword) {
    if (!currentPassword) return res.status(400).json({ error: "Mot de passe actuel requis pour le changer." });
    const match = await bcrypt.compare(currentPassword, user.password_hash);
    if (!match) return res.status(400).json({ error: "Mot de passe actuel incorrect." });
    if (newPassword.length < 8) return res.status(400).json({ error: "Le nouveau mot de passe doit contenir au moins 8 caractères." });
    const hash = await bcrypt.hash(newPassword, 10);
    updates.push("password_hash = ?");
    args.push(hash);
  }

  if (updates.length === 0) return res.status(400).json({ error: "Aucune modification fournie." });

  args.push(req.user.userId);
  await db.execute({ sql: `UPDATE users SET ${updates.join(", ")} WHERE id = ?`, args });

  const updated = await getUserById(req.user.userId);
  res.json({ ok: true, user: { email: updated.email, displayName: updated.display_name } });
});

// ── Routes Conversations ──────────────────────────────────────────────────────

// Lister toutes les conversations de l'utilisateur
app.get("/api/conversations", requireAuth, async (req, res) => {
  const conversations = await getAllConversations(req.user.userId);
  res.json({ conversations });
});

// Créer une nouvelle conversation vide
app.post("/api/conversations", requireAuth, async (req, res) => {
  const conversation = await createConversation(req.user.userId);
  res.json({ conversation });
});

// Supprimer une conversation (et tous ses messages)
app.delete("/api/conversations/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "ID invalide." });
  const conversation = await getConversationById(id, req.user.userId);
  if (!conversation) return res.status(404).json({ error: "Conversation introuvable." });
  await deleteConversation(id, req.user.userId);
  res.json({ ok: true });
});

// Renommer une conversation
app.patch("/api/conversations/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const { title } = req.body;
  if (!id) return res.status(400).json({ error: "ID invalide." });
  if (!title || !String(title).trim()) return res.status(400).json({ error: "Le titre est requis." });
  const conversation = await getConversationById(id, req.user.userId);
  if (!conversation) return res.status(404).json({ error: "Conversation introuvable." });
  await renameConversation(id, req.user.userId, String(title).trim().slice(0, 100));
  res.json({ ok: true });
});

// Récupérer les messages d'une conversation spécifique
app.get("/api/conversations/:id/messages", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "ID invalide." });
  const conversation = await getConversationById(id, req.user.userId);
  if (!conversation) return res.status(404).json({ error: "Conversation introuvable." });
  const messages = await getMessages(id, 100);
  res.json({ messages, conversation });
});

// ── Route Chat (SSE streaming) ────────────────────────────────────────────────
app.post("/api/chat", requireAuth, chatLimiter, async (req, res) => {
  if (!openai) {
    return res.status(500).json({ error: "Clé API manquante. Définissez GROQ_API_KEY dans .env." });
  }

  const { message, config, conversationId } = req.body;
  if (!message || typeof message !== "string") return res.status(400).json({ error: "Le message est requis." });
  if (message.length > 4000) return res.status(400).json({ error: "Le message est trop long (maximum 4000 caractères)." });

  const userId = req.user.userId;
  let conversation;

  if (conversationId) {
    // Charger la conversation existante (en vérifiant qu'elle appartient à l'utilisateur)
    conversation = await getConversationById(Number(conversationId), userId);
    if (!conversation) return res.status(404).json({ error: "Conversation introuvable." });
  } else {
    // Créer une nouvelle conversation automatiquement
    conversation = await createConversation(userId);
  }

  const model = config?.model || "llama-3.3-70b-versatile";
  const temperature = Number(config?.temperature ?? 0.8);
  const language = config?.language || "fr";
  const templateId = config?.templateId || "assistant";

  const template = TEMPLATE_PROMPTS.find((t) => t.id === templateId) || TEMPLATE_PROMPTS[0];
  const basePrompt = template.system[language] || template.system.fr;
  const langInstruction =
    language === "en"
      ? "IMPORTANT: Always respond in English, regardless of the language used by the user."
      : "IMPORTANT : Réponds toujours en français, quelle que soit la langue utilisée par l'utilisateur.";
  const systemPrompt = `${basePrompt}\n\n${langInstruction}`;

  const history = await getMessages(conversation.id, 20);
  const isFirstMessage = history.length === 0;
  const conversationMessages = [
    { role: "system", content: systemPrompt },
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: message },
  ];

  // Démarrer le flux SSE
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  // Envoyer l'ID de conversation en premier (utile si elle vient d'être créée)
  res.write(`data: ${JSON.stringify({ conversationId: conversation.id })}\n\n`);

  try {
    const stream = await openai.chat.completions.create({
      model,
      messages: conversationMessages,
      max_tokens: 2000,
      temperature,
      stream: true,
    });

    let fullContent = "";
    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content || "";
      if (token) {
        fullContent += token;
        res.write(`data: ${JSON.stringify({ token })}\n\n`);
      }
    }

    await addMessage(conversation.id, "user", message);
    await addMessage(conversation.id, "assistant", fullContent || "");

    let title;
    if (isFirstMessage && fullContent) {
      title = message.replace(/\s+/g, " ").slice(0, 60).trim();
      await updateConversationTitle(conversation.id, title);
    }

    res.write(`data: ${JSON.stringify({ done: true, conversationId: conversation.id, ...(title && { title }) })}\n\n`);
    res.end();
  } catch (error) {
    console.error("API error:", error?.response?.data || error);
    const errMsg =
      error?.status === 429 || error?.code === "insufficient_quota"
        ? "Quota Groq épuisé. Vérifiez votre clé API sur console.groq.com."
        : error?.message || "Une erreur est survenue lors de la génération de la réponse.";
    res.write(`data: ${JSON.stringify({ error: errMsg })}\n\n`);
    res.end();
  }
});

// ── Routes Historique (compatibilité) ────────────────────────────────────────
app.get("/api/history", requireAuth, async (req, res) => {
  const userId = req.user.userId;
  const convs = await getAllConversations(userId);
  if (!convs.length) return res.json({ history: [], conversationId: null });
  const latest = convs[0];
  const history = await getMessages(latest.id, 50);
  res.json({ history, conversationId: latest.id });
});

app.post("/api/history/clear", requireAuth, async (req, res) => {
  const { conversationId } = req.body;
  const userId = req.user.userId;
  if (conversationId) {
    const conv = await getConversationById(Number(conversationId), userId);
    if (conv) await deleteConversation(conv.id, userId);
  } else {
    const convs = await getAllConversations(userId);
    if (convs.length) await deleteConversation(Number(convs[0].id), userId);
  }
  res.json({ ok: true });
});

app.get("/api/history/search", requireAuth, async (req, res) => {
  const q = (req.query.q || "").trim();
  const convId = Number(req.query.conversationId);
  if (!q || q.length < 2) return res.json({ results: [] });

  const userId = req.user.userId;
  let targetId = convId;

  if (!targetId) {
    const convs = await getAllConversations(userId);
    if (!convs.length) return res.json({ results: [] });
    targetId = Number(convs[0].id);
  } else {
    const conv = await getConversationById(targetId, userId);
    if (!conv) return res.json({ results: [] });
  }

  const results = await searchMessages(targetId, q);
  res.json({ results });
});

// ── Templates ─────────────────────────────────────────────────────────────────
app.get("/api/templates", (_req, res) => {
  res.json({ templates: TEMPLATE_PROMPTS });
});

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: Date.now() });
});

// ── Catch-all pour React Router (SPA) ────────────────────────────────────────
// Toutes les routes non-API renvoient index.html pour que React Router gère la navigation
app.get("*", (_req, res) => {
  res.sendFile(path.join(staticDir, "index.html"));
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`🚀 Server running: http://localhost:${port}`);
  });
}

module.exports = app;