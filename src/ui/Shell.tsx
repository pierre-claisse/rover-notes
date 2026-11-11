import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { SkipLink } from "./anchor";
import { DesktopNav, MobileNav, persistRail, readRail, SecondaryMenu, useNarrow } from "./navigation";
import { saveLabel } from "./status";
import { useVault } from "./vault";

export function Shell() {
  const { snap } = useVault();
  const narrow = useNarrow();
  const [rail, setRail] = useState(readRail);

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
    <div className={rail && !narrow ? "app is-rail" : "app"}>
      <SkipLink />
      {narrow ? <MobileNav /> : (
        <DesktopNav
          rail={rail}
          onToggle={() => {
            const next = !rail;
            setRail(next);
            persistRail(next);
          }}
        />
      )}
      <div className="workspace">
        <header className="top">
          {narrow ? (
            <>
              <p className="brand">rover-notes</p>
              <SecondaryMenu />
            </>
          ) : null}
          <p className="save-status" role="status" aria-live="polite">
            {snap.phase === "ready" ? (
              <span className="pill">{saveLabel(snap.saveStatus)}</span>
            ) : snap.phase === "loading" ? (
              "Ouverture du coffre…"
            ) : (
              "Coffre non ouvert"
            )}
            {snap.saveDetail ? ` — ${snap.saveDetail}` : ""}
          </p>
        </header>
        <main id="contenu" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
