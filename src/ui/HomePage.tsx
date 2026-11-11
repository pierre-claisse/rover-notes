import { Link } from "react-router-dom";
import type { Slot } from "../domain/curriculumDocument";
import { minutesEntered } from "../domain/schemas";
import { formatFrenchDate, parisWeekday } from "../domain/time";
import { enteredTimeCopy, paceFigure, sameDayName } from "./atelier";
import { TimeMeter } from "./Meter";
import { ThroughLines } from "./pedagogy";
import { splitLeadingDuration, slotTasks } from "./present";
import { SlotList } from "./slots";
import { todayHeadline } from "./today";
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
  const todaySlot = slots?.find((slot) => sameDayName(slot.c, weekday)) ?? null;
  const sourceMonday = detailed && "sourceMondayDate" in week.scheduleNotes ? week.scheduleNotes.sourceMondayDate : null;
  const coach = snap.curriculum.homeCoach;
  const onCoachWeek = week.id === coach.activeWeekId;
  return (
    <article className="page home">
      <header className="today-hero">
        <h1>{todayHeadline(weekday, todaySlot?.d ?? null)}</h1>
        {todaySlot ? <p className="today-slot">{slotTeaser(todaySlot)}</p> : null}
        {sunday ? (
          <p className="today-note">
            Aujourd’hui, le bilan du write-up.{" "}
            <Link to={`/semaine/${week.id}`} state={{ scrollTo: "bilan" }}>
              Ouvrir le bilan
            </Link>
          </p>
        ) : null}
        <p className="actions">
          <Link className="button" to={`/semaine/${week.id}`}>
            Ouvrir l’atelier de la semaine
          </Link>
        </p>
      </header>
      <section className="week-panel" aria-labelledby="semaine-titre">
        <p className="meta">
          S{week.weekNumber} · {week.phase} · {hours} h
        </p>
        <h2 id="semaine-titre">{week.title}</h2>
        {week.proofs.length > 0 ? (
          <p className="due">
            <strong>À rendre : </strong>
            {week.proofs.join(" · ")}
          </p>
        ) : null}
        <section className="progress-block" aria-label="Temps saisi">
          <p className="pace">{paceFigure(minutes, hours)}</p>
          <p className="progress-copy">{enteredTimeCopy(minutes, hours)}</p>
          <TimeMeter minutes={minutes} hours={hours} label="Temps saisi cette semaine" />
        </section>
        <Link className="quiet-link" to={`/semaine/${week.id}`} state={{ scrollTo: "seance" }}>
          Noter une séance
        </Link>
      </section>
      <section>
        <h2>À lire, à faire</h2>
        {slots ? (
          <>
            {!todaySlot && !sunday ? <p>Le livrable et le plan de la semaine restent le repère.</p> : null}
            <SlotList slots={slots} weekday={weekday} />
          </>
        ) : (
          <p>Bloc indicatif, à détailler. Pas de créneaux inventés pour cette semaine.</p>
        )}
      </section>
      <details className="fold">
        <summary>Pourquoi cette semaine</summary>
        {onCoachWeek ? (
          <>
            <p className="meta">{coach.eyebrow}</p>
            <p className="theme">{coach.title}</p>
            <p>{coach.body}</p>
            <p>{coach.throughLine}</p>
            <p>{coach.constraint}</p>
            <p>{coach.nextAction}</p>
          </>
        ) : (
          <p>{week.title}</p>
        )}
        <p>{coach.honestCalendar}</p>
        <ThroughLines lines={snap.curriculum.throughLines} />
      </details>
      <details className="tracking fold">
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

function slotTeaser(slot: Slot): string {
  const tasks = slotTasks(slot.contenu);
  const first = tasks.read[0] ?? tasks.do[0] ?? slot.contenu;
  return splitLeadingDuration(first).text;
}
