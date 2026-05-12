import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  getTemplates, getConversations, createConversation,
  deleteConversation, renameConversation, getConversationMessages,
  searchHistory, sendChatMessage, logout,
} from "../api";
import { useApp } from "../context/AppContext";
import Sidebar from "../components/Sidebar";
import ChatMessages from "../components/ChatMessages";
import MessageInput from "../components/MessageInput";
import EmptyState from "../components/EmptyState";
import ProfileModal from "../components/ProfileModal";

const TEMPLATES = [
  { id: "assistant",   name: "🤖 Assistant général" },
  { id: "code-helper", name: "💻 Aide au code" },
  { id: "translator",  name: "🌍 Traducteur" },
  { id: "summarizer",  name: "📝 Résumeur" },
  { id: "math-science",name: "🔢 Maths & Sciences" },
  { id: "writing",     name: "✍️ Rédaction" },
  { id: "productivity",name: "🚀 Productivité" },
  { id: "research",    name: "🔍 Recherche & Analyse" },
];

export default function ChatPage() {
  const navigate  = useNavigate();
  const { user, setUser, showToast } = useApp();

  // Sidebar state
  const [sidebarOpen, setSidebarOpen]         = useState(false);
  const [profileOpen, setProfileOpen]         = useState(false);

  // Conversations
  const [conversations, setConversations]     = useState([]);
  const [activeConvId, setActiveConvId]       = useState(null);
  const [convTitle, setConvTitle]             = useState("");

  // Messages
  const [messages, setMessages]               = useState([]);
  const [streaming, setStreaming]             = useState(false);
  const [streamText, setStreamText]           = useState("");
  const [status, setStatus]                   = useState("");

  // Config IA
  const [templateId, setTemplateId]           = useState("assistant");
  const [model, setModel]                     = useState("llama-3.3-70b-versatile");
  const [language, setLanguage]               = useState("fr");
  const [temperature, setTemperature]         = useState(0.8);

  // Recherche
  const [searchQuery, setSearchQuery]         = useState("");
  const [searchResults, setSearchResults]     = useState(null); // null = pas en recherche

  const messagesEndRef = useRef(null);

  // ── Chargement initial ───────────────────────────────────────────────────
  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamText]);

  async function loadConversations() {
    try {
      const data = await getConversations();
      setConversations(data.conversations);
      if (data.conversations.length > 0) {
        await switchConversation(data.conversations[0].id);
      }
    } catch {
      setStatus("Impossible de charger les conversations.");
    }
  }

  // ── Gestion des conversations ────────────────────────────────────────────
  async function switchConversation(id) {
    setActiveConvId(id);
    setSearchQuery("");
    setSearchResults(null);
    try {
      const data = await getConversationMessages(id);
      setMessages(data.messages);
      setConvTitle(data.conversation.title || "");
    } catch {
      showToast("Impossible de charger cette conversation.", "error");
    }
  }

  async function handleNewConversation() {
    try {
      const data = await createConversation();
      const conv = data.conversation;
      setConversations(prev => [conv, ...prev]);
      setActiveConvId(conv.id);
      setMessages([]);
      setConvTitle("");
      setSearchQuery("");
      setSearchResults(null);
    } catch {
      showToast("Impossible de créer une nouvelle conversation.", "error");
    }
  }

  async function handleDeleteConversation(id) {
    const conv = conversations.find(c => Number(c.id) === Number(id));
    if (!conv) return;
    const title = conv.title || "cette conversation";
    if (!confirm(`Supprimer "${title}" ?\nCette action est irréversible.`)) return;
    try {
      await deleteConversation(id);
      const updated = conversations.filter(c => Number(c.id) !== Number(id));
      setConversations(updated);
      if (Number(id) === Number(activeConvId)) {
        if (updated.length > 0) {
          await switchConversation(updated[0].id);
        } else {
          setActiveConvId(null);
          setMessages([]);
          setConvTitle("");
        }
      }
      showToast("Conversation supprimée.", "success");
    } catch {
      showToast("Impossible de supprimer la conversation.", "error");
    }
  }

  async function handleRenameConversation() {
    if (!activeConvId) return;
    const current = convTitle || "Nouvelle conversation";
    const newTitle = prompt("Nouveau titre :", current);
    if (!newTitle || !newTitle.trim() || newTitle.trim() === current) return;
    try {
      await renameConversation(activeConvId, newTitle.trim());
      setConvTitle(newTitle.trim());
      setConversations(prev =>
        prev.map(c => Number(c.id) === Number(activeConvId) ? { ...c, title: newTitle.trim() } : c)
      );
      showToast("Conversation renommée.", "success");
    } catch {
      showToast("Impossible de renommer.", "error");
    }
  }

  // ── Recherche ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults(null);
      return;
    }
    if (!activeConvId) return;
    const timer = setTimeout(async () => {
      try {
        const data = await searchHistory(searchQuery, activeConvId);
        setSearchResults(data.results || []);
      } catch {}
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery, activeConvId]);

  // ── Envoi de message ─────────────────────────────────────────────────────
  const handleSend = useCallback(async (text) => {
    if (streaming) return;

    // Ajouter le message utilisateur localement (optimistic)
    const userMsg = { role: "user", content: text, created_at: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setStreaming(true);
    setStreamText("");
    setStatus("Génération en cours…");
    setSearchResults(null);
    setSearchQuery("");

    let convId = activeConvId;

    try {
      const response = await sendChatMessage(
        text,
        { templateId, model, temperature, language },
        convId
      );

      const reader  = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer    = "";
      let fullText  = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop();

        for (const part of parts) {
          if (!part.startsWith("data: ")) continue;
          let data;
          try { data = JSON.parse(part.slice(6)); } catch { continue; }

          if (data.error) throw new Error(data.error);

          // Nouvelle conversation créée côté serveur
          if (data.conversationId && !convId) {
            convId = data.conversationId;
            setActiveConvId(convId);
          }

          if (data.token) {
            fullText += data.token;
            setStreamText(fullText);
          }

          if (data.done) {
            // Ajouter le message assistant au state
            const assistantMsg = { role: "assistant", content: fullText, created_at: Date.now() };
            setMessages(prev => [...prev, assistantMsg]);
            setStreamText("");

            // Mettre à jour le titre si c'était le 1er message
            if (data.title) {
              setConvTitle(data.title);
              setConversations(prev =>
                prev.map(c => Number(c.id) === Number(convId)
                  ? { ...c, title: data.title, updated_at: Date.now() }
                  : c
                )
              );
            }

            // Si nouvelle conv, rafraîchir la liste
            if (!activeConvId) {
              const list = await getConversations();
              setConversations(list.conversations);
            }
          }
        }
      }

      setStatus("");
    } catch (err) {
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: `Désolé, une erreur est survenue : **${err.message}**. Veuillez réessayer.`, created_at: Date.now() },
      ]);
      setStreamText("");
      setStatus(err.message);
    } finally {
      setStreaming(false);
    }
  }, [streaming, activeConvId, templateId, model, temperature, language]);

  // ── Déconnexion ──────────────────────────────────────────────────────────
  async function handleLogout() {
    await logout().catch(() => {});
    setUser(null);
    navigate("/login");
  }

  // ── Template actuel ──────────────────────────────────────────────────────
  const currentTemplate = TEMPLATES.find(t => t.id === templateId) || TEMPLATES[0];

  // ── Données affichées ────────────────────────────────────────────────────
  const displayMessages = searchResults !== null ? searchResults : messages;
  const isEmpty = displayMessages.length === 0 && !streaming;

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        conversations={conversations}
        activeConvId={activeConvId}
        onNewConversation={handleNewConversation}
        onSelectConversation={switchConversation}
        onDeleteConversation={handleDeleteConversation}
        templates={TEMPLATES}
        templateId={templateId}
        onTemplateChange={setTemplateId}
        model={model}
        onModelChange={setModel}
        language={language}
        onLanguageChange={setLanguage}
        temperature={temperature}
        onTemperatureChange={setTemperature}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        user={user}
        onProfileOpen={() => setProfileOpen(true)}
        onLogout={handleLogout}
      />

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Zone principale */}
      <main className="chat-main">
        {/* Header */}
        <header className="chat-header">
          <button className="icon-btn" onClick={() => setSidebarOpen(true)} aria-label="Menu">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <div className="header-info">
            <div className="header-mode">{currentTemplate.name}</div>
            {convTitle && <div className="header-title">{convTitle}</div>}
          </div>
          <div className="header-spacer" />
          {activeConvId && (
            <button className="icon-btn" onClick={handleRenameConversation} title="Renommer" style={{display:"flex"}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
          )}
        </header>

        {/* Empty state ou messages */}
        {isEmpty ? (
          <EmptyState onPrompt={text => {
            const el = document.getElementById("chat-input");
            if (el) { el.value = text; el.focus(); el.dispatchEvent(new Event("input", { bubbles: true })); }
          }} />
        ) : (
          <ChatMessages
            messages={displayMessages}
            streaming={streaming}
            streamText={streamText}
            user={user}
            endRef={messagesEndRef}
            searchMode={searchResults !== null}
          />
        )}

        {/* Indicateur de frappe */}
        {streaming && !streamText && (
          <div className="typing-wrap">
            <div className="typing-bubble">
              <span /><span /><span />
            </div>
            <span className="typing-label">NexaAI réfléchit…</span>
          </div>
        )}

        {/* Saisie */}
        <MessageInput onSend={handleSend} disabled={streaming} />

        {/* Barre de statut */}
        {status && (
          <div className="status-line" style={{ color: status.startsWith("Génération") ? "var(--text3)" : "var(--red)" }}>
            {status}
          </div>
        )}
      </main>

      {/* Modal profil */}
      {profileOpen && (
        <ProfileModal
          user={user}
          onClose={() => setProfileOpen(false)}
          onSave={(updated) => {
            setUser(updated);
            setProfileOpen(false);
            showToast("Profil mis à jour.", "success");
          }}
        />
      )}
    </div>
  );
}
