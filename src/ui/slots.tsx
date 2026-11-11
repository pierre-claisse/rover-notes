import { Fragment } from "react";
import type { Slot } from "../domain/curriculumDocument";
import { sameDayName } from "./atelier";
import { Icon, type IconName } from "./icons";
import { resourceParts, richPieces, slotTasks, splitLeadingDuration, type ResourcePart, type RichPiece } from "./present";

const WEEKDAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"] as const;

type DayRow = {
  name: string;
  slot: Slot | null;
  today: boolean;
  past: boolean;
};

export function SlotList({ slots, weekday }: { slots: Slot[]; weekday: string }) {
  return (
    <ul className="day-plan">
      {weekRows(slots, weekday).map((row) => (
        <li key={row.name} className={rowClass(row)} aria-current={row.today ? "date" : undefined}>
          <div className="day-head">
            <h3>{row.name}</h3>
            {row.today ? <span className="pill pill-today">Aujourd’hui</span> : null}
            {row.past ? <span className="past-flag">passé</span> : null}
            <span className="day-duration">{row.slot ? row.slot.d : "pas de créneau"}</span>
          </div>
          {row.slot ? <DayBody slot={row.slot} /> : null}
        </li>
      ))}
    </ul>
  );
}

function DayBody({ slot }: { slot: Slot }) {
  const tasks = slotTasks(slot.contenu);
  const parts = resourceParts(slot.res, slot.contenu);
  return (
    <>
      <TaskGroup title="À regarder ou lire" icon="read" items={tasks.read} context={slot.contenu} />
      <TaskGroup title="À faire" icon="write" items={tasks.do} context={slot.contenu} />
      {parts.length > 0 ? (
        <div className="resource-row">
          {parts.map((part, index) => (
            <Fragment key={`${part.kind}-${index}`}>
              <ResourcePartView part={part} />
            </Fragment>
          ))}
        </div>
      ) : null}
    </>
  );
}

function TaskGroup({ title, icon, items, context }: { title: string; icon: IconName; items: string[]; context: string }) {
  if (items.length === 0) return null;
  return (
    <>
      <p className="task-kind">
        <Icon name={icon} />
        {title}
      </p>
      <ul className="task-list">
        {items.map((item, index) => {
          const split = splitLeadingDuration(item);
          return (
            <li key={`${title}-${index}`}>
              <span className="task-body">
                <RichText text={split.text} context={context} />
              </span>
              {split.duration ? <span className="task-duration">{split.duration}</span> : null}
            </li>
          );
        })}
      </ul>
    </>
  );
}

function ResourcePartView({ part }: { part: ResourcePart }) {
  switch (part.kind) {
    case "link":
      return (
        <a href={part.href} rel="noreferrer noopener" target="_blank">
          {part.label}
          <Icon name="external" />
        </a>
      );
    case "text":
      return <span className="resource-chip">{part.text}</span>;
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
          <Icon name="external" />
        </a>
      );
    default: {
      const neverPiece: never = piece;
      return neverPiece;
    }
  }
}

function weekRows(slots: Slot[], weekday: string): DayRow[] {
  const todayIndex = WEEKDAYS.findIndex((day) => sameDayName(day, weekday));
  const used = new Set<Slot>();
  const rows: DayRow[] = WEEKDAYS.map((name, index) => {
    const slot = slots.find((item) => sameDayName(item.c, name)) ?? null;
    if (slot) used.add(slot);
    return {
      name: slot?.c ?? name,
      slot,
      today: sameDayName(name, weekday),
      past: todayIndex >= 0 && index < todayIndex,
    };
  });
  for (const slot of slots) {
    if (used.has(slot)) continue;
    rows.push({
      name: slot.c,
      slot,
      today: sameDayName(slot.c, weekday),
      past: false,
    });
  }
  return rows;
}

function rowClass(row: DayRow): string {
  const names = ["day"];
  names.push(row.slot ? "day-card" : "day-empty");
  if (row.today) names.push("day-today");
  if (row.past) names.push("day-past");
  return names.join(" ");
}
