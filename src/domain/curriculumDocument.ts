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

export type WeekBriefing = {
  whyThisWeek: string;
  keyIdea: string;
  sundayOutcome: string;
  roverLink: string;
  jsToCTrap: string;
  nextUnlocks: string;
  withoutRobot: string;
};

export type PhaseNarrative = {
  promise: string;
  hardwareNote: string;
  exitCriteria: string[];
  throughLine: string;
  portfolioNote: string;
  commonPitfall: string;
};

export type BlockBriefing = {
  whyThisBlock: string;
  hardwareNote: string;
};

export type GlossaryEntry = {
  id: string;
  term: string;
  definition: string;
  weekIds: string[];
  roverLink: string;
};

export type ThroughLine = {
  id: string;
  title: string;
  summary: string;
  weeks: string[];
  steps: string[];
};

export type HomeCoach = {
  activeWeekId: string;
  eyebrow: string;
  title: string;
  body: string;
  honestCalendar: string;
  throughLine: string;
  constraint: string;
  nextAction: string;
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
  narrative: PhaseNarrative;
  blocks: { fromWeek: number; toWeek: number; title: string; sourceText: string; briefing: BlockBriefing }[];
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
  briefing: WeekBriefing | null;
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
  homeCoach: HomeCoach;
  throughLines: ThroughLine[];
  glossary: GlossaryEntry[];
};

export function buildCurriculumDocument(source: unknown, authored: unknown, pedagogie: unknown): CurriculumDocument {
  const root = record(source, "curriculum");
  if (root.schemaVersion !== 1 || root.language !== "fr") throw new Error("Curriculum source refusé");
  const provenance = record(root.provenance, "provenance");
  const inconsistency = record(root.inconsistency, "inconsistency");
  const context = record(root.context, "context");
  const programRevision = integer(root.programRevision, "programRevision", 1, 1_000_000);
  if (context.timezone !== "Europe/Paris") throw new Error("Fuseau du curriculum refusé");
  const pedagogy = parsePedagogy(pedagogie);
  const weeks = attachWeekBriefings(array(root.weeks, "weeks").map((item) => buildWeek(item)), pedagogy);
  const phases = attachPhasePedagogy(array(root.phases, "phases").map((item) => buildPhase(item)), pedagogy);
  const authoredComplement = buildAuthored(authored, weeks);
  const activeWeek = text(context.activeWeek, "context.activeWeek");
  if (pedagogy.homeCoach.activeWeekId !== activeWeek) throw new Error("homeCoach.activeWeekId");
  assertPedagogyWeeks(pedagogy, weeks);
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
      activeWeek,
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
    homeCoach: pedagogy.homeCoach,
    throughLines: pedagogy.throughLines,
    glossary: pedagogy.glossary,
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

function buildWeek(value: unknown): Omit<WeekDocument, "briefing"> {
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

function buildPhase(value: unknown): Omit<PhaseDocument, "narrative" | "blocks"> & {
  blocks: Omit<PhaseDocument["blocks"][number], "briefing">[];
} {
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

const WEEK_BRIEFING_FIELDS = ["whyThisWeek", "keyIdea", "sundayOutcome", "roverLink", "jsToCTrap", "nextUnlocks", "withoutRobot"] as const;
const PHASE_NARRATIVE_FIELDS = ["promise", "hardwareNote", "throughLine", "portfolioNote", "commonPitfall"] as const;

type Pedagogy = {
  homeCoach: HomeCoach;
  throughLines: ThroughLine[];
  weekBriefings: Record<string, { title: string; briefing: WeekBriefing }>;
  phaseNarratives: Record<string, { nom: string; narrative: PhaseNarrative }>;
  blockBriefings: { phaseId: string; fromWeek: number; toWeek: number; title: string; briefing: BlockBriefing }[];
  glossary: GlossaryEntry[];
};

function parsePedagogy(value: unknown): Pedagogy {
  const root = record(value, "pedagogie");
  exactKeySet(root, ["homeCoach", "throughLines", "weekBriefings", "phaseNarratives", "blockBriefings", "glossary"], "pedagogie");
  return {
    homeCoach: parseHomeCoach(root.homeCoach),
    throughLines: parseThroughLines(root.throughLines),
    weekBriefings: parseWeekBriefings(root.weekBriefings),
    phaseNarratives: parsePhaseNarratives(root.phaseNarratives),
    blockBriefings: parseBlockBriefings(root.blockBriefings),
    glossary: parseGlossary(root.glossary),
  };
}

function parseHomeCoach(value: unknown): HomeCoach {
  const coach = record(value, "homeCoach");
  exactKeySet(
    coach,
    ["activeWeekId", "eyebrow", "title", "body", "honestCalendar", "throughLine", "constraint", "nextAction"],
    "homeCoach",
  );
  return {
    activeWeekId: text(coach.activeWeekId, "homeCoach.activeWeekId"),
    eyebrow: text(coach.eyebrow, "homeCoach.eyebrow"),
    title: text(coach.title, "homeCoach.title"),
    body: text(coach.body, "homeCoach.body"),
    honestCalendar: text(coach.honestCalendar, "homeCoach.honestCalendar"),
    throughLine: text(coach.throughLine, "homeCoach.throughLine"),
    constraint: text(coach.constraint, "homeCoach.constraint"),
    nextAction: text(coach.nextAction, "homeCoach.nextAction"),
  };
}

function parseThroughLines(value: unknown): ThroughLine[] {
  const lines = array(value, "throughLines").map((item, index) => {
    const line = record(item, `throughLines.${index}`);
    exactKeySet(line, ["id", "title", "summary", "weeks", "steps"], "throughLines", ["steps"]);
    return {
      id: text(line.id, `throughLines.${index}.id`),
      title: text(line.title, `throughLines.${index}.title`),
      summary: text(line.summary, `throughLines.${index}.summary`),
      weeks: strings(line.weeks, `throughLines.${index}.weeks`),
      steps: line.steps == null ? [] : strings(line.steps, `throughLines.${index}.steps`),
    };
  });
  rejectDuplicateIds(lines.map((line) => line.id), "throughLines");
  return lines;
}

function parseWeekBriefings(value: unknown): Pedagogy["weekBriefings"] {
  const root = record(value, "weekBriefings");
  const briefings: Pedagogy["weekBriefings"] = {};
  for (const [weekId, item] of Object.entries(root)) {
    const briefing = record(item, `weekBriefings.${weekId}`);
    exactKeySet(briefing, ["title", ...WEEK_BRIEFING_FIELDS], `weekBriefings.${weekId}`);
    const fields = {} as WeekBriefing;
    for (const field of WEEK_BRIEFING_FIELDS) fields[field] = text(briefing[field], `weekBriefings.${weekId}.${field}`);
    briefings[weekId] = { title: text(briefing.title, `weekBriefings.${weekId}.title`), briefing: fields };
  }
  return briefings;
}

function parsePhaseNarratives(value: unknown): Pedagogy["phaseNarratives"] {
  const root = record(value, "phaseNarratives");
  const narratives: Pedagogy["phaseNarratives"] = {};
  for (const [phaseId, item] of Object.entries(root)) {
    const narrative = record(item, `phaseNarratives.${phaseId}`);
    exactKeySet(narrative, ["nom", ...PHASE_NARRATIVE_FIELDS, "exitCriteria"], `phaseNarratives.${phaseId}`);
    narratives[phaseId] = {
      nom: text(narrative.nom, `phaseNarratives.${phaseId}.nom`),
      narrative: {
        promise: text(narrative.promise, `phaseNarratives.${phaseId}.promise`),
        hardwareNote: text(narrative.hardwareNote, `phaseNarratives.${phaseId}.hardwareNote`),
        exitCriteria: strings(narrative.exitCriteria, `phaseNarratives.${phaseId}.exitCriteria`),
        throughLine: text(narrative.throughLine, `phaseNarratives.${phaseId}.throughLine`),
        portfolioNote: text(narrative.portfolioNote, `phaseNarratives.${phaseId}.portfolioNote`),
        commonPitfall: text(narrative.commonPitfall, `phaseNarratives.${phaseId}.commonPitfall`),
      },
    };
  }
  return narratives;
}

function parseBlockBriefings(value: unknown): Pedagogy["blockBriefings"] {
  return array(value, "blockBriefings").map((item, index) => {
    const block = record(item, `blockBriefings.${index}`);
    exactKeySet(block, ["phaseId", "fromWeek", "toWeek", "title", "whyThisBlock", "hardwareNote"], `blockBriefings.${index}`);
    return {
      phaseId: text(block.phaseId, `blockBriefings.${index}.phaseId`),
      fromWeek: number(block.fromWeek, `blockBriefings.${index}.fromWeek`),
      toWeek: number(block.toWeek, `blockBriefings.${index}.toWeek`),
      title: text(block.title, `blockBriefings.${index}.title`),
      briefing: {
        whyThisBlock: text(block.whyThisBlock, `blockBriefings.${index}.whyThisBlock`),
        hardwareNote: text(block.hardwareNote, `blockBriefings.${index}.hardwareNote`),
      },
    };
  });
}

function parseGlossary(value: unknown): GlossaryEntry[] {
  const entries = array(value, "glossary").map((item, index) => {
    const entry = record(item, `glossary.${index}`);
    exactKeySet(entry, ["id", "term", "definition", "weekIds", "roverLink"], `glossary.${index}`);
    return {
      id: text(entry.id, `glossary.${index}.id`),
      term: text(entry.term, `glossary.${index}.term`),
      definition: text(entry.definition, `glossary.${index}.definition`),
      weekIds: strings(entry.weekIds, `glossary.${index}.weekIds`),
      roverLink: text(entry.roverLink, `glossary.${index}.roverLink`),
    };
  });
  rejectDuplicateIds(entries.map((entry) => entry.id), "glossary");
  return entries;
}

function attachWeekBriefings(weeks: Omit<WeekDocument, "briefing">[], pedagogy: Pedagogy): WeekDocument[] {
  const detailed = weeks.filter((week) => week.detailLevel === "source-detailed").map((week) => week.id);
  const briefingIds = Object.keys(pedagogy.weekBriefings);
  if (detailed.length !== briefingIds.length || detailed.some((id) => !pedagogy.weekBriefings[id])) {
    throw new Error("Briefings de semaine incomplets");
  }
  return weeks.map((week) => {
    const found = pedagogy.weekBriefings[week.id];
    if (week.detailLevel === "indicative-block-only") {
      if (found) throw new Error(`Briefing inattendu pour ${week.id}`);
      return { ...week, briefing: null };
    }
    if (!found || found.title !== week.title) throw new Error(`Briefing refusé pour ${week.id}`);
    return { ...week, briefing: found.briefing };
  });
}

function attachPhasePedagogy(
  phases: Array<Omit<PhaseDocument, "narrative" | "blocks"> & { blocks: Omit<PhaseDocument["blocks"][number], "briefing">[] }>,
  pedagogy: Pedagogy,
): PhaseDocument[] {
  const used = new Set<string>();
  const next = phases.map((phase) => {
    const found = pedagogy.phaseNarratives[phase.id];
    if (!found || found.nom !== phase.nom) throw new Error(`Récit refusé pour ${phase.id}`);
    const blocks = phase.blocks.map((block) => {
      const match = pedagogy.blockBriefings.find(
        (item) => item.phaseId === phase.id && item.fromWeek === block.fromWeek && item.toWeek === block.toWeek,
      );
      if (!match || match.title !== block.title) throw new Error(`Briefing de bloc refusé pour ${phase.id} S${block.fromWeek}`);
      const key = `${phase.id}:${block.fromWeek}-${block.toWeek}`;
      if (used.has(key)) throw new Error(`Briefing de bloc en double pour ${key}`);
      used.add(key);
      return { ...block, briefing: match.briefing };
    });
    return { ...phase, narrative: found.narrative, blocks };
  });
  if (used.size !== pedagogy.blockBriefings.length) throw new Error("Briefing de bloc en trop");
  if (Object.keys(pedagogy.phaseNarratives).length !== phases.length) throw new Error("Récit de phase en trop");
  return next;
}

function assertPedagogyWeeks(pedagogy: Pedagogy, weeks: WeekDocument[]): void {
  const ids = new Set(weeks.map((week) => week.id));
  for (const line of pedagogy.throughLines) {
    for (const weekId of line.weeks) if (!ids.has(weekId)) throw new Error(`Fil hors semaine: ${weekId}`);
  }
  for (const entry of pedagogy.glossary) {
    for (const weekId of entry.weekIds) if (!ids.has(weekId)) throw new Error(`Glossaire hors semaine: ${weekId}`);
  }
}

function exactKeySet(value: Record<string, unknown>, keys: readonly string[], label: string, optional: readonly string[] = []): void {
  const allowed = new Set(keys);
  const required = keys.filter((key) => !optional.includes(key));
  for (const key of Object.keys(value)) if (!allowed.has(key)) throw new Error(`${label}.${key}`);
  for (const key of required) if (!(key in value)) throw new Error(`${label}.${key}`);
}

function rejectDuplicateIds(ids: string[], label: string): void {
  if (new Set(ids).size !== ids.length) throw new Error(label);
}
