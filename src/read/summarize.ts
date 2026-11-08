import { sha256Hex, utf8Decode } from "../crypto/bytes";
import { openObject, parseEnvelope } from "../crypto/envelope";
import type { CurriculumDocument } from "../domain/curriculumDocument";
import { canonicalJson } from "../domain/json";
import { objectPath } from "../domain/limits";
import { minutesEntered, parseJournal, parseManifest, parseWeekRecord, type Evidence, type Journal, type WeekRecord } from "../domain/schemas";

export type ProgressSummary = {
  schemaVersion: 1;
  activeWeekId: string;
  manifestSha: string;
  robotPurchased: boolean;
  minutesEntered: number;
  note: string;
  weeks: WeekSummary[];
  missing: string[];
};

export type WeekSummary = {
  weekId: string;
  title: string;
  revision: number;
  sha: string;
  state: string;
  minutesEntered: number;
  objectives: { id: string; text: string; selfAssessment: string; explanation: string }[];
  answers: { questionId: string; prompt: string; origin: string; value: unknown }[];
  notes: string;
  writeUp: WeekRecord["writeUp"];
  evidence: Array<Record<string, string | number | boolean>>;
};

export type RemoteFile = { text: string; sha: string };
type Reader = (path: string) => Promise<RemoteFile | null>;

export async function summarizeVault(options: {
  dataKey: Uint8Array;
  read: Reader;
  week: string;
  verifyEvidence?: boolean;
}): Promise<ProgressSummary> {
  const manifestFile = await options.read("vault/v1/manifest.enc.json");
  if (!manifestFile) throw new Error("Manifeste absent");
  const manifestEnvelope = parseEnvelope(JSON.parse(manifestFile.text) as unknown);
  const manifest = parseManifest(JSON.parse(utf8Decode(await openObject(options.dataKey, manifestEnvelope))) as unknown);
  const curriculumFile = await options.read(objectPath(manifest.curriculumObjectId));
  const journalFile = await options.read(objectPath(manifest.journalObjectId));
  const missing: string[] = [];
  let curriculum: CurriculumDocument | null = null;
  let journal: Journal = { schemaVersion: 1, entries: [] };
  if (!curriculumFile) missing.push(manifest.curriculumObjectId);
  else {
    const envelope = parseEnvelope(JSON.parse(curriculumFile.text) as unknown);
    curriculum = JSON.parse(utf8Decode(await openObject(options.dataKey, envelope))) as CurriculumDocument;
  }
  if (!journalFile) missing.push(manifest.journalObjectId);
  else {
    const envelope = parseEnvelope(JSON.parse(journalFile.text) as unknown);
    journal = parseJournal(JSON.parse(utf8Decode(await openObject(options.dataKey, envelope))) as unknown);
  }
  const selected = options.week === "all" ? manifest.weeks : manifest.weeks.filter((item) => item.weekId === (options.week || manifest.activeWeekId));
  const weeks: WeekSummary[] = [];
  for (const ref of selected) {
    const file = await options.read(objectPath(ref.objectId));
    if (!file) {
      missing.push(ref.objectId);
      continue;
    }
    const envelope = parseEnvelope(JSON.parse(file.text) as unknown);
    const record = parseWeekRecord(JSON.parse(utf8Decode(await openObject(options.dataKey, envelope))) as unknown);
    const plan = curriculum?.weeks.find((item) => item.id === record.weekId);
    const questions = [
      ...(curriculum?.sourceQuestions.filter((item) => item.weekId === record.weekId) ?? []),
      ...(curriculum?.authoredComplement.questions.filter((item) => item.weekId === record.weekId) ?? []),
    ];
    const evidence = [];
    for (const item of record.evidence) evidence.push(await describeEvidence(item, options));
    weeks.push({
      weekId: record.weekId,
      title: plan?.title ?? record.weekId,
      revision: record.revision,
      sha: file.sha,
      state: record.state,
      minutesEntered: minutesEntered(journal, record.weekId),
      objectives: record.objectives.map((objective) => ({
        id: objective.id,
        text: plan?.objectives.find((item) => item.id === objective.id)?.text ?? objective.id,
        selfAssessment: objective.selfAssessment,
        explanation: objective.explanation,
      })),
      answers: record.answers.map((answer) => {
        const question = questions.find((item) => item.id === answer.questionId);
        return {
          questionId: answer.questionId,
          prompt: question?.prompt ?? "",
          origin: question?.origin ?? "",
          value: answer.value,
        };
      }),
      notes: record.notes,
      writeUp: record.writeUp,
      evidence,
    });
  }
  return {
    schemaVersion: 1,
    activeWeekId: manifest.activeWeekId,
    manifestSha: manifestFile.sha,
    robotPurchased: manifest.robotPurchased,
    minutesEntered: minutesEntered(journal),
    note: "Les cases « Je sais… » sont des auto-évaluations, pas des compétences validées.",
    weeks,
    missing,
  };
}

async function describeEvidence(
  item: Evidence,
  options: { dataKey: Uint8Array; read: Reader; verifyEvidence?: boolean },
): Promise<Record<string, string | number | boolean>> {
  if (item.kind === "url") return { id: item.id, kind: "url", href: item.href, visibility: item.visibility };
  const described: Record<string, string | number | boolean> = {
    id: item.id,
    kind: "file",
    filename: item.filename,
    byteLength: item.byteLength,
    sha256: item.sha256,
    chunkCount: item.chunkObjectIds.length,
  };
  if (!options.verifyEvidence) return described;
  const parts: Uint8Array[] = [];
  for (const chunkId of item.chunkObjectIds) {
    const file = await options.read(objectPath(chunkId));
    if (!file) {
      described.verified = false;
      return described;
    }
    const envelope = parseEnvelope(JSON.parse(file.text) as unknown);
    parts.push(await openObject(options.dataKey, envelope));
  }
  const bytes = concat(parts);
  described.verified = (await sha256Hex(bytes)) === item.sha256 && bytes.byteLength === item.byteLength;
  return described;
}

export function summaryMarkdown(summary: ProgressSummary): string {
  const lines = [
    `# Progrès ${summary.activeWeekId}`,
    "",
    summary.note,
    "",
    `Temps saisi : ${summary.minutesEntered} min.`,
    summary.minutesEntered === 0 ? "Aucune entrée sauvegardée." : "",
    `Robot acheté : ${summary.robotPurchased ? "oui" : "non"}.`,
    `SHA du manifeste : ${summary.manifestSha}`,
    "",
  ];
  for (const week of summary.weeks) {
    lines.push(`## ${week.weekId} — ${week.title}`, "", `Révision ${week.revision}, état ${week.state}, ${week.minutesEntered} min.`);
    for (const objective of week.objectives) {
      lines.push(`- ${objective.text} : ${objective.selfAssessment === "declared" ? "déclaré" : "pas encore"}`);
    }
    for (const answer of week.answers) lines.push("", `**${answer.questionId}** (${answer.origin})`, answer.prompt, canonicalJson(answer.value));
    lines.push("", `Notes : ${week.notes}`, `Appris : ${week.writeUp.learned}`, `Blocages : ${week.writeUp.difficulties}`, `Prochaine action : ${week.writeUp.nextSteps}`);
    for (const item of week.evidence) lines.push(`- preuve ${canonicalJson(item)}`);
    lines.push("");
  }
  if (summary.missing.length > 0) lines.push("Objets manquants :", ...summary.missing.map((id) => `- ${id}`));
  return lines.filter((line) => line !== undefined).join("\n");
}

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.byteLength, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.byteLength;
  }
  return out;
}
