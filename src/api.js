// Toutes les fonctions d'appel à l'API backend
const BASE = "";

async function request(path, options = {}) {
  const res = await fetch(BASE + path, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Erreur ${res.status}`);
  }
  return res.json();
}

// Auth
export const getMe           = ()           => request("/api/auth/me");
export const login           = (body)       => request("/api/auth/login",    { method: "POST", body: JSON.stringify(body) });
export const register        = (body)       => request("/api/auth/register", { method: "POST", body: JSON.stringify(body) });
export const logout          = ()           => request("/api/auth/logout",   { method: "POST" });
export const updateProfile   = (body)       => request("/api/auth/profile",  { method: "PATCH", body: JSON.stringify(body) });

// Templates IA
export const getTemplates    = ()           => request("/api/templates");

// Conversations
export const getConversations        = ()        => request("/api/conversations");
export const createConversation      = ()        => request("/api/conversations", { method: "POST" });
export const deleteConversation      = (id)      => request(`/api/conversations/${id}`, { method: "DELETE" });
export const renameConversation      = (id, title) => request(`/api/conversations/${id}`, { method: "PATCH", body: JSON.stringify({ title }) });
export const getConversationMessages = (id)      => request(`/api/conversations/${id}/messages`);

// Recherche
export const searchHistory   = (q, convId) =>
  request(`/api/history/search?q=${encodeURIComponent(q)}&conversationId=${convId}`);

// Chat (SSE streaming) — retourne la Response brute
export async function sendChatMessage(message, config, conversationId) {
  const res = await fetch("/api/chat", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, config, conversationId }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Erreur ${res.status}`);
  }
  return res; // Le streaming est géré par le composant
}
