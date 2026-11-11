import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { SkipLink } from "./anchor";
import { Icon } from "./icons";
import { DesktopNav, MobileLock, MobileNav, persistRail, readRail, useNarrow } from "./navigation";
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
        {narrow ? (
          <header className="top">
            <p className="brand">rover-notes</p>
            <MobileLock />
          </header>
        ) : null}
        <main id="contenu" tabIndex={-1}>
          <p className={snap.saveStatus === "saved" ? "save-status is-saved" : "save-status"} role="status" aria-live="polite">
            {snap.phase === "ready" ? (
              <>
                {snap.saveStatus === "saved" ? <Icon name="check" /> : null}
                <span>{saveLabel(snap.saveStatus)}</span>
              </>
            ) : snap.phase === "loading" ? (
              "Ouverture du coffre…"
            ) : (
              "Coffre non ouvert"
            )}
            {snap.saveDetail ? ` — ${snap.saveDetail}` : ""}
          </p>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
