import type { CurriculumDocument } from "../domain/curriculumDocument";
import type { Journal, JournalEntry } from "../domain/schemas";

export function enteredTimeCopy(minutes: number, hours: number): string {
  return `Temps saisi : ${minutes} min, sur un rythme de ${formatHours(hours)} h.`;
}

export function paceFigure(minutes: number, hours: number): string {
  return `${enteredPace(minutes)} / ${formatHours(hours)} h`;
}

export function phaseTimeCopy(minutes: number, hours: number): string {
  return `Temps saisi : ${minutes} min, pour ${formatHours(hours)} h estimées.`;
}

export function sameDayName(left: string, right: string): boolean {
  return left.trim().toLocaleLowerCase("fr-FR") === right.trim().toLocaleLowerCase("fr-FR");
}

export function minutesOnDate(journal: Journal, localDate: string): number {
  return sumEntries(journal, (entry) => entry.localDate === localDate);
}

export function minutesForWeeks(journal: Journal, weekIds: ReadonlySet<string>): number {
  return sumEntries(journal, (entry) => weekIds.has(entry.weekId));
}

export function activePhaseMinutes(journal: Journal, curriculum: CurriculumDocument, weekId: string): number {
  const week = curriculum.weeks.find((item) => item.id === weekId);
  if (!week) return 0;
  const ids = new Set(curriculum.weeks.filter((item) => item.phase === week.phase).map((item) => item.id));
  return minutesForWeeks(journal, ids);
}

export function weekLabel(curriculum: CurriculumDocument, weekId: string): string {
  const week = curriculum.weeks.find((item) => item.id === weekId);
  if (!week) return weekId;
  return `S${week.weekNumber} — ${week.title}`;
}

export function journalTimeline(entries: readonly JournalEntry[]): JournalEntry[] {
  return [...entries].sort((left, right) => {
    if (left.localDate !== right.localDate) return left.localDate < right.localDate ? 1 : -1;
    if (left.recordedAt !== right.recordedAt) return left.recordedAt < right.recordedAt ? 1 : -1;
    return left.id < right.id ? 1 : -1;
  });
}

export function entryKindLabel(kind: JournalEntry["kind"]): string {
  switch (kind) {
    case "study_session":
      return "séance";
    case "weekly_review":
      return "bilan";
    default: {
      const neverKind: never = kind;
      return neverKind;
    }
  }
}

function enteredPace(minutes: number): string {
  if (minutes <= 0) return "0 h";
  const whole = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (rest === 0) return `${whole} h`;
  if (whole === 0) return `${rest} min`;
  return `${whole} h ${rest}`;
}

function formatHours(hours: number): string {
  return Number.isInteger(hours) ? String(hours) : String(hours);
}

function sumEntries(journal: Journal, keep: (entry: JournalEntry) => boolean): number {
  const seen = new Set<string>();
  let total = 0;
  for (const entry of journal.entries) {
    if (seen.has(entry.id) || !keep(entry)) continue;
    seen.add(entry.id);
    total += entry.minutes;
  }
  return total;
}
