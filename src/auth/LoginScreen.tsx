import { useState, type FormEvent } from "react";
import { SkipLink } from "../ui/anchor";
import { Icon } from "../ui/icons";
import { useAuth } from "./AuthProvider";

const MISSING =
  "Configuration manquante. Le déploiement doit fournir SYNC_PAT, SYNC_PASSWORD, SYNC_USERNAME et SYNC_DATA_KEY. Aucun accès sans ce bundle, et aucun mot de passe par défaut.";
const INVALID = "Configuration refusée. Les paramètres d’amorçage sont invalides ou hors limites.";

export function LoginScreen() {
  const auth = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  if (auth.configIssue) {
    return (
      <>
        <SkipLink />
        <main id="contenu" className="gate" tabIndex={-1}>
        <section className="gate-card">
          <h1>{auth.configIssue === "missing" ? "Configuration manquante" : "Configuration refusée"}</h1>
          <p>{auth.configIssue === "missing" ? MISSING : INVALID}</p>
        </section>
        </main>
      </>
    );
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const typed = password;
    setPassword("");
    await auth.unlock(username, typed);
  }

  const busy = auth.status === "unlocking";
  return (
    <>
      <SkipLink />
      <main id="contenu" className="gate" tabIndex={-1}>
      <form className="gate-card" onSubmit={onSubmit}>
        <h1 className="display">rover-notes</h1>
        <p>Identifiez-vous pour ouvrir le coffre.</p>
        <label htmlFor="username">Identifiant</label>
        <input
          id="username"
          name="username"
          autoComplete="username"
          spellCheck={false}
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          required
          disabled={busy}
        />
        <label htmlFor="password">Mot de passe</label>
        <div className="password-field">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            disabled={busy}
          />
          <button
            type="button"
            className="reveal"
            aria-controls="password"
            aria-pressed={showPassword}
            onClick={() => setShowPassword((value) => !value)}
            disabled={busy}
          >
            <Icon name={showPassword ? "eye-off" : "eye"} />
            {showPassword ? "Masquer" : "Afficher"}
          </button>
        </div>
        {auth.loginError ? (
          <p role="alert">{auth.loginError}</p>
        ) : null}
        <button className="wide" type="submit" disabled={busy}>
          {busy ? "Déverrouillage…" : "Déverrouiller"}
        </button>
      </form>
      </main>
    </>
  );
}
