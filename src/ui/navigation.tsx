import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { Icon, type IconName } from "./icons";
import { useVault } from "./vault";

const SIDEBAR_KEY = "rover-notes.sidebar";
const NARROW_QUERY = "(max-width: 799px)";

const ITEMS: ReadonlyArray<{ to: string; end: boolean; label: string; icon: IconName }> = [
  { to: "/", end: true, label: "Accueil", icon: "home" },
  { to: "/programme", end: false, label: "Programme", icon: "program" },
  { to: "/glossaire", end: false, label: "Glossaire", icon: "glossary" },
  { to: "/journal", end: false, label: "Journal", icon: "journal" },
];

export function readRail(): boolean {
  try {
    return window.localStorage.getItem(SIDEBAR_KEY) === "rail";
  } catch {
    return false;
  }
}

export function persistRail(rail: boolean): void {
  try {
    if (rail) window.localStorage.setItem(SIDEBAR_KEY, "rail");
    else window.localStorage.removeItem(SIDEBAR_KEY);
  } catch {
    /* préférence d’interface indisponible */
  }
}

export function useNarrow(): boolean {
  const [narrow, setNarrow] = useState(() => matchesNarrow());
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const media = window.matchMedia(NARROW_QUERY);
    const apply = () => setNarrow(media.matches);
    apply();
    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", apply);
      return () => media.removeEventListener("change", apply);
    }
    media.addListener(apply);
    return () => media.removeListener(apply);
  }, []);
  return narrow;
}

export function DesktopNav({ rail, onToggle }: { rail: boolean; onToggle: () => void }) {
  const auth = useAuth();
  const toggleLabel = rail ? "Déplier la navigation" : "Replier la navigation";
  return (
    <aside className="sidebar">
      <p className="brand">
        <span className="brand-mark" aria-hidden="true">
          rn
        </span>
        <span className="nav-label">rover-notes</span>
      </p>
      <button
        type="button"
        className="text-button nav-toggle"
        aria-expanded={!rail}
        aria-controls="navigation-principale"
        data-tooltip={toggleLabel}
        title={rail ? toggleLabel : undefined}
        onClick={onToggle}
      >
        <Icon name={rail ? "expand" : "collapse"} />
        <span className="nav-label">
          {rail ? "Déplier" : "Replier"}
          <span className="sr-only"> la navigation</span>
        </span>
      </button>
      <nav id="navigation-principale" aria-label="Navigation">
        {ITEMS.map((item) => (
          <NavItem key={item.to} to={item.to} end={item.end} label={item.label} icon={item.icon} rail={rail} />
        ))}
        <CurrentWeekLink rail={rail} />
      </nav>
      <div className="sidebar-foot">
        <button
          type="button"
          className="text-button lock-button"
          data-tooltip="Verrouiller"
          title={rail ? "Verrouiller" : undefined}
          onClick={() => void auth.lock()}
        >
          <Icon name="lock" />
          <span className="nav-label">Verrouiller</span>
        </button>
      </div>
    </aside>
  );
}

export function MobileNav() {
  return (
    <nav className="tabbar" aria-label="Navigation">
      {ITEMS.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.end}>
          <Icon name={item.icon} />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export function SecondaryMenu() {
  const auth = useAuth();
  const [open, setOpen] = useState(false);
  return (
    <div className="menu-anchor">
      <button
        type="button"
        className="text-button menu-button"
        aria-expanded={open}
        aria-controls="menu-secondaire"
        onClick={() => setOpen((value) => !value)}
      >
        Menu
      </button>
      {open ? (
        <div
          id="menu-secondaire"
          className="secondary-menu"
          role="group"
          aria-label="Menu secondaire"
          onKeyDown={(event) => {
            if (event.key !== "Escape") return;
            setOpen(false);
          }}
        >
          <button type="button" className="text-button" onClick={() => void auth.lock()}>
            Verrouiller
          </button>
        </div>
      ) : null}
    </div>
  );
}

function NavItem({ to, end, label, icon, rail }: { to: string; end: boolean; label: string; icon: IconName; rail: boolean }) {
  return (
    <NavLink to={to} end={end} className="nav-link" data-tooltip={label} title={rail ? label : undefined}>
      <Icon name={icon} />
      <span className="nav-label">{label}</span>
    </NavLink>
  );
}

function CurrentWeekLink({ rail }: { rail: boolean }) {
  const { snap } = useVault();
  const week = snap.curriculum?.weeks.find((item) => item.id === snap.manifest?.activeWeekId);
  if (!week) return null;
  const label = `S${week.weekNumber}`;
  const tooltip = `Semaine en cours : ${label}`;
  return (
    <NavLink to={`/semaine/${week.id}`} className="nav-link nav-week" data-tooltip={tooltip} title={rail ? tooltip : undefined}>
      <Icon name="week" />
      <span className="nav-label">
        {label}
        <span className="nav-aside">semaine en cours</span>
      </span>
    </NavLink>
  );
}

function matchesNarrow(): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia(NARROW_QUERY).matches;
}
