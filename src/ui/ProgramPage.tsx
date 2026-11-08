import { Link } from "react-router-dom";
import { useVault } from "./vault";

export function ProgramPage() {
  const { session, snap } = useVault();
  if (snap.phase !== "ready" || !snap.curriculum || !snap.manifest) {
    return <p>{snap.phase === "error" ? snap.errorMessage : "Ouverture du coffre…"}</p>;
  }
  const curriculum = snap.curriculum;
  const manifest = snap.manifest;
  return (
    <article>
      <h1>Programme</h1>
      <p className="callout">{snap.curriculum.inconsistency.summary}</p>
      <p>S1 à S9 sont détaillées. S10 à S94 restent des blocs indicatifs, pas un planning de 18 mois daté.</p>
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
          {phase.blocks.length > 0 ? (
            <ul>
              {phase.blocks.map((block) => (
                <li key={block.sourceText}>
                  Bloc indicatif, à détailler — {block.sourceText}
                </li>
              ))}
            </ul>
          ) : null}
          <ul>
            {curriculum.weeks
              .filter((week) => week.phase === phase.id)
              .map((week) => (
                <li key={week.id}>
                  <Link to={`/semaine/${week.id}`}>
                    S{week.weekNumber} — {week.title}
                  </Link>
                  {week.detailLevel === "source-detailed" ? " · détaillée" : " · bloc indicatif"}
                  {manifest.activeWeekId === week.id ? (
                    " · en cours"
                  ) : (
                    <button type="button" onClick={() => void session.setActiveWeek(week.id)}>
                      Définir comme semaine en cours
                    </button>
                  )}
                </li>
              ))}
          </ul>
        </section>
      ))}
    </article>
  );
}
