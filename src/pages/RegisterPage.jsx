import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { register } from "../api";
import { useApp } from "../context/AppContext";
import NexaLogo from "../components/ui/NexaLogo";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { setUser } = useApp();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail]             = useState("");
  const [password, setPassword]       = useState("");
  const [confirm, setConfirm]         = useState("");
  const [showPwd, setShowPwd]         = useState(false);
  const [showConf, setShowConf]       = useState(false);

  const [errors, setErrors]           = useState({});
  const [globalError, setGlobalError] = useState("");
  const [loading, setLoading]         = useState(false);

  function validate() {
    const e = {};
    if (!email) e.email = "L'email est requis.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Format d'email invalide.";
    if (!password) e.password = "Le mot de passe est requis.";
    else if (password.length < 8) e.password = "Minimum 8 caractères.";
    if (!confirm) e.confirm = "Veuillez confirmer le mot de passe.";
    else if (password !== confirm) e.confirm = "Les mots de passe ne correspondent pas.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setGlobalError("");
    if (!validate()) return;
    setLoading(true);
    try {
      const data = await register({ email, password, displayName });
      setUser(data.user);
      navigate("/chat");
    } catch (err) {
      setGlobalError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-split">

        {/* Panneau gauche */}
        <div className="auth-brand auth-brand--register">
          <div className="brand-content">
            <div className="brand-logo">
              <NexaLogo size={40} gradient="purple" />
              <span>NexaAI</span>
            </div>
            <h1 className="brand-headline">Rejoignez<br/>NexaAI gratuitement</h1>
            <p className="brand-sub">Créez votre compte en quelques secondes et commencez à utiliser l'IA immédiatement.</p>
            <div className="brand-perks">
              {[
                "Accès gratuit à Llama 3.3 70B",
                "8 modes spécialisés",
                "Historique sauvegardé",
                "Aucune carte de crédit requise",
              ].map(perk => (
                <div className="perk-item" key={perk}>
                  <span className="perk-icon">✓</span>
                  <span>{perk}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Formulaire */}
        <div className="auth-form-panel">
          <div className="auth-form-inner">
            <div className="auth-form-header">
              <h2>Créer un compte</h2>
              <p>Rejoignez des milliers d'utilisateurs</p>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <div className="form-field">
                <label htmlFor="regName">Nom d'affichage</label>
                <input
                  id="regName"
                  type="text"
                  placeholder="Jean Dupont"
                  autoComplete="name"
                  maxLength={50}
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                />
              </div>

              <div className="form-field">
                <label htmlFor="regEmail">Adresse email</label>
                <input
                  id="regEmail"
                  type="email"
                  placeholder="votre@email.com"
                  autoComplete="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: "" })); }}
                  className={errors.email ? "is-error" : ""}
                />
                <span className="field-error">{errors.email}</span>
              </div>

              <div className="form-field">
                <label htmlFor="regPassword">Mot de passe</label>
                <div className="password-wrap">
                  <input
                    id="regPassword"
                    type={showPwd ? "text" : "password"}
                    placeholder="Minimum 8 caractères"
                    autoComplete="new-password"
                    value={password}
                    onChange={e => { setPassword(e.target.value); setErrors(p => ({ ...p, password: "" })); }}
                    className={errors.password ? "is-error" : ""}
                  />
                  <button type="button" className="toggle-pwd" onClick={() => setShowPwd(v => !v)}>
                    <EyeIcon />
                  </button>
                </div>
                <span className="field-error">{errors.password}</span>
              </div>

              <div className="form-field">
                <label htmlFor="regConfirm">Confirmer le mot de passe</label>
                <div className="password-wrap">
                  <input
                    id="regConfirm"
                    type={showConf ? "text" : "password"}
                    placeholder="Répétez votre mot de passe"
                    autoComplete="new-password"
                    value={confirm}
                    onChange={e => { setConfirm(e.target.value); setErrors(p => ({ ...p, confirm: "" })); }}
                    className={errors.confirm ? "is-error" : ""}
                  />
                  <button type="button" className="toggle-pwd" onClick={() => setShowConf(v => !v)}>
                    <EyeIcon />
                  </button>
                </div>
                <span className="field-error">{errors.confirm}</span>
              </div>

              {globalError && <div className="form-alert">{globalError}</div>}

              <button type="submit" className="btn-submit btn-submit--purple" disabled={loading}>
                {loading ? (
                  <span className="btn-spinner">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/>
                    </svg>
                  </span>
                ) : "Créer mon compte"}
              </button>
            </form>

            <p className="auth-redirect">
              Déjà un compte ?{" "}
              <Link to="/login" className="link-btn">Se connecter</Link>
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
