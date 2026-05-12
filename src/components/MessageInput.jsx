import { useState, useRef, useEffect } from "react";

export default function MessageInput({ onSend, disabled }) {
  const [text, setText]   = useState("");
  const textareaRef       = useRef(null);

  useEffect(() => {
    // Exposer le textarea via l'id pour les quick-cards
    if (textareaRef.current) textareaRef.current.id = "chat-input";
  }, []);

  function autoResize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }

  function handleChange(e) {
    setText(e.target.value);
    autoResize();
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  function handleSubmit() {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  // Gérer les événements du DOM (pour les quick-cards)
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    function onInput() {
      setText(el.value);
      autoResize();
    }
    el.addEventListener("input", onInput);
    return () => el.removeEventListener("input", onInput);
  }, []);

  return (
    <div className="input-zone">
      <div className="input-box">
        <textarea
          ref={textareaRef}
          className="input-textarea"
          placeholder="Écrivez votre message…"
          rows={1}
          autoComplete="off"
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
        />
        <div className="input-controls">
          <span className="char-counter">{text.length}</span>
          <button
            className="send-btn"
            type="button"
            title="Envoyer (Entrée)"
            onClick={handleSubmit}
            disabled={disabled || !text.trim()}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      </div>
      <p className="input-footer">
        Propulsé par <strong>Groq</strong> · <strong>Llama 3</strong> · Maj+Entrée pour nouvelle ligne
      </p>
    </div>
  );
}
