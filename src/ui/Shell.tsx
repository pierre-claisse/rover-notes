import { useEffect } from "react";
import { Link, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { saveLabel } from "./status";
import { useVault } from "./vault";

export function Shell() {
  const auth = useAuth();
  const { snap } = useVault();

  useEffect(() => {
    const onLeave = (event: BeforeUnloadEvent) => {
      if (snap.saveStatus === "dirty" || snap.saveStatus === "offline" || snap.saveStatus === "conflict") {
        event.preventDefault();
      }
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [snap.saveStatus]);

  return (
    <div className="app">
      <header className="top">
        <p className="brand">rover-notes</p>
        <nav aria-label="Navigation">
          <Link to="/">Accueil</Link>
          <Link to="/programme">Programme</Link>
          <Link to="/journal">Journal</Link>
          <button type="button" onClick={() => void auth.lock()}>
            Verrouiller
          </button>
        </nav>
        <p className="save-status" role="status" aria-live="polite">
          {snap.phase === "ready" ? saveLabel(snap.saveStatus) : snap.phase === "loading" ? "Ouverture du coffre…" : "Coffre non ouvert"}
          {snap.saveDetail ? ` — ${snap.saveDetail}` : ""}
        </p>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
