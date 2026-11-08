import { CHUNK_BYTES, MAX_FILE_BYTES } from "./limits";

const WEEK_ID = /^P\d+-S\d+$/;
const OBJECT_ID = /^[A-Za-z0-9_-]{16,64}$/;
const SIMPLE_ID = /^[A-Za-z0-9_-]{1,80}$/;
const SHA256 = /^[a-f0-9]{64}$/;
const ISO_STAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/;
const LOCAL_DATE = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_TEXT = 200_000;

export class SchemaReject extends Error {
  readonly name = "SchemaReject";
  constructor(readonly path: string) {
    super(`Schéma refusé (${path})`);
  }
}

export type SelfAssessment = "not_yet" | "declared";
export type WeekState = "not_started" | "in_progress" | "handed_in";

export type ObjectiveState = {
  id: string;
  selfAssessment: SelfAssessment;
  explanation: string;
};

export type AnswerValue =
  | { kind: "text"; text: string }
  | { kind: "checkboxes"; selectedIds: string[] }
  | { kind: "number"; number: number }
  | { kind: "files"; evidenceIds: string[] };

export type Answer = { questionId: string; value: AnswerValue };

export type FileEvidence = {
  id: string;
  kind: "file";
  filename: string;
  mimeType: string;
  byteLength: number;
  sha256: string;
  chunkObjectIds: string[];
};

export type UrlEvidence = {
  id: string;
  kind: "url";
  href: string;
  visibility: "private" | "public";
  consented: true;
};

export type Evidence = FileEvidence | UrlEvidence;

export type WriteUp = { learned: string; difficulties: string; nextSteps: string };

export type WeekRecord = {
  schemaVersion: 1;
  weekId: string;
  curriculumVersion: string;
  revision: number;
  state: WeekState;
  objectives: ObjectiveState[];
  answers: Answer[];
  notes: string;
  writeUp: WriteUp;
  evidence: Evidence[];
  updatedAt: string;
};

export type JournalEntry = {
  id: string;
  weekId: string;
  localDate: string;
  timezone: "Europe/Paris";
  minutes: number;
  summary: string;
  evidenceIds: string[];
  recordedAt: string;
} & ({ kind: "study_session" } | { kind: "weekly_review"; review: WriteUp });

export type Journal = { schemaVersion: 1; entries: JournalEntry[] };

export type Manifest = {
  schemaVersion: 1;
  curriculumVersion: string;
  timezone: "Europe/Paris";
  activeWeekId: string;
  completedMinutes: number;
  robotPurchased: boolean;
  curriculumObjectId: string;
  weeks: { weekId: string; objectId: string }[];
  journalObjectId: string;
};

export function parseWeekRecord(value: unknown): WeekRecord {
  const record = needRecord(value, "week");
  exactKeys(
    record,
    ["schemaVersion", "weekId", "curriculumVersion", "revision", "state", "objectives", "answers", "notes", "writeUp", "evidence", "updatedAt"],
    "week",
  );
  const objectives = parseArray(record.objectives, "week.objectives", 200).map((item, index) => parseObjective(item, `week.objectives.${index}`));
  const answers = parseArray(record.answers, "week.answers", 200).map((item, index) => parseAnswer(item, `week.answers.${index}`));
  rejectDuplicates(objectives.map((item) => item.id), "week.objectives");
  rejectDuplicates(answers.map((item) => item.questionId), "week.answers");
  const evidence = parseArray(record.evidence, "week.evidence", 50).map((item, index) => parseEvidence(item, `week.evidence.${index}`));
  rejectDuplicates(evidence.map((item) => item.id), "week.evidence");
  return {
    schemaVersion: needLiteral(record.schemaVersion, 1, "week.schemaVersion"),
    weekId: needMatch(record.weekId, WEEK_ID, "week.weekId"),
    curriculumVersion: needShort(record.curriculumVersion, "week.curriculumVersion", 80),
    revision: needInt(record.revision, 1, 1_000_000, "week.revision"),
    state: needEnum(record.state, ["not_started", "in_progress", "handed_in"] as const, "week.state"),
    objectives,
    answers,
    notes: needText(record.notes, "week.notes"),
    writeUp: parseWriteUp(record.writeUp, "week.writeUp"),
    evidence,
    updatedAt: needMatch(record.updatedAt, ISO_STAMP, "week.updatedAt"),
  };
}

export function parseJournal(value: unknown): Journal {
  const record = needRecord(value, "journal");
  exactKeys(record, ["schemaVersion", "entries"], "journal");
  const entries = parseArray(record.entries, "journal.entries", 5000).map((item, index) => parseEntry(item, `journal.entries.${index}`));
  rejectDuplicates(entries.map((item) => item.id), "journal.entries");
  return { schemaVersion: needLiteral(record.schemaVersion, 1, "journal.schemaVersion"), entries };
}

export function parseManifest(value: unknown): Manifest {
  const record = needRecord(value, "manifest");
  exactKeys(
    record,
    ["schemaVersion", "curriculumVersion", "timezone", "activeWeekId", "completedMinutes", "robotPurchased", "curriculumObjectId", "weeks", "journalObjectId"],
    "manifest",
  );
  const weeks = parseArray(record.weeks, "manifest.weeks", 200).map((item, index) => {
    const row = needRecord(item, `manifest.weeks.${index}`);
    exactKeys(row, ["weekId", "objectId"], `manifest.weeks.${index}`);
    return {
      weekId: needMatch(row.weekId, WEEK_ID, `manifest.weeks.${index}.weekId`),
      objectId: needMatch(row.objectId, OBJECT_ID, `manifest.weeks.${index}.objectId`),
    };
  });
  rejectDuplicates(weeks.map((item) => item.weekId), "manifest.weeks");
  if (record.timezone !== "Europe/Paris") throw new SchemaReject("manifest.timezone");
  return {
    schemaVersion: needLiteral(record.schemaVersion, 1, "manifest.schemaVersion"),
    curriculumVersion: needShort(record.curriculumVersion, "manifest.curriculumVersion", 80),
    timezone: "Europe/Paris",
    activeWeekId: needMatch(record.activeWeekId, WEEK_ID, "manifest.activeWeekId"),
    completedMinutes: needInt(record.completedMinutes, 0, 1_000_000, "manifest.completedMinutes"),
    robotPurchased: needBoolean(record.robotPurchased, "manifest.robotPurchased"),
    curriculumObjectId: needMatch(record.curriculumObjectId, OBJECT_ID, "manifest.curriculumObjectId"),
    weeks,
    journalObjectId: needMatch(record.journalObjectId, OBJECT_ID, "manifest.journalObjectId"),
  };
}

export function minutesEntered(journal: Journal, weekId?: string): number {
  const seen = new Set<string>();
  let total = 0;
  for (const entry of journal.entries) {
    if (seen.has(entry.id)) continue;
    seen.add(entry.id);
    if (weekId && entry.weekId !== weekId) continue;
    total += entry.minutes;
  }
  return total;
}

function parseObjective(value: unknown, path: string): ObjectiveState {
  const record = needRecord(value, path);
  exactKeys(record, ["id", "selfAssessment", "explanation"], path);
  return {
    id: needMatch(record.id, SIMPLE_ID, `${path}.id`),
    selfAssessment: needEnum(record.selfAssessment, ["not_yet", "declared"] as const, `${path}.selfAssessment`),
    explanation: needText(record.explanation, `${path}.explanation`),
  };
}

function parseAnswer(value: unknown, path: string): Answer {
  const record = needRecord(value, path);
  exactKeys(record, ["questionId", "value"], path);
  return {
    questionId: needMatch(record.questionId, SIMPLE_ID, `${path}.questionId`),
    value: parseAnswerValue(record.value, `${path}.value`),
  };
}

function parseAnswerValue(value: unknown, path: string): AnswerValue {
  const record = needRecord(value, path);
  const kind = record.kind;
  if (kind === "text") {
    exactKeys(record, ["kind", "text"], path);
    return { kind: "text", text: needText(record.text, `${path}.text`) };
  }
  if (kind === "checkboxes") {
    exactKeys(record, ["kind", "selectedIds"], path);
    const selectedIds = parseArray(record.selectedIds, `${path}.selectedIds`, 50).map((item, index) =>
      needMatch(item, SIMPLE_ID, `${path}.selectedIds.${index}`),
    );
    rejectDuplicates(selectedIds, `${path}.selectedIds`);
    return { kind: "checkboxes", selectedIds };
  }
  if (kind === "number") {
    exactKeys(record, ["kind", "number"], path);
    if (typeof record.number !== "number" || !Number.isFinite(record.number)) throw new SchemaReject(`${path}.number`);
    return { kind: "number", number: record.number };
  }
  if (kind === "files") {
    exactKeys(record, ["kind", "evidenceIds"], path);
    const evidenceIds = parseArray(record.evidenceIds, `${path}.evidenceIds`, 50).map((item, index) =>
      needMatch(item, OBJECT_ID, `${path}.evidenceIds.${index}`),
    );
    return { kind: "files", evidenceIds };
  }
  throw new SchemaReject(`${path}.kind`);
}

function parseEvidence(value: unknown, path: string): Evidence {
  const record = needRecord(value, path);
  if (record.kind === "file") {
    exactKeys(record, ["id", "kind", "filename", "mimeType", "byteLength", "sha256", "chunkObjectIds"], path);
    const byteLength = needInt(record.byteLength, 0, MAX_FILE_BYTES, `${path}.byteLength`);
    const chunkObjectIds = parseArray(record.chunkObjectIds, `${path}.chunkObjectIds`, 64).map((item, index) =>
      needMatch(item, OBJECT_ID, `${path}.chunkObjectIds.${index}`),
    );
    const expected = byteLength === 0 ? 0 : Math.ceil(byteLength / CHUNK_BYTES);
    if (chunkObjectIds.length !== expected) throw new SchemaReject(`${path}.chunkObjectIds`);
    return {
      id: needMatch(record.id, OBJECT_ID, `${path}.id`),
      kind: "file",
      filename: needFilename(record.filename, `${path}.filename`),
      mimeType: needShort(record.mimeType, `${path}.mimeType`, 120),
      byteLength,
      sha256: needMatch(record.sha256, SHA256, `${path}.sha256`),
      chunkObjectIds,
    };
  }
  if (record.kind === "url") {
    exactKeys(record, ["id", "kind", "href", "visibility", "consented"], path);
    if (record.consented !== true) throw new SchemaReject(`${path}.consented`);
    const href = needShort(record.href, `${path}.href`, 2000);
    if (!/^https?:\/\//.test(href)) throw new SchemaReject(`${path}.href`);
    return {
      id: needMatch(record.id, OBJECT_ID, `${path}.id`),
      kind: "url",
      href,
      visibility: needEnum(record.visibility, ["private", "public"] as const, `${path}.visibility`),
      consented: true,
    };
  }
  throw new SchemaReject(`${path}.kind`);
}

function parseEntry(value: unknown, path: string): JournalEntry {
  const record = needRecord(value, path);
  const kind = record.kind;
  const baseKeys = ["id", "weekId", "kind", "localDate", "timezone", "minutes", "summary", "evidenceIds", "recordedAt"];
  if (kind === "study_session") exactKeys(record, baseKeys, path);
  else if (kind === "weekly_review") exactKeys(record, [...baseKeys, "review"], path);
  else throw new SchemaReject(`${path}.kind`);
  if (record.timezone !== "Europe/Paris") throw new SchemaReject(`${path}.timezone`);
  const shared = {
    id: needMatch(record.id, UUID, `${path}.id`),
    weekId: needMatch(record.weekId, WEEK_ID, `${path}.weekId`),
    localDate: needMatch(record.localDate, LOCAL_DATE, `${path}.localDate`),
    timezone: "Europe/Paris" as const,
    minutes: needInt(record.minutes, 0, 1440, `${path}.minutes`),
    summary: needText(record.summary, `${path}.summary`),
    evidenceIds: parseArray(record.evidenceIds, `${path}.evidenceIds`, 50).map((item, index) =>
      needMatch(item, OBJECT_ID, `${path}.evidenceIds.${index}`),
    ),
    recordedAt: needMatch(record.recordedAt, ISO_STAMP, `${path}.recordedAt`),
  };
  if (kind === "study_session") return { ...shared, kind: "study_session" };
  return { ...shared, kind: "weekly_review", review: parseWriteUp(record.review, `${path}.review`) };
}

function parseWriteUp(value: unknown, path: string): WriteUp {
  const record = needRecord(value, path);
  exactKeys(record, ["learned", "difficulties", "nextSteps"], path);
  return {
    learned: needText(record.learned, `${path}.learned`),
    difficulties: needText(record.difficulties, `${path}.difficulties`),
    nextSteps: needText(record.nextSteps, `${path}.nextSteps`),
  };
}

export function sanitizeStoredFilename(filename: string): string {
  const base = filename.replaceAll("\\", "/").split("/").pop() ?? "";
  const cleaned = base.replace(/[\u0000-\u001f]/g, "").trim();
  if (!cleaned || cleaned === "." || cleaned === "..") return "fichier";
  return cleaned.slice(0, 180);
}

function needFilename(value: unknown, path: string): string {
  const text = needText(value, path);
  if (text.length < 1 || text.length > 180 || /[\\/\u0000-\u001f]/.test(text) || text === "." || text === "..") {
    throw new SchemaReject(path);
  }
  return text;
}

function needRecord(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new SchemaReject(path);
  return value as Record<string, unknown>;
}

function exactKeys(record: Record<string, unknown>, keys: readonly string[], path: string): void {
  const got = Object.keys(record);
  if (got.length !== keys.length || keys.some((key) => !Object.hasOwn(record, key))) throw new SchemaReject(path);
}

function parseArray(value: unknown, path: string, max: number): unknown[] {
  if (!Array.isArray(value) || value.length > max) throw new SchemaReject(path);
  return value;
}

function needLiteral<T extends string | number>(value: unknown, expected: T, path: string): T {
  if (value !== expected) throw new SchemaReject(path);
  return expected;
}

function needMatch(value: unknown, pattern: RegExp, path: string): string {
  if (typeof value !== "string" || !pattern.test(value)) throw new SchemaReject(path);
  return value;
}

function needShort(value: unknown, path: string, max: number): string {
  if (typeof value !== "string" || value.length < 1 || value.length > max) throw new SchemaReject(path);
  return value;
}

function needText(value: unknown, path: string): string {
  if (typeof value !== "string" || value.length > MAX_TEXT) throw new SchemaReject(path);
  return value;
}

function needInt(value: unknown, min: number, max: number, path: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) throw new SchemaReject(path);
  return value;
}

function needBoolean(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") throw new SchemaReject(path);
  return value;
}

function needEnum<T extends string>(value: unknown, allowed: readonly T[], path: string): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) throw new SchemaReject(path);
  return value as T;
}

function rejectDuplicates(ids: string[], path: string): void {
  if (new Set(ids).size !== ids.length) throw new SchemaReject(path);
}
