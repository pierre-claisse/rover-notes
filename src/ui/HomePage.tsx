import { Fragment } from "react";
import { Link } from "react-router-dom";
import { minutesEntered } from "../domain/schemas";
import { formatFrenchDate } from "../domain/time";
import { resourceParts, richPieces, slotTasks, type ResourcePart, type RichPiece } from "./present";
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
      <details className="tracking">
        <summary>Détails du suivi</summary>
        <p>
          Point de départ : {snap.curriculum.context.completedHours} h au {formatFrenchDate(snap.curriculum.context.asOf)}. Environ{" "}
          {snap.curriculum.context.hoursPerWeek} h par semaine. Robot {snap.manifest.robotPurchased ? "acheté" : "non acheté"}.
        </p>
        <p>Temps saisi : {minutes} min. Le temps affiché est uniquement celui des séances enregistrées.</p>
        {sourceMonday ? <p>Repère source : lundi {sourceMonday}. Ce n’est pas un retard ni un avancement automatique.</p> : null}
      </details>
      <section>
        <h2>À lire, à faire</h2>
        {detailed && "slots" in week.scheduleNotes ? (
          <ul className="slots">
            {week.scheduleNotes.slots.map((slot) => {
              const tasks = slotTasks(slot.contenu);
              return (
                <li key={slot.c}>
                  <strong>
                    {slot.c} · {slot.d}
                  </strong>
                  <TaskList title="À regarder ou lire" items={tasks.read} context={slot.contenu} />
                  <TaskList title="À faire" items={tasks.do} context={slot.contenu} />
                  <Resource value={slot.res} context={slot.contenu} />
                </li>
              );
            })}
          </ul>
        ) : (
          <p>Bloc indicatif, à détailler. Pas de créneaux inventés pour cette semaine.</p>
        )}
      </section>
      <p>
        <Link className="button" to={`/semaine/${week.id}`}>
          Reprendre le brouillon
        </Link>
      </p>
      {!snap.draftsPersistent ? (
        <p>Brouillon en mémoire seulement : un rechargement avant l’enregistrement l’efface. La clé n’est pas stockée.</p>
      ) : (
        <p>Un brouillon de vos saisies reste sur cet appareil, chiffré. La clé qui permet de le lire n’est pas enregistrée avec lui.</p>
      )}
    </article>
  );
}

function TaskList({ title, items, context }: { title: string; items: string[]; context: string }) {
  if (items.length === 0) return null;
  return (
    <>
      <p className="task-kind">{title}</p>
      <ul className="task-list">
        {items.map((item, index) => (
          <li key={`${title}-${index}`}>
            <RichText text={item} context={context} />
          </li>
        ))}
      </ul>
    </>
  );
}

function Resource({ value, context }: { value: string; context: string }) {
  const parts = resourceParts(value, context);
  return (
    <span className="resource">
      {parts.map((part, index) => (
        <Fragment key={`${part.kind}-${index}`}>
          {index > 0 ? <span className="sep"> · </span> : null}
          <ResourcePartView part={part} />
        </Fragment>
      ))}
    </span>
  );
}

function ResourcePartView({ part }: { part: ResourcePart }) {
  switch (part.kind) {
    case "link":
      return (
        <a href={part.href} rel="noreferrer noopener" target="_blank">
          {part.label}
        </a>
      );
    case "text":
      return <span>{part.text}</span>;
    default: {
      const neverPart: never = part;
      return neverPart;
    }
  }
}

function RichText({ text, context }: { text: string; context: string }) {
  return (
    <>
      {richPieces(text, context).map((piece, index) => (
        <RichPieceView key={index} piece={piece} />
      ))}
    </>
  );
}

function RichPieceView({ piece }: { piece: RichPiece }) {
  switch (piece.kind) {
    case "text":
      return <span>{piece.text}</span>;
    case "code":
      return <code className="keep">{piece.text}</code>;
    case "link":
      return (
        <a href={piece.href} rel="noreferrer noopener" target="_blank">
          {piece.label}
        </a>
      );
    default: {
      const neverPiece: never = piece;
      return neverPiece;
    }
  }
}
