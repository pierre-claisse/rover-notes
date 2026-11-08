import { Link } from "react-router-dom";
import { minutesEntered } from "../domain/schemas";
import { formatFrenchDate } from "../domain/time";
import { useVault } from "./vault";

export function HomePage() {
  const { snap } = useVault();
  if (snap.phase === "loading") return <p>Ouverture du coffre…</p>;
  if (snap.phase === "error" || !snap.curriculum || !snap.manifest || !snap.journal) {
    return <p role="alert">{snap.errorMessage ?? "Coffre indisponible."}</p>;
  }
  const week = snap.curriculum.weeks.find((item) => item.id === snap.manifest?.activeWeekId);
  if (!week) return <p role="alert">Semaine en cours introuvable dans le programme.</p>;
  const minutes = minutesEntered(snap.journal, week.id);
  const detailed = week.detailLevel === "source-detailed";
  return (
    <article>
      <h1>Maintenant : S{week.weekNumber}</h1>
      <p className="lead">{week.title}</p>
      <p>
        Point de départ : {snap.curriculum.context.completedHours} h au {formatFrenchDate(snap.curriculum.context.asOf)}. Environ{" "}
        {snap.curriculum.context.hoursPerWeek} h par semaine. Robot {snap.manifest.robotPurchased ? "acheté" : "non acheté"}.
      </p>
      <p>Temps saisi : {minutes} min. Le temps affiché est uniquement celui des séances enregistrées.</p>
      {detailed && "sourceMondayDate" in week.scheduleNotes ? (
        <p>Repère source : lundi {week.scheduleNotes.sourceMondayDate}. Ce n’est pas un retard ni un avancement automatique.</p>
      ) : null}
      <section>
        <h2>À lire, à faire, à rendre</h2>
        {detailed && "slots" in week.scheduleNotes ? (
          <ul className="slots">
            {week.scheduleNotes.slots.map((slot) => (
              <li key={slot.c}>
                <strong>
                  {slot.c} · {slot.d}
                </strong>
                <span>{slot.contenu}</span>
                <Resource value={slot.res} />
              </li>
            ))}
          </ul>
        ) : (
          <p>Bloc indicatif, à détailler. Pas de créneaux inventés pour cette semaine.</p>
        )}
        {week.proofs.length > 0 ? (
          <p>
            <strong>À rendre : </strong>
            {week.proofs.join(" · ")}
          </p>
        ) : null}
      </section>
      <p>
        <Link className="button" to={`/semaine/${week.id}`}>
          Reprendre le brouillon
        </Link>
      </p>
      {!snap.draftsPersistent ? (
        <p>Brouillon en mémoire seulement : un rechargement avant l’enregistrement l’efface. La clé n’est pas stockée.</p>
      ) : (
        <p>Un brouillon chiffré est conservé sur cet appareil, sans la clé.</p>
      )}
      <section className="callout">
        <h2>Calendrier</h2>
        <p>{snap.curriculum.inconsistency.summary}</p>
        <ul>
          {snap.curriculum.gaps.map((gap) => (
            <li key={gap}>{gap}</li>
          ))}
        </ul>
      </section>
    </article>
  );
}

function Resource({ value }: { value: string }) {
  if (/^https?:\/\//.test(value)) {
    return (
      <a href={value} rel="noreferrer noopener" target="_blank">
        {value}
      </a>
    );
  }
  return <span>{value}</span>;
}
