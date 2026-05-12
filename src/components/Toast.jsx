import { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";

function ToastItem({ toast, onRemove }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Animation entrée
    const t1 = setTimeout(() => setVisible(true), 10);
    // Animation sortie
    const t2 = setTimeout(() => setVisible(false), 3000);
    const t3 = setTimeout(() => onRemove(toast.id), 3500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [toast.id, onRemove]);

  const icon = toast.type === "success" ? "✓" : toast.type === "error" ? "✕" : "ℹ";

  return (
    <div className={`toast toast--${toast.type}${visible ? " visible" : ""}`}>
      <span className="toast-icon">{icon}</span>
      <span className="toast-msg">{toast.message}</span>
    </div>
  );
}

export default function ToastContainer() {
  const { toasts, removeToast } = useApp();

  return (
    <div className="toast-container">
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} onRemove={removeToast} />
      ))}
    </div>
  );
}
