import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { getMe } from "./api";
import { useApp } from "./context/AppContext";
import LoginPage    from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ChatPage     from "./pages/ChatPage";
import ToastContainer from "./components/Toast";

// Route protégée : redirige vers /login si non authentifié
function PrivateRoute({ children }) {
  const { user } = useApp();
  // Pendant le chargement initial (user === null et pas encore vérifié),
  // on attend sans rediriger
  if (user === undefined) return null;
  return user ? children : <Navigate to="/login" replace />;
}

// Route publique : redirige vers /chat si déjà connecté
function PublicRoute({ children }) {
  const { user } = useApp();
  if (user === undefined) return null;
  return user ? <Navigate to="/chat" replace /> : children;
}

export default function App() {
  const { setUser } = useApp();
  const [checked, setChecked] = useState(false);

  // Vérifier la session au chargement
  useEffect(() => {
    getMe()
      .then(data => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setChecked(true));
  }, []);

  // Attendre la vérification de session avant d'afficher quoi que ce soit
  if (!checked) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
        <div style={{
          width: 40, height: 40, borderRadius: "50%",
          border: "3px solid rgba(99,102,241,0.2)",
          borderTopColor: "#6366f1",
          animation: "spin 0.8s linear infinite",
        }} />
      </div>
    );
  }

  return (
    <>
      <Routes>
        <Route path="/login"    element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
        <Route path="/chat"     element={<PrivateRoute><ChatPage /></PrivateRoute>} />
        <Route path="*"         element={<Navigate to="/chat" replace />} />
      </Routes>
      <ToastContainer />
    </>
  );
}
