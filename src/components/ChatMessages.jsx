import { useState } from "react";

// ── Rendu Markdown simple (sans dépendance externe) ───────────────────────────
function renderMarkdown(raw) {
  if (!raw) return "";
  let t = raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  t = t.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) =>
    `<pre><code class="lang-${lang || "text"}">${code.trim()}</code></pre>`
  );
  t = t.replace(/`([^`\n]+)`/g, '<span class="inline-code">$1</span>');
  t = t.replace(/\*\*\*([^*]+)\*\*\*/g, "<strong><em>$1</em></strong>");
  t = t.replace(/\*\*([^*]+)\*\*/g,     "<strong>$1</strong>");
  t = t.replace(/\*([^*\n]+)\*/g,       "<em>$1</em>");
  t = t.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  t = t.replace(/^## (.+)$/gm,  "<h2>$1</h2>");
  t = t.replace(/^# (.+)$/gm,   "<h1>$1</h1>");
  t = t.replace(/^---$/gm, "<hr>");
  t = t.replace(/^[-*] (.+)$/gm,  "<li>$1</li>");
  t = t.replace(/^\d+\. (.+)$/gm, "<li>$1</li>");
  t = t.replace(/(<li>.*?<\/li>\n?)+/gs, m => `<ul>${m}</ul>`);
  t = t.split(/\n{2,}/).map(block => {
    if (/^<(h[1-3]|ul|ol|li|pre|hr)/.test(block.trim())) return block;
    return `<p>${block.replace(/\n/g, "<br>")}</p>`;
  }).join("");
  return t;
}

function escapeHtml(t) {
  return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatTime(ts) {
  const d = ts ? new Date(ts) : new Date();
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

// ── Bulle de message ──────────────────────────────────────────────────────────
function MessageBubble({ msg, user }) {
  const [copied, setCopied] = useState(false);

  const senderName = msg.role === "user"
    ? (user?.displayName || "Vous")
    : "NexaAI";

  const initial = msg.role === "user"
    ? (user?.displayName || user?.email || "V").charAt(0).toUpperCase()
    : "✦";

  function handleCopy() {
    navigator.clipboard.writeText(msg.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className={`message ${msg.role}`}>
      <div className="msg-avatar">{initial}</div>
      <div className="msg-body">
        <div className="msg-meta">
          <span>{senderName}</span>
          <span>·</span>
          <span>{formatTime(msg.created_at)}</span>
        </div>
        <div className="msg-bubble">
          <div dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
          {msg.role === "assistant" && (
            <button className="copy-btn" onClick={handleCopy}>
              {copied ? "✓ Copié !" : "Copier"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Bulle en cours de streaming
function StreamingBubble({ text }) {
  return (
    <div className="message assistant">
      <div className="msg-avatar">✦</div>
      <div className="msg-body">
        <div className="msg-meta">
          <span>NexaAI</span>
          <span>·</span>
          <span>{formatTime()}</span>
        </div>
        <div className="msg-bubble streaming">
          <span dangerouslySetInnerHTML={{ __html: escapeHtml(text) }} />
          <span className="stream-cursor" />
        </div>
      </div>
    </div>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────
export default function ChatMessages({ messages, streaming, streamText, user, endRef, searchMode }) {
  if (searchMode && messages.length === 0) {
    return (
      <div className="chat-messages">
        <p className="search-empty">Aucun résultat pour cette recherche.</p>
      </div>
    );
  }

  return (
    <div className="chat-messages">
      {messages.map((msg, i) => (
        <MessageBubble key={i} msg={msg} user={user} />
      ))}
      {streaming && streamText && <StreamingBubble text={streamText} />}
      <div ref={endRef} />
    </div>
  );
}
