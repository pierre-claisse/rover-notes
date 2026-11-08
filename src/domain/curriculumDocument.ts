import { sha256Hex, utf8 } from "../crypto/bytes";
import { canonicalJson } from "./json";
import { CURRICULUM_VERSION } from "./limits";

/** Versions encore lisibles dans un coffre déjà ouvert. CURRICULUM_VERSION reste la version écrite. */
export const READABLE_CURRICULUM_VERSIONS: readonly string[] = [CURRICULUM_VERSION];

export type DetailLevel = "source-detailed" | "indicative-block-only";

export type Slot = { c: string; d: string; contenu: string; res: string };

export type ScheduleNotes =
  | { sourceMondayDate: string; slots: Slot[] }
  | { blockSourceText: string; note: string };

export type ObjectiveRef = { id: string; text: string; origin: "canvas" };

export type StudyQuestion = {
  id: string;
  weekId: string;
  linkedObjectiveIds: string[];
  prompt: string;
  answerKind: "text" | "checkboxes";
  multiline: boolean;
  options: { id: string; label: string }[];
  hints: string[];
  origin: "authored" | "canvas";
};

export type PhaseDocument = {
  id: string;
  nom: string;
  mois: string;
  heures: number;
  theorie: string[];
  exercices: string[];
  livrable: string;
  done: string;
  objectives: string[];
  sources: string[];
  blocks: { fromWeek: number; toWeek: number; title: string; sourceText: string }[];
  programDetail: { titre: string; blocs: string; themes: { title: string; items: string[] }[]; resources: string } | null;
};

export type WeekDocument = {
  id: string;
  phase: string;
  weekNumber: number;
  title: string;
  detailLevel: DetailLevel;
  objectives: ObjectiveRef[];
  sources: string[];
  exercises: string[];
  verification: string | null;
  proofs: string[];
  scheduleNotes: ScheduleNotes;
  canvasDetailedQuestions: string[];
  canvasHints: string[];
};

export type CurriculumDocument = {
  schemaVersion: 1;
  curriculumVersion: typeof CURRICULUM_VERSION;
  programRevision: number;
  language: "fr";
  provenance: { overview: string; program: string; extraction: string };
  gaps: string[];
  context: {
    asOf: string;
    timezone: "Europe/Paris";
    completedHours: number;
    hoursPerWeek: number;
    robotPurchased: boolean;
    activeWeek: string;
    scheduleNotes: string[];
  };
  phases: PhaseDocument[];
  weeks: WeekDocument[];
  competencyReference: { domain: string; items: string[] }[];
  programPhaseRows: string[][];
  sourceQuestions: StudyQuestion[];
  authoredComplement: { origin: "authored"; note: string; questions: StudyQuestion[] };
  inconsistency: { origin: "authored"; summary: string };
};

export function buildCurriculumDocument(source: unknown, authored: unknown): CurriculumDocument {
  const root = record(source, "curriculum");
  if (root.schemaVersion !== 1 || root.language !== "fr") throw new Error("Curriculum source refusé");
  const provenance = record(root.provenance, "provenance");
  const inconsistency = record(root.inconsistency, "inconsistency");
  const context = record(root.context, "context");
  const programRevision = integer(root.programRevision, "programRevision", 1, 1_000_000);
  if (context.timezone !== "Europe/Paris") throw new Error("Fuseau du curriculum refusé");
  const weeks = array(root.weeks, "weeks").map((item) => buildWeek(item));
  const phases = array(root.phases, "phases").map((item) => buildPhase(item));
  const authoredComplement = buildAuthored(authored, weeks);
  const sourceQuestions = weeks.flatMap((week) => (week.verification ? [verificationQuestion(week)] : []));
  return {
    schemaVersion: 1,
    curriculumVersion: CURRICULUM_VERSION,
    programRevision,
    language: "fr",
    provenance: {
      overview: text(provenance.overview, "provenance.overview"),
      program: text(provenance.program, "provenance.program"),
      extraction: text(provenance.extraction, "provenance.extraction"),
    },
    gaps: array(root.gaps, "gaps").map((item, index) => text(item, `gaps.${index}`)),
    context: {
      asOf: text(context.asOf, "context.asOf"),
      timezone: "Europe/Paris",
      completedHours: number(context.completedHours, "context.completedHours"),
      hoursPerWeek: number(context.hoursPerWeek, "context.hoursPerWeek"),
      robotPurchased: bool(context.robotPurchased, "context.robotPurchased"),
      activeWeek: text(context.activeWeek, "context.activeWeek"),
      scheduleNotes: array(context.scheduleNotes, "context.scheduleNotes").map((item, index) => text(item, `context.scheduleNotes.${index}`)),
    },
    phases,
    weeks,
    competencyReference: array(root.competencyReference, "competencyReference").map((item, index) => {
      if (!Array.isArray(item) || item.length !== 2) throw new Error(`competencyReference.${index}`);
      const [domain, items] = item;
      return {
        domain: text(domain, `competencyReference.${index}.domain`),
        items: array(items, `competencyReference.${index}.items`).map((entry, entryIndex) => text(entry, `competencyReference.${index}.items.${entryIndex}`)),
      };
    }),
    programPhaseRows: array(root.programPhaseRows, "programPhaseRows").map((item, index) =>
      array(item, `programPhaseRows.${index}`).map((cell, cellIndex) => text(cell, `programPhaseRows.${index}.${cellIndex}`)),
    ),
    sourceQuestions,
    authoredComplement,
    inconsistency: { origin: "authored", summary: text(inconsistency.summary, "inconsistency.summary") },
  };
}

export function parseCurriculumDocument(value: unknown): CurriculumDocument {
  if (!isCurrentCurriculum(value)) throw new Error("Programme chiffré refusé");
  const built = value as CurriculumDocument;
  const programRevision = revisionOrZero(built.programRevision);
  if (programRevision === null) throw new Error("Programme chiffré refusé");
  if (built.programRevision === programRevision) return built;
  return { ...built, programRevision };
}

/** Révision d’un programme de coffre. 0 si le champ n’existe pas encore. null si l’objet est illisible. */
export function readProgramRevision(value: unknown): number | null {
  if (!isReadableCurriculum(value)) return null;
  return revisionOrZero((value as { programRevision?: unknown }).programRevision);
}

/** Le seed empaqueté remplace le programme du coffre quand sa révision est plus haute, ou quand le contenu diffère à révision égale. */
export async function packagedCurriculumWins(stored: unknown, packaged: CurriculumDocument): Promise<boolean> {
  const storedRevision = readProgramRevision(stored);
  if (storedRevision === null) return false;
  if (packaged.programRevision > storedRevision) return true;
  if (packaged.programRevision < storedRevision) return false;
  const storedHash = await sha256Hex(utf8(canonicalJson(stored)));
  const packagedHash = await sha256Hex(utf8(canonicalJson(packaged)));
  return storedHash !== packagedHash;
}

function isCurrentCurriculum(value: unknown): boolean {
  return isReadableCurriculum(value) && (value as CurriculumDocument).curriculumVersion === CURRICULUM_VERSION;
}

function isReadableCurriculum(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (value.schemaVersion !== 1 || value.language !== "fr") return false;
  if (typeof value.curriculumVersion !== "string" || !READABLE_CURRICULUM_VERSIONS.includes(value.curriculumVersion)) return false;
  if (!Array.isArray(value.weeks) || value.weeks.length < 90) return false;
  const authored = value.authoredComplement;
  const inconsistency = value.inconsistency;
  if (!isRecord(authored) || authored.origin !== "authored") return false;
  if (!isRecord(inconsistency) || inconsistency.origin !== "authored") return false;
  return true;
}

function revisionOrZero(value: unknown): number | null {
  if (value == null) return 0;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 1_000_000) return null;
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function buildWeek(value: unknown): WeekDocument {
  const week = record(value, "week");
  const id = text(week.id, "week.id");
  const detailLevel = week.detailLevel === "source-detailed" || week.detailLevel === "indicative-block-only" ? week.detailLevel : null;
  if (!detailLevel) throw new Error(`Niveau de détail refusé pour ${id}`);
  const objectives = array(week.objectives, `${id}.objectives`).map((item, index) => ({
    id: `${id}-o${index + 1}`,
    text: text(item, `${id}.objectives.${index}`),
    origin: "canvas" as const,
  }));
  const scheduleNotes = buildSchedule(week.scheduleNotes, detailLevel, id);
  return {
    id,
    phase: text(week.phase, `${id}.phase`),
    weekNumber: number(week.weekNumber, `${id}.weekNumber`),
    title: text(week.title, `${id}.title`),
    detailLevel,
    objectives,
    sources: strings(week.sources, `${id}.sources`),
    exercises: strings(week.exercises, `${id}.exercises`),
    verification: week.verification == null ? null : text(week.verification, `${id}.verification`),
    proofs: strings(week.proofs, `${id}.proofs`),
    scheduleNotes,
    canvasDetailedQuestions: strings(week.detailedQuestions, `${id}.detailedQuestions`),
    canvasHints: strings(week.hints, `${id}.hints`),
  };
}

function buildSchedule(value: unknown, detailLevel: DetailLevel, id: string): ScheduleNotes {
  const notes = record(value, `${id}.scheduleNotes`);
  if (detailLevel === "source-detailed") {
    return {
      sourceMondayDate: text(notes.sourceMondayDate, `${id}.date`),
      slots: array(notes.slots, `${id}.slots`).map((item, index) => {
        const slot = record(item, `${id}.slots.${index}`);
        return {
          c: text(slot.c, `${id}.slots.${index}.c`),
          d: text(slot.d, `${id}.slots.${index}.d`),
          contenu: text(slot.contenu, `${id}.slots.${index}.contenu`),
          res: text(slot.res, `${id}.slots.${index}.res`),
        };
      }),
    };
  }
  return {
    blockSourceText: text(notes.blockSourceText, `${id}.block`),
    note: text(notes.note, `${id}.note`),
  };
}

function buildPhase(value: unknown): PhaseDocument {
  const phase = record(value, "phase");
  const id = text(phase.id, "phase.id");
  const detail = phase.programDetail == null ? null : record(phase.programDetail, `${id}.programDetail`);
  return {
    id,
    nom: text(phase.nom, `${id}.nom`),
    mois: text(phase.mois, `${id}.mois`),
    heures: number(phase.heures, `${id}.heures`),
    theorie: strings(phase.theorie, `${id}.theorie`),
    exercices: strings(phase.exercices, `${id}.exercices`),
    livrable: text(phase.livrable, `${id}.livrable`),
    done: text(phase.done, `${id}.done`),
    objectives: strings(phase.objectives, `${id}.objectives`),
    sources: strings(phase.sources, `${id}.sources`),
    blocks: array(phase.blocks, `${id}.blocks`).map((item, index) => {
      const block = record(item, `${id}.blocks.${index}`);
      return {
        fromWeek: number(block.fromWeek, `${id}.blocks.${index}.from`),
        toWeek: number(block.toWeek, `${id}.blocks.${index}.to`),
        title: text(block.title, `${id}.blocks.${index}.title`),
        sourceText: text(block.sourceText, `${id}.blocks.${index}.sourceText`),
      };
    }),
    programDetail: detail
      ? {
          titre: text(detail.titre, `${id}.titre`),
          blocs: text(detail.blocs, `${id}.blocs`),
          themes: array(detail.themes, `${id}.themes`).map((item, index) => {
            const theme = record(item, `${id}.themes.${index}`);
            return { title: text(theme.t, `${id}.themes.${index}.t`), items: strings(theme.items, `${id}.themes.${index}.items`) };
          }),
          resources: text(detail.res, `${id}.res`),
        }
      : null,
  };
}

function buildAuthored(value: unknown, weeks: WeekDocument[]): CurriculumDocument["authoredComplement"] {
  const root = record(value, "authored");
  if (root.origin !== "authored") throw new Error("Le complément doit déclarer origin: authored");
  const weekIds = new Set(weeks.map((week) => week.id));
  const objectiveIds = new Set(weeks.flatMap((week) => week.objectives.map((item) => item.id)));
  const questions = array(root.questions, "authored.questions").map((item, index) => {
    const question = record(item, `authored.questions.${index}`);
    const weekId = text(question.weekId, "authored.weekId");
    if (!weekIds.has(weekId)) throw new Error(`Question hors semaine: ${weekId}`);
    const linked = strings(question.linkedObjectiveIds, "authored.linked");
    for (const id of linked) if (!objectiveIds.has(id)) throw new Error(`Objectif inconnu: ${id}`);
    let answerKind: "text" | "checkboxes";
    if (question.answerKind === "text") answerKind = "text";
    else if (question.answerKind === "checkboxes") answerKind = "checkboxes";
    else throw new Error("Type de réponse refusé");
    const options =
      question.options == null
        ? []
        : array(question.options, "authored.options").map((option, optionIndex) => {
            const row = record(option, `authored.options.${optionIndex}`);
            return { id: text(row.id, "option.id"), label: text(row.label, "option.label") };
          });
    if (answerKind === "checkboxes" && options.length === 0) throw new Error("Cases sans options");
    return {
      id: text(question.id, "authored.id"),
      weekId,
      linkedObjectiveIds: linked,
      prompt: text(question.prompt, "authored.prompt"),
      answerKind,
      multiline: question.multiline === true,
      options,
      hints: strings(question.hints, "authored.hints"),
      origin: "authored" as const,
    };
  });
  return { origin: "authored", note: text(root.note, "authored.note"), questions };
}

function verificationQuestion(week: WeekDocument): StudyQuestion {
  return {
    id: `${week.id}-q-verification`,
    weekId: week.id,
    linkedObjectiveIds: week.objectives.map((item) => item.id),
    prompt: week.verification ?? "",
    answerKind: "text",
    multiline: true,
    options: [],
    hints: [],
    origin: "canvas",
  };
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error(label);
  return value as Record<string, unknown>;
}

function array(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(label);
  return value;
}

function text(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length < 1) throw new Error(label);
  return value;
}

function strings(value: unknown, label: string): string[] {
  return array(value, label).map((item, index) => text(item, `${label}.${index}`));
}

function number(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(label);
  return value;
}

function integer(value: unknown, label: string, min: number, max: number): number {
  const parsed = number(value, label);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) throw new Error(label);
  return parsed;
}

function bool(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") throw new Error(label);
  return value;
}
