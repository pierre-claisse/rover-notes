import { Link } from "react-router-dom";
import type { PhaseDocument, WeekDocument } from "../domain/curriculumDocument";
import type { Journal } from "../domain/schemas";
import { minutesForWeeks, phaseTimeCopy } from "./atelier";
import { followAnchor } from "./anchor";
import { TimeMeter } from "./Meter";
import { ThroughLines } from "./pedagogy";
import { useVault } from "./vault";

export function ProgramPage() {
  const { session, snap } = useVault();

  if (snap.phase !== "ready" || !snap.curriculum || !snap.manifest || !snap.journal) {
    return <p>{snap.phase === "error" ? snap.errorMessage : "Ouverture du coffre…"}</p>;
  }
  const curriculum = snap.curriculum;
  const activeId = snap.manifest.activeWeekId;
  const journal = snap.journal;
  return (
    <article className="page">
      <h1 className="display">Programme</h1>
      <CurrentWeekPin activeId={activeId} weeks={curriculum.weeks} hours={curriculum.context.hoursPerWeek} />
      <ul className="key-figures">
        <li>
          <strong>94</strong>
          <span>semaines</span>
        </li>
        <li>
          <strong>~846 h</strong>
          <span>au rythme prévu</span>
        </li>
        <li>
          <strong>~22 mois</strong>
          <span>à 9 h/sem</span>
        </li>
      </ul>
      <details className="fold">
        <summary>Pourquoi 22 mois ?</summary>
        <p>{curriculum.inconsistency.summary}</p>
        <p>
          S1 à S9 sont détaillées. S10 à S94 restent des blocs indicatifs. 94 semaines × 9 h, environ 22 mois (846 h) : on ne compacte pas le syllabus pour coller à 18 mois. Aucune date n’est inventée pour S10–S94.
        </p>
      </details>
      <ThroughLines lines={curriculum.throughLines} />
      <details className="week-switch">
        <summary>Changer la semaine en cours</summary>
        <label htmlFor="active-week">Semaine en cours</label>
        <select id="active-week" value={activeId} onChange={(event) => void session.setActiveWeek(event.target.value)}>
          {curriculum.phases.map((phase) => (
            <optgroup key={phase.id} label={`${phase.id} — ${phase.nom}`}>
              {curriculum.weeks
                .filter((week) => week.phase === phase.id)
                .map((week) => (
                  <option key={week.id} value={week.id}>
                    {weekOptionLabel(week)}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
      </details>
      {curriculum.phases.map((phase) => (
        <PhaseChapter
          key={phase.id}
          phase={phase}
          weeks={curriculum.weeks.filter((week) => week.phase === phase.id)}
          activeId={activeId}
          journal={journal}
          handedIn={(weekId) => snap.weeks[weekId]?.state === "handed_in"}
        />
      ))}
    </article>
  );
}

function weekOptionLabel(week: WeekDocument): string {
  switch (week.detailLevel) {
    case "source-detailed":
      return `S${week.weekNumber} — ${week.title}`;
    case "indicative-block-only":
      return `S${week.weekNumber}`;
    default: {
      const neverLevel: never = week.detailLevel;
      return neverLevel;
    }
  }
}

function CurrentWeekPin({ activeId, weeks, hours }: { activeId: string; weeks: WeekDocument[]; hours: number }) {
  const week = weeks.find((item) => item.id === activeId);
  if (!week) return null;
  const label = `S${week.weekNumber}`;
  return (
    <section className="pin" aria-labelledby="semaine-courante-titre">
      <p className="meta">
        {label} · {week.phase} · {hours} h
      </p>
      <h2 id="semaine-courante-titre">Semaine en cours : {label}</h2>
      <a href="#semaine-en-cours" onClick={(event) => followAnchor(event, "semaine-en-cours")}>
        Aller à {label}
      </a>
    </section>
  );
}

function PhaseChapter({
  phase,
  weeks,
  activeId,
  journal,
  handedIn,
}: {
  phase: PhaseDocument;
  weeks: WeekDocument[];
  activeId: string;
  journal: Journal;
  handedIn: (weekId: string) => boolean;
}) {
  const minutes = minutesForWeeks(journal, new Set(weeks.map((week) => week.id)));
  return (
    <section className="chapter">
      <header className="chapter-head">
        <h2>
          {phase.id} — {phase.nom}
        </h2>
        <p>
          {phase.mois} · {phase.heures} h estimées.
        </p>
        <p>{phase.narrative.promise}</p>
        <p className="task-kind">Matériel</p>
        <p>{phase.narrative.hardwareNote}</p>
        <p className="task-kind">Fil conducteur</p>
        <p>{phase.narrative.throughLine}</p>
        <p className="task-kind">Portfolio</p>
        <p>{phase.narrative.portfolioNote}</p>
        <p className="task-kind">Point de vigilance</p>
        <p>{phase.narrative.commonPitfall}</p>
        <h3>Critères de sortie</h3>
        <ul>
          {phase.narrative.exitCriteria.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="progress-copy">{phaseTimeCopy(minutes, phase.heures)}</p>
        <TimeMeter minutes={minutes} hours={phase.heures} label={`Temps saisi pour ${phase.id}`} />
        <p>{phase.livrable}</p>
        <p className="muted">Terminé quand : {phase.done}</p>
      </header>
      <PhaseWeeks phase={phase} weeks={weeks} activeId={activeId} handedIn={handedIn} />
    </section>
  );
}

function PhaseWeeks({
  phase,
  weeks,
  activeId,
  handedIn,
}: {
  phase: PhaseDocument;
  weeks: WeekDocument[];
  activeId: string;
  handedIn: (weekId: string) => boolean;
}) {
  if (phase.blocks.length === 0) {
    return (
      <ul className="week-cards">
        {weeks.map((week) => (
          <li key={week.id} id={week.id === activeId ? "semaine-en-cours" : undefined}
            tabIndex={week.id === activeId ? -1 : undefined} className={week.id === activeId ? "week-card is-current" : "week-card"}>
            <WeekLink week={week} active={week.id === activeId} handed={handedIn(week.id)} />
          </li>
        ))}
      </ul>
    );
  }
  const used = new Set<string>();
  const groups = phase.blocks.map((block) => {
    const members = weeks.filter((week) => week.weekNumber >= block.fromWeek && week.weekNumber <= block.toWeek);
    for (const week of members) used.add(week.id);
    return { block, members };
  });
  const rest = weeks.filter((week) => !used.has(week.id));
  return (
    <>
      <ul className="block-list">
        {groups.map(({ block, members }) => (
          <li key={block.sourceText} className="block-card">
            <p className="block-title">
              {block.sourceText}
              <span className="pill">indicative</span>
            </p>
            <p>{block.briefing.whyThisBlock}</p>
            <p className="task-kind">Matériel</p>
            <p>{block.briefing.hardwareNote}</p>
            <ul className="week-links">
              {members.map((week) => (
                <li key={week.id} id={week.id === activeId ? "semaine-en-cours" : undefined}
            tabIndex={week.id === activeId ? -1 : undefined} className={week.id === activeId ? "is-current" : undefined}>
                  <Link to={`/semaine/${week.id}`}>S{week.weekNumber}</Link>
                  {week.id === activeId ? <CurrentPill /> : null}
                  {handedIn(week.id) ? <HandedPill /> : null}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
      {rest.length > 0 ? (
        <ul className="week-cards">
          {rest.map((week) => (
            <li key={week.id} id={week.id === activeId ? "semaine-en-cours" : undefined}
            tabIndex={week.id === activeId ? -1 : undefined} className={week.id === activeId ? "week-card is-current" : "week-card"}>
              <WeekLink week={week} active={week.id === activeId} handed={handedIn(week.id)} />
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}

function WeekLink({ week, active, handed }: { week: WeekDocument; active: boolean; handed: boolean }) {
  return (
    <Link className="week-card-link" to={`/semaine/${week.id}`}>
      <span className="meta">S{week.weekNumber}</span>
      <WeekTitle week={week} />
      <span className="week-flags">
        {active ? <CurrentPill /> : null}
        {handed ? <HandedPill /> : null}
      </span>
    </Link>
  );
}

function WeekTitle({ week }: { week: WeekDocument }) {
  switch (week.detailLevel) {
    case "source-detailed":
      return <span className="week-name">{week.title}</span>;
    case "indicative-block-only":
      return <span className="pill">indicative</span>;
    default: {
      const neverLevel: never = week.detailLevel;
      return neverLevel;
    }
  }
}

function CurrentPill() {
  return <span className="pill pill-current">en cours</span>;
}

function HandedPill() {
  return <span className="pill pill-done">write-up remis</span>;
}
