function formatRelativeTime(ts) {
  if (!ts) return "";
  const diff = Date.now() - Number(ts);
  const min = Math.floor(diff / 60000);
  const h   = Math.floor(diff / 3600000);
  const d   = Math.floor(diff / 86400000);
  if (min < 1)  return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  if (h < 24)   return `il y a ${h}h`;
  if (d < 7)    return `il y a ${d}j`;
  return new Date(Number(ts)).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export default function ConversationList({ conversations, activeId, onSelect, onDelete }) {
  if (!conversations.length) {
    return <div className="conv-list"><div className="conv-empty-hint">Aucune conversation encore</div></div>;
  }

  return (
    <div className="conv-list">
      {conversations.map(conv => (
        <ConvItem
          key={conv.id}
          conv={conv}
          active={Number(conv.id) === Number(activeId)}
          onSelect={() => onSelect(conv.id)}
          onDelete={(e) => { e.stopPropagation(); onDelete(conv.id); }}
        />
      ))}
    </div>
  );
}

function ConvItem({ conv, active, onSelect, onDelete }) {
  const title   = conv.title || "Nouvelle conversation";
  const ts      = conv.updated_at || conv.created_at;
  const timeStr = formatRelativeTime(ts);

  return (
    <div className={`conv-item${active ? " active" : ""}`} onClick={onSelect} role="button" tabIndex={0}
      onKeyDown={e => e.key === "Enter" && onSelect()}>
      <div className="conv-item-content" title={title}>
        <span className="conv-item-title">{title}</span>
        <span className="conv-item-time">{timeStr}</span>
      </div>
      <button
        className="conv-item-delete"
        onClick={onDelete}
        aria-label="Supprimer cette conversation"
        title="Supprimer"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  );
}
