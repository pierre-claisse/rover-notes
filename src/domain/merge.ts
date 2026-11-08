import { canonicalJson } from "./json";
import type { Journal, JournalEntry, Manifest, WeekRecord, WriteUp } from "./schemas";

export type WeekConflict =
  | { kind: "notes" }
  | { kind: "state" }
  | { kind: "curriculumVersion" }
  | { kind: "writeUp"; field: keyof WriteUp }
  | { kind: "objective"; id: string; field: "selfAssessment" | "explanation" }
  | { kind: "answer"; questionId: string }
  | { kind: "evidence"; id: string };

export type JournalConflict = { kind: "entry"; id: string };

export type ManifestConflict =
  | { kind: "activeWeekId" }
  | { kind: "robotPurchased" }
  | { kind: "curriculumVersion" }
  | { kind: "curriculumObjectId" }
  | { kind: "journalObjectId" }
  | { kind: "weekRef"; weekId: string };

export function mergeWeek(base: WeekRecord, local: WeekRecord, remote: WeekRecord): { value: WeekRecord; conflicts: WeekConflict[] } {
  if (base.weekId !== local.weekId || base.weekId !== remote.weekId) {
    throw new Error("Fusion de semaines différentes");
  }
  const conflicts: WeekConflict[] = [];
  const notes = mergeScalar(base.notes, local.notes, remote.notes, () => conflicts.push({ kind: "notes" }));
  const state = mergeScalar(base.state, local.state, remote.state, () => conflicts.push({ kind: "state" }));
  const curriculumVersion = mergeScalar(base.curriculumVersion, local.curriculumVersion, remote.curriculumVersion, () =>
    conflicts.push({ kind: "curriculumVersion" }),
  );
  const writeUp = {
    learned: mergeScalar(base.writeUp.learned, local.writeUp.learned, remote.writeUp.learned, () =>
      conflicts.push({ kind: "writeUp", field: "learned" }),
    ),
    difficulties: mergeScalar(base.writeUp.difficulties, local.writeUp.difficulties, remote.writeUp.difficulties, () =>
      conflicts.push({ kind: "writeUp", field: "difficulties" }),
    ),
    nextSteps: mergeScalar(base.writeUp.nextSteps, local.writeUp.nextSteps, remote.writeUp.nextSteps, () =>
      conflicts.push({ kind: "writeUp", field: "nextSteps" }),
    ),
  };
  const objectives = mergeObjectives(base, local, remote, conflicts);
  const answers = mergeAnswers(base.answers, local.answers, remote.answers, conflicts);
  const evidence = unionById(local.evidence, remote.evidence, (item) => item.id, (id) => conflicts.push({ kind: "evidence", id }));
  return {
    value: {
      schemaVersion: 1,
      weekId: base.weekId,
      curriculumVersion,
      revision: remote.revision,
      state,
      objectives,
      answers,
      notes,
      writeUp,
      evidence,
      updatedAt: remote.updatedAt,
    },
    conflicts,
  };
}

export function mergeJournal(base: Journal, local: Journal, remote: Journal): { value: Journal; conflicts: JournalConflict[] } {
  const conflicts: JournalConflict[] = [];
  const entries = mergeEntries(base.entries, local.entries, remote.entries, conflicts);
  return { value: { schemaVersion: 1, entries }, conflicts };
}

export function mergeManifest(base: Manifest, local: Manifest, remote: Manifest): { value: Manifest; conflicts: ManifestConflict[] } {
  const conflicts: ManifestConflict[] = [];
  const activeWeekId = mergeScalar(base.activeWeekId, local.activeWeekId, remote.activeWeekId, () => conflicts.push({ kind: "activeWeekId" }));
  const robotPurchased = mergeScalar(base.robotPurchased, local.robotPurchased, remote.robotPurchased, () =>
    conflicts.push({ kind: "robotPurchased" }),
  );
  const curriculumVersion = mergeScalar(base.curriculumVersion, local.curriculumVersion, remote.curriculumVersion, () =>
    conflicts.push({ kind: "curriculumVersion" }),
  );
  const curriculumObjectId = mergeScalar(base.curriculumObjectId, local.curriculumObjectId, remote.curriculumObjectId, () =>
    conflicts.push({ kind: "curriculumObjectId" }),
  );
  const journalObjectId = mergeScalar(base.journalObjectId, local.journalObjectId, remote.journalObjectId, () =>
    conflicts.push({ kind: "journalObjectId" }),
  );
  const weeks = unionWeekRefs(local.weeks, remote.weeks, (weekId) => conflicts.push({ kind: "weekRef", weekId }));
  return {
    value: {
      schemaVersion: 1,
      curriculumVersion,
      timezone: "Europe/Paris",
      activeWeekId,
      completedMinutes: remote.completedMinutes,
      robotPurchased,
      curriculumObjectId,
      weeks,
      journalObjectId,
    },
    conflicts,
  };
}

export function conflictLabel(conflict: WeekConflict | JournalConflict | ManifestConflict): string {
  switch (conflict.kind) {
    case "notes":
      return "Notes";
    case "state":
      return "État de la semaine";
    case "curriculumVersion":
      return "Version du programme";
    case "writeUp":
      if (conflict.field === "learned") return "Appris";
      if (conflict.field === "difficulties") return "Blocages";
      return "Prochaine action";
    case "objective":
      return `Objectif ${conflict.id} (${conflict.field === "selfAssessment" ? "case" : "précision"})`;
    case "answer":
      return `Réponse ${conflict.questionId}`;
    case "evidence":
      return `Preuve ${conflict.id}`;
    case "entry":
      return `Séance ${conflict.id}`;
    case "activeWeekId":
      return "Semaine en cours";
    case "robotPurchased":
      return "Robot acheté";
    case "curriculumObjectId":
      return "Objet programme";
    case "journalObjectId":
      return "Objet journal";
    case "weekRef":
      return `Référence ${conflict.weekId}`;
    default: {
      const neverConflict: never = conflict;
      return neverConflict;
    }
  }
}

export function weekConflictText(record: WeekRecord, conflict: WeekConflict): string {
  switch (conflict.kind) {
    case "notes":
      return record.notes;
    case "state":
      return record.state;
    case "curriculumVersion":
      return record.curriculumVersion;
    case "writeUp":
      return record.writeUp[conflict.field];
    case "objective": {
      const found = record.objectives.find((item) => item.id === conflict.id);
      if (!found) return "";
      return conflict.field === "selfAssessment" ? found.selfAssessment : found.explanation;
    }
    case "answer":
      return canonicalJson(record.answers.find((item) => item.questionId === conflict.questionId)?.value ?? null);
    case "evidence":
      return canonicalJson(record.evidence.find((item) => item.id === conflict.id) ?? null);
    default: {
      const neverConflict: never = conflict;
      return neverConflict;
    }
  }
}

function mergeObjectives(
  base: WeekRecord,
  local: WeekRecord,
  remote: WeekRecord,
  conflicts: WeekConflict[],
): WeekRecord["objectives"] {
  const ids = unique([...base.objectives, ...local.objectives, ...remote.objectives].map((item) => item.id));
  return ids.map((id) => {
    const left = base.objectives.find((item) => item.id === id);
    const mid = local.objectives.find((item) => item.id === id);
    const right = remote.objectives.find((item) => item.id === id);
    if (!left || !mid || !right) {
      conflicts.push({ kind: "objective", id, field: "selfAssessment" });
      return mid ?? right ?? left!;
    }
    return {
      id,
      selfAssessment: mergeScalar(left.selfAssessment, mid.selfAssessment, right.selfAssessment, () =>
        conflicts.push({ kind: "objective", id, field: "selfAssessment" }),
      ),
      explanation: mergeScalar(left.explanation, mid.explanation, right.explanation, () =>
        conflicts.push({ kind: "objective", id, field: "explanation" }),
      ),
    };
  });
}

function mergeAnswers(
  base: WeekRecord["answers"],
  local: WeekRecord["answers"],
  remote: WeekRecord["answers"],
  conflicts: WeekConflict[],
): WeekRecord["answers"] {
  const ids = unique([...base, ...local, ...remote].map((item) => item.questionId));
  const out: WeekRecord["answers"] = [];
  for (const questionId of ids) {
    const left = base.find((item) => item.questionId === questionId);
    const mid = local.find((item) => item.questionId === questionId);
    const right = remote.find((item) => item.questionId === questionId);
    if (mid && right) {
      if (same(mid.value, right.value)) out.push(mid);
      else if (left && same(mid.value, left.value)) out.push(right);
      else if (left && same(right.value, left.value)) out.push(mid);
      else if (!left) {
        conflicts.push({ kind: "answer", questionId });
        out.push(mid);
      } else {
        conflicts.push({ kind: "answer", questionId });
        out.push(mid);
      }
    } else if (mid && !right) {
      if (!left) out.push(mid);
      else if (same(mid, left)) {
        /* suppression distante inchangée localement */
      } else {
        conflicts.push({ kind: "answer", questionId });
        out.push(mid);
      }
    } else if (right && !mid) {
      if (!left) out.push(right);
      else if (same(right, left)) {
        /* suppression locale, distant inchangé */
      } else {
        conflicts.push({ kind: "answer", questionId });
        out.push(right);
      }
    }
  }
  return out;
}

function mergeEntries(base: JournalEntry[], local: JournalEntry[], remote: JournalEntry[], conflicts: JournalConflict[]): JournalEntry[] {
  const ids = unique([...base, ...local, ...remote].map((item) => item.id));
  const out: JournalEntry[] = [];
  for (const id of ids) {
    const left = base.find((item) => item.id === id);
    const mid = local.find((item) => item.id === id);
    const right = remote.find((item) => item.id === id);
    if (mid && right) {
      if (same(mid, right)) out.push(mid);
      else if (left && same(mid, left)) out.push(right);
      else if (left && same(right, left)) out.push(mid);
      else {
        conflicts.push({ kind: "entry", id });
        out.push(mid);
      }
    } else if (mid) {
      out.push(mid);
    } else if (right) {
      out.push(right);
    }
  }
  return out;
}

function unionById<T extends { id: string }>(local: T[], remote: T[], key: (item: T) => string, onConflict: (id: string) => void): T[] {
  const ids = unique([...local, ...remote].map(key));
  const out: T[] = [];
  for (const id of ids) {
    const mid = local.find((item) => key(item) === id);
    const right = remote.find((item) => key(item) === id);
    if (mid && right) {
      if (!same(mid, right)) onConflict(id);
      out.push(same(mid, right) ? mid : mid);
    } else if (mid) out.push(mid);
    else if (right) out.push(right);
  }
  return out;
}

function unionWeekRefs(
  local: Manifest["weeks"],
  remote: Manifest["weeks"],
  onConflict: (weekId: string) => void,
): Manifest["weeks"] {
  const ids = unique([...local, ...remote].map((item) => item.weekId));
  const out: Manifest["weeks"] = [];
  for (const weekId of ids) {
    const mid = local.find((item) => item.weekId === weekId);
    const right = remote.find((item) => item.weekId === weekId);
    if (mid && right) {
      if (mid.objectId !== right.objectId) onConflict(weekId);
      out.push(mid.objectId === right.objectId ? mid : mid);
    } else if (mid) out.push(mid);
    else if (right) out.push(right);
  }
  return out;
}

function mergeScalar<T>(base: T, local: T, remote: T, onConflict: () => void): T {
  if (same(local, remote)) return local;
  if (same(local, base)) return remote;
  if (same(remote, base)) return local;
  onConflict();
  return local;
}

function same(left: unknown, right: unknown): boolean {
  return canonicalJson(left) === canonicalJson(right);
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
