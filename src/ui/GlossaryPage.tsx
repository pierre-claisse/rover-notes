import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { useVault } from "./vault";

export function GlossaryPage() {
  const { entryId } = useParams();
  const { snap } = useVault();

  useEffect(() => {
    if (!entryId) return;
    document.getElementById(entryId)?.scrollIntoView({ block: "start" });
  }, [entryId]);

  if (snap.phase !== "ready" || !snap.curriculum) {
    return <p>{snap.phase === "error" ? snap.errorMessage : "Ouverture du coffre…"}</p>;
  }

  return (
    <article>
      <h1>Glossaire</h1>
      <p>Les termes de P0, tels qu’ils servent sur le rover. Le détail des semaines suivantes n’est pas encore écrit.</p>
      {snap.curriculum.glossary.map((entry) => (
        <section key={entry.id} id={entry.id} className={entry.id === entryId ? "callout" : undefined}>
          <h2>{entry.term}</h2>
          <p>{entry.definition}</p>
          <p>{entry.roverLink}</p>
          <p>
            {entry.weekIds.map((weekId, index) => (
              <span key={weekId}>
                {index > 0 ? " · " : null}
                <Link to={`/semaine/${weekId}`}>{weekId}</Link>
              </span>
            ))}
          </p>
        </section>
      ))}
    </article>
  );
}
