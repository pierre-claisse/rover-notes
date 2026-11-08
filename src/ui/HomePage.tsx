import { Link } from "react-router-dom";
import { minutesEntered } from "../domain/schemas";
import { formatFrenchDate, parisWeekday } from "../domain/time";
import { enteredTimeCopy, sameDayName } from "./atelier";
import { TimeMeter } from "./Meter";
import { SlotList } from "./slots";
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
  const hours = snap.curriculum.context.hoursPerWeek;
  const detailed = week.detailLevel === "source-detailed";
  const slots = detailed && "slots" in week.scheduleNotes ? week.scheduleNotes.slots : null;
  const weekday = parisWeekday(new Date()).toLocaleLowerCase("fr-FR");
  const sunday = sameDayName(weekday, "dimanche");
  const todaySlot = slots?.some((slot) => sameDayName(slot.c, weekday)) ?? false;
  const sourceMonday = detailed && "sourceMondayDate" in week.scheduleNotes ? week.scheduleNotes.sourceMondayDate : null;
  return (
    <article>
      <h1>Maintenant : S{week.weekNumber}</h1>
      <p className="lead">{week.title}</p>
      {week.proofs.length > 0 ? (
        <p className="due">
          <strong>À rendre : </strong>
          {week.proofs.join(" · ")}
        </p>
      ) : null}
      <section className="progress-block" aria-label="Temps saisi">
        <p className="progress-copy">{enteredTimeCopy(minutes, hours)}</p>
        <TimeMeter minutes={minutes} hours={hours} label="Temps saisi cette semaine" />
      </section>
      {sunday ? (
        <p className="today-note">
          Aujourd’hui, le bilan du write-up.{" "}
          <Link to={`/semaine/${week.id}`} state={{ scrollTo: "bilan" }}>
            Ouvrir le bilan
          </Link>
        </p>
      ) : null}
      <section>
        <h2>À lire, à faire</h2>
        {slots ? (
          <>
            {!todaySlot && !sunday ? (
              <p>Pas de créneau ce {weekday}. Le livrable et le plan de la semaine restent le repère.</p>
            ) : null}
            <SlotList slots={slots} weekday={weekday} />
          </>
        ) : (
          <p>Bloc indicatif, à détailler. Pas de créneaux inventés pour cette semaine.</p>
        )}
      </section>
      <p className="actions">
        <Link className="button" to={`/semaine/${week.id}`}>
          Ouvrir l’atelier de la semaine
        </Link>
        <Link className="button button-quiet" to={`/semaine/${week.id}`} state={{ scrollTo: "seance" }}>
          Noter une séance
        </Link>
      </p>
      <details className="tracking">
        <summary>Détails du suivi</summary>
        <p>
          Point de départ : {snap.curriculum.context.completedHours} h au {formatFrenchDate(snap.curriculum.context.asOf)}. Environ{" "}
          {snap.curriculum.context.hoursPerWeek} h par semaine. Robot {snap.manifest.robotPurchased ? "acheté" : "non acheté"}.
        </p>
        <p>Temps saisi : {minutes} min. Le temps affiché est uniquement celui des séances enregistrées.</p>
        {sourceMonday ? <p>Repère source : lundi {sourceMonday}. Ce n’est pas un retard ni un avancement automatique.</p> : null}
      </details>
      {!snap.draftsPersistent ? (
        <p>Brouillon en mémoire seulement : un rechargement avant l’enregistrement l’efface. La clé n’est pas stockée.</p>
      ) : (
        <p>Un brouillon de vos saisies reste sur cet appareil, chiffré. La clé qui permet de le lire n’est pas enregistrée avec lui.</p>
      )}
    </article>
  );
}
