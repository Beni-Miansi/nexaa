import { createContext, useContext, useState, useCallback } from "react";

// ── Contexte global de l'application ─────────────────────────────────────────
const AppContext = createContext(null);

export function AppProvider({ children }) {
  // Utilisateur connecté
  const [user, setUser] = useState(null);

  // Toasts
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = "info") => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <AppContext.Provider value={{ user, setUser, toasts, showToast, removeToast }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
