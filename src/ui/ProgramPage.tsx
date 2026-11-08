import { Link } from "react-router-dom";
import type { PhaseDocument, WeekDocument } from "../domain/curriculumDocument";
import { useVault } from "./vault";

export function ProgramPage() {
  const { session, snap } = useVault();
  if (snap.phase !== "ready" || !snap.curriculum || !snap.manifest) {
    return <p>{snap.phase === "error" ? snap.errorMessage : "Ouverture du coffre…"}</p>;
  }
  const curriculum = snap.curriculum;
  const activeId = snap.manifest.activeWeekId;
  return (
    <article>
      <h1>Programme</h1>
      <p className="callout">{curriculum.inconsistency.summary}</p>
      <p>
        S1 à S9 sont détaillées. S10 à S94 restent des blocs indicatifs. 94 semaines × 9 h, environ 22 mois (846 h) : on ne compacte pas le syllabus pour coller à 18 mois. Aucune date n’est inventée pour S10–S94.
      </p>
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
        <section key={phase.id}>
          <h2>
            {phase.id} — {phase.nom}
          </h2>
          <p>
            {phase.mois} · {phase.heures} h estimées.
          </p>
          <p>{phase.livrable}</p>
          <p>Terminé quand : {phase.done}</p>
          <PhaseWeeks phase={phase} weeks={curriculum.weeks.filter((week) => week.phase === phase.id)} activeId={activeId} />
        </section>
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

function PhaseWeeks({ phase, weeks, activeId }: { phase: PhaseDocument; weeks: WeekDocument[]; activeId: string }) {
  if (phase.blocks.length === 0) {
    return (
      <ul className="week-list">
        {weeks.map((week) => (
          <li key={week.id}>
            <WeekLink week={week} />
            <DetailPill week={week} />
            {week.id === activeId ? <CurrentPill /> : null}
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
          <li key={block.sourceText}>
            <p className="block-title">
              {block.sourceText}
              <span className="pill">bloc indicatif</span>
            </p>
            <ul className="week-links">
              {members.map((week) => (
                <li key={week.id}>
                  <Link to={`/semaine/${week.id}`}>S{week.weekNumber}</Link>
                  {week.id === activeId ? <CurrentPill /> : null}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
      {rest.length > 0 ? (
        <ul className="week-list">
          {rest.map((week) => (
            <li key={week.id}>
              <WeekLink week={week} />
              <DetailPill week={week} />
              {week.id === activeId ? <CurrentPill /> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}

function WeekLink({ week }: { week: WeekDocument }) {
  return (
    <Link to={`/semaine/${week.id}`}>
      S{week.weekNumber} — {week.title}
    </Link>
  );
}

function DetailPill({ week }: { week: WeekDocument }) {
  return <span className="pill">{detailLabel(week.detailLevel)}</span>;
}

function detailLabel(level: WeekDocument["detailLevel"]): string {
  switch (level) {
    case "source-detailed":
      return "détaillée";
    case "indicative-block-only":
      return "bloc indicatif";
    default: {
      const neverLevel: never = level;
      return neverLevel;
    }
  }
}

function CurrentPill() {
  return <span className="pill pill-current">en cours</span>;
}
