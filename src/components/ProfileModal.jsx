import { useState, useEffect } from "react";
import { updateProfile } from "../api";

export default function ProfileModal({ user, onClose, onSave }) {
  const [displayName,  setDisplayName]  = useState(user?.displayName || "");
  const [currentPwd,   setCurrentPwd]   = useState("");
  const [newPwd,       setNewPwd]       = useState("");
  const [confirmPwd,   setConfirmPwd]   = useState("");
  const [showCurr,     setShowCurr]     = useState(false);
  const [showNew,      setShowNew]      = useState(false);
  const [showConf,     setShowConf]     = useState(false);
  const [error,        setError]        = useState("");
  const [loading,      setLoading]      = useState(false);

  const initial = (user?.displayName || user?.email || "U").charAt(0).toUpperCase();

  // Fermer avec Escape
  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSave() {
    setError("");

    // Validation côté client
    if (newPwd || currentPwd || confirmPwd) {
      if (!currentPwd) { setError("Le mot de passe actuel est requis pour le changer."); return; }
      if (!newPwd) { setError("Veuillez saisir le nouveau mot de passe."); return; }
      if (newPwd.length < 8) { setError("Le nouveau mot de passe doit contenir au moins 8 caractères."); return; }
      if (newPwd !== confirmPwd) { setError("Les nouveaux mots de passe ne correspondent pas."); return; }
    }

    const body = {};
    if (displayName !== (user?.displayName || "")) body.displayName = displayName;
    if (newPwd) { body.currentPassword = currentPwd; body.newPassword = newPwd; }

    if (Object.keys(body).length === 0) { onClose(); return; }

    setLoading(true);
    try {
      const data = await updateProfile(body);
      onSave(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="profileModalTitle">

        <div className="modal-header">
          <h3 id="profileModalTitle">Mon profil</h3>
          <button className="modal-close-btn" onClick={onClose} aria-label="Fermer">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="modal-body">
          {/* Avatar + email */}
          <div className="modal-avatar-section">
            <div className="modal-avatar-circle">{initial}</div>
            <div className="modal-user-info">
              <p className="modal-user-email">{user?.email}</p>
              <span className="modal-badge">Compte actif</span>
            </div>
          </div>

          {/* Nom d'affichage */}
          <div className="modal-section">
            <h4 className="modal-section-title">Nom d'affichage</h4>
            <input
              type="text"
              className="modal-input"
              placeholder="Ex : Jean Dupont"
              maxLength={50}
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              autoFocus
            />
          </div>

          {/* Changer le mot de passe */}
          <div className="modal-section">
            <h4 className="modal-section-title">Changer le mot de passe</h4>

            <div>
              <label className="modal-label">Mot de passe actuel</label>
              <div className="password-wrap">
                <input
                  type={showCurr ? "text" : "password"}
                  className="modal-input"
                  placeholder="••••••••"
                  value={currentPwd}
                  onChange={e => setCurrentPwd(e.target.value)}
                />
                <button type="button" className="toggle-pwd" onClick={() => setShowCurr(v => !v)}>
                  <EyeIcon />
                </button>
              </div>
            </div>

            <div>
              <label className="modal-label">Nouveau mot de passe</label>
              <div className="password-wrap">
                <input
                  type={showNew ? "text" : "password"}
                  className="modal-input"
                  placeholder="Minimum 8 caractères"
                  value={newPwd}
                  onChange={e => setNewPwd(e.target.value)}
                />
                <button type="button" className="toggle-pwd" onClick={() => setShowNew(v => !v)}>
                  <EyeIcon />
                </button>
              </div>
            </div>

            <div>
              <label className="modal-label">Confirmer le nouveau mot de passe</label>
              <div className="password-wrap">
                <input
                  type={showConf ? "text" : "password"}
                  className="modal-input"
                  placeholder="Répétez le nouveau mot de passe"
                  value={confirmPwd}
                  onChange={e => setConfirmPwd(e.target.value)}
                />
                <button type="button" className="toggle-pwd" onClick={() => setShowConf(v => !v)}>
                  <EyeIcon />
                </button>
              </div>
            </div>
          </div>

          {error && <div className="form-alert">{error}</div>}

          <div className="modal-actions">
            <button className="btn-modal-cancel" onClick={onClose}>Annuler</button>
            <button className="btn-modal-save" onClick={handleSave} disabled={loading}>
              {loading ? (
                <span className="btn-spinner" style={{display:"flex"}}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{width:16,height:16,animation:"spin 0.8s linear infinite"}}>
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/>
                  </svg>
                </span>
              ) : "Enregistrer"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:18,height:18}}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}
