import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { login } from "../api";
import { useApp } from "../context/AppContext";
import NexaLogo from "../components/ui/NexaLogo";

export default function LoginPage() {
  const navigate = useNavigate();
  const { setUser } = useApp();

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd]   = useState(false);
  const [error, setError]       = useState("");
  const [emailErr, setEmailErr] = useState("");
  const [loading, setLoading]   = useState(false);

  function validate() {
    let ok = true;
    setEmailErr(""); setError("");
    if (!email) { setEmailErr("L'email est requis."); ok = false; }
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setEmailErr("Format d'email invalide."); ok = false; }
    if (!password) { setError("Le mot de passe est requis."); ok = false; }
    return ok;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const data = await login({ email, password });
      setUser(data.user);
      navigate("/chat");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-split">

        {/* Panneau gauche */}
        <div className="auth-brand">
          <div className="brand-content">
            <div className="brand-logo">
              <NexaLogo size={40} />
              <span>NexaAI</span>
            </div>
            <h1 className="brand-headline">Votre assistant<br/>intelligent personnel</h1>
            <p className="brand-sub">Posez des questions, obtenez des réponses précises. Codez, traduisez, rédigez — tout en un.</p>
            <div className="brand-features">
              <div className="feature-pill">💻 Aide au code</div>
              <div className="feature-pill">🌍 Traduction</div>
              <div className="feature-pill">📝 Rédaction</div>
              <div className="feature-pill">🔢 Maths</div>
            </div>
          </div>
        </div>

        {/* Formulaire */}
        <div className="auth-form-panel">
          <div className="auth-form-inner">
            <div className="auth-form-header">
              <h2>Bon retour</h2>
              <p>Connectez-vous pour accéder à votre espace</p>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <div className="form-field">
                <label htmlFor="loginEmail">Adresse email</label>
                <input
                  id="loginEmail"
                  type="email"
                  placeholder="votre@email.com"
                  autoComplete="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setEmailErr(""); }}
                  className={emailErr ? "is-error" : ""}
                />
                <span className="field-error">{emailErr}</span>
              </div>

              <div className="form-field">
                <label htmlFor="loginPassword">Mot de passe</label>
                <div className="password-wrap">
                  <input
                    id="loginPassword"
                    type={showPwd ? "text" : "password"}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(""); }}
                  />
                  <button type="button" className="toggle-pwd" onClick={() => setShowPwd(v => !v)}>
                    <EyeIcon />
                  </button>
                </div>
              </div>

              {error && <div className="form-alert">{error}</div>}

              <button type="submit" className="btn-submit" disabled={loading}>
                {loading ? (
                  <span className="btn-spinner">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/>
                    </svg>
                  </span>
                ) : "Se connecter"}
              </button>
            </form>

            <p className="auth-redirect">
              Pas encore de compte ?{" "}
              <Link to="/register" className="link-btn">Créer un compte</Link>
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}

function EyeIcon() {
  return (
    <svg className="eye-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:18,height:18}}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}
