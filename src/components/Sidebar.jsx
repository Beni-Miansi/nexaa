import NexaLogo from "./ui/NexaLogo";
import ConversationList from "./ConversationList";

export default function Sidebar({
  open, onClose,
  conversations, activeConvId,
  onNewConversation, onSelectConversation, onDeleteConversation,
  templates, templateId, onTemplateChange,
  model, onModelChange,
  language, onLanguageChange,
  temperature, onTemperatureChange,
  searchQuery, onSearchChange,
  user, onProfileOpen, onLogout,
}) {
  const displayName = user?.displayName || user?.email?.split("@")[0] || "—";
  const initial     = displayName.charAt(0).toUpperCase();

  return (
    <aside className={`sidebar${open ? " is-open" : ""}`}>

      {/* Logo + Nouvelle conversation */}
      <div className="sidebar-top">
        <div className="sidebar-brand">
          <NexaLogo size={28} />
          <span className="sidebar-brand-name">NexaAI</span>
        </div>
        <button className="btn-new-chat" onClick={onNewConversation}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Nouvelle conversation
        </button>
      </div>

      {/* Zone scrollable */}
      <div className="sidebar-scroll">

        {/* Liste des conversations */}
        <div className="conv-section">
          <span className="sidebar-label">Conversations récentes</span>
          <ConversationList
            conversations={conversations}
            activeId={activeConvId}
            onSelect={onSelectConversation}
            onDelete={onDeleteConversation}
          />
        </div>

        {/* Mode assistant */}
        <div className="sidebar-section">
          <span className="sidebar-label">Mode de l'assistant</span>
          <select
            className="sidebar-select"
            value={templateId}
            onChange={e => onTemplateChange(e.target.value)}
          >
            {templates.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        {/* Modèle IA */}
        <div className="sidebar-section">
          <span className="sidebar-label">Modèle IA</span>
          <select
            className="sidebar-select"
            value={model}
            onChange={e => onModelChange(e.target.value)}
          >
            <option value="llama-3.3-70b-versatile">Llama 3.3 70B — Puissant</option>
            <option value="meta-llama/llama-4-scout-17b-16e-instruct">Llama 4 Scout 17B — Équilibré</option>
            <option value="qwen/qwen3-32b">Qwen 3 32B — Rapide</option>
          </select>
        </div>

        {/* Langue */}
        <div className="sidebar-section">
          <span className="sidebar-label">Langue de réponse</span>
          <select
            className="sidebar-select"
            value={language}
            onChange={e => onLanguageChange(e.target.value)}
          >
            <option value="fr">🇫🇷 Français</option>
            <option value="en">🇬🇧 English</option>
          </select>
        </div>

        {/* Créativité */}
        <div className="sidebar-section">
          <div className="slider-header">
            <span className="sidebar-label">Créativité</span>
            <span className="slider-value">{temperature.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="0" max="1" step="0.05"
            value={temperature}
            className="slider"
            style={{
              background: `linear-gradient(to right, var(--indigo) 0%, var(--indigo) ${temperature * 100}%, var(--border2) ${temperature * 100}%)`,
            }}
            onChange={e => onTemperatureChange(Number(e.target.value))}
          />
          <div className="slider-labels"><span>Précis</span><span>Créatif</span></div>
        </div>

        {/* Recherche */}
        <div className="sidebar-section">
          <span className="sidebar-label">Rechercher dans l'historique</span>
          <input
            type="text"
            className="sidebar-input"
            placeholder="Rechercher un message…"
            autoComplete="off"
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
          />
        </div>

      </div>

      {/* Pied de sidebar */}
      <div className="sidebar-footer">
        <button className="user-card" onClick={onProfileOpen} title="Modifier mon profil">
          <div className="user-avatar">{initial}</div>
          <div className="user-details">
            <span className="user-name">{displayName}</span>
            <span className="user-email">{user?.email || ""}</span>
          </div>
          <svg className="user-edit-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <div className="sidebar-actions">
          <button className="sidebar-action-btn sidebar-action-btn--danger" onClick={onLogout}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Se déconnecter
          </button>
        </div>
      </div>

    </aside>
  );
}
