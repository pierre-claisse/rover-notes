import type { CurriculumDocument } from "./curriculumDocument";
import { CURRICULUM_VERSION } from "./limits";
import type { Journal, Manifest, WeekRecord, WriteUp } from "./schemas";
import { parisTimestamp } from "./time";

export function emptyWriteUp(): WriteUp {
  return { learned: "", difficulties: "", nextSteps: "" };
}

export function emptyWeek(document: CurriculumDocument, weekId: string, now: Date): WeekRecord {
  const week = document.weeks.find((item) => item.id === weekId);
  if (!week) throw new Error("Semaine inconnue dans le programme");
  return {
    schemaVersion: 1,
    weekId,
    curriculumVersion: document.curriculumVersion || CURRICULUM_VERSION,
    revision: 1,
    state: "in_progress",
    objectives: week.objectives.map((item) => ({ id: item.id, selfAssessment: "not_yet", explanation: "" })),
    answers: [],
    notes: "",
    writeUp: emptyWriteUp(),
    evidence: [],
    updatedAt: parisTimestamp(now),
  };
}

export function emptyJournal(): Journal {
  return { schemaVersion: 1, entries: [] };
}

export function initialManifest(
  document: CurriculumDocument,
  ids: { curriculum: string; journal: string; week: string },
): Manifest {
  const activeWeekId = document.context.activeWeek;
  if (!document.weeks.some((week) => week.id === activeWeekId)) throw new Error("Semaine active inconnue");
  return {
    schemaVersion: 1,
    curriculumVersion: document.curriculumVersion,
    timezone: "Europe/Paris",
    activeWeekId,
    completedMinutes: 0,
    robotPurchased: document.context.robotPurchased,
    curriculumObjectId: ids.curriculum,
    weeks: [{ weekId: activeWeekId, objectId: ids.week }],
    journalObjectId: ids.journal,
  };
}

export function sameWeekContent(left: WeekRecord, right: WeekRecord): boolean {
  return stableWeek(left) === stableWeek(right);
}

function stableWeek(record: WeekRecord): string {
  return JSON.stringify({
    weekId: record.weekId,
    state: record.state,
    objectives: record.objectives,
    answers: record.answers,
    notes: record.notes,
    writeUp: record.writeUp,
    evidence: record.evidence,
    curriculumVersion: record.curriculumVersion,
  });
}
