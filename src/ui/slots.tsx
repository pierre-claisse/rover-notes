import { Fragment } from "react";
import type { Slot } from "../domain/curriculumDocument";
import { sameDayName } from "./atelier";
import { resourceParts, richPieces, slotTasks, type ResourcePart, type RichPiece } from "./present";

export function SlotList({ slots, weekday }: { slots: Slot[]; weekday: string }) {
  return (
    <ul className="slots">
      {slots.map((slot) => {
        const today = sameDayName(slot.c, weekday);
        const tasks = slotTasks(slot.contenu);
        return (
          <li key={slot.c} className={today ? "slot-today" : undefined} aria-current={today ? "date" : undefined}>
            <p className="slot-when">
              <strong>
                {slot.c} · {slot.d}
              </strong>
              {today ? <span className="pill pill-today">Aujourd’hui</span> : null}
            </p>
            <TaskList title="À regarder ou lire" items={tasks.read} context={slot.contenu} />
            <TaskList title="À faire" items={tasks.do} context={slot.contenu} />
            <Resource value={slot.res} context={slot.contenu} />
          </li>
        );
      })}
    </ul>
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
