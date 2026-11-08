import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { utf8, utf8Decode } from "../src/crypto/bytes";
import { openObject, parseEnvelope, sealObject, serializeEnvelope } from "../src/crypto/envelope";
import { canonicalJson } from "../src/domain/json";
import { loadCurriculumDocument } from "../src/domain/loadCurriculum";
import { objectPath } from "../src/domain/limits";
import { minutesEntered, parseWeekRecord } from "../src/domain/schemas";
import { parisTimestamp } from "../src/domain/time";
import { GitHubRequestError } from "../src/github/client";
import { MemoryContents } from "../src/github/memory";
import { MemoryDraftStore } from "../src/vault/drafts";
import { VaultSession } from "../src/vault/session";
import { summarizeVault } from "../src/read/summarize";

const dataKey = Uint8Array.from({ length: 32 }, (_, index) => index + 4);
const document = loadCurriculumDocument();

function session(client: MemoryContents, drafts = new MemoryDraftStore()) {
  return new VaultSession({
    client,
    dataKey,
    keyId: "k1",
    seed: async () => document,
    drafts,
    now: () => new Date("2026-11-08T12:00:00Z"),
    autosaveMs: 0,
  });
}

async function openReady(store = new MemoryContents()) {
  const current = session(store);
  await current.open();
  return { store, current };
}

describe("session S1", () => {
  it("crée un coffre vide puis le relit sans texte en clair", async () => {
    const { store, current } = await openReady();
    const snap = current.getSnapshot();
    expect(snap.manifest?.activeWeekId).toBe("P0-S1");
    expect(snap.manifest?.robotPurchased).toBe(false);
    expect(snap.manifest?.completedMinutes).toBe(0);
    expect(snap.weeks["P0-S1"]?.objectives.every((item) => item.selfAssessment === "not_yet")).toBe(true);
    expect(snap.journal?.entries).toEqual([]);
    const blob = [...store.files.values()].map((file) => file.text).join("\n");
    expect(blob).not.toContain("Je sais écrire sans IA");
    expect(blob).not.toContain("fixture-pat");
    const again = session(store);
    await again.open();
    expect(again.getSnapshot().weeks["P0-S1"]?.notes).toBe("");
    expect(store.puts.filter((path) => path.endsWith("manifest.enc.json")).length).toBe(1);
    expect(store.puts).toHaveLength(4);
  });

  it("réécrit le programme ancien depuis le seed et garde le reste du coffre", async () => {
    const current = loadCurriculumDocument();
    const legacy = structuredClone(current);
    legacy.programRevision = 0;
    legacy.inconsistency = {
      origin: "authored",
      summary: "Les deux chiffres ne décrivent pas le même calendrier.",
    };
    legacy.gaps = ["écart ancien, sans arbitrage"];
    legacy.authoredComplement = {
      ...legacy.authoredComplement,
      questions: legacy.authoredComplement.questions.filter((question) => question.weekId === "P0-S1"),
    };
    const store = new MemoryContents();
    const opened = new VaultSession({
      client: store,
      dataKey,
      keyId: "k1",
      seed: async () => legacy,
      drafts: new MemoryDraftStore(),
      now: () => new Date("2026-11-08T12:00:00Z"),
      autosaveMs: 0,
    });
    await opened.open();
    const proof = Uint8Array.from([4, 5, 6, 7]);
    opened.updateWeek("P0-S1", (week) => ({
      ...week,
      notes: "note-conservée",
      answers: [{ questionId: "P0-S1-q-bases", value: { kind: "text", text: "réponse-conservée" } }],
    }));
    await opened.uploadEvidence("P0-S1", { filename: "preuve-conservée.txt", mimeType: "text/plain", bytes: proof });
    await opened.saveWeek("P0-S1");
    await opened.addJournalEntry(entry("33333333-3333-4333-8333-333333333333", 25, "séance-conservée"));
    const before = opened.getSnapshot();
    expect(before.phase).toBe("ready");
    expect(before.manifest?.activeWeekId).toBe("P0-S1");
    expect(before.curriculum?.authoredComplement.questions).toHaveLength(6);
    const curriculumObjectId = before.manifest!.curriculumObjectId;
    const journalObjectId = before.manifest!.journalObjectId;
    const weekObjectId = before.manifest!.weeks.find((item) => item.weekId === "P0-S1")!.objectId;
    const manifestSha = store.files.get("vault/v1/manifest.enc.json")!.sha;
    const journalSha = store.files.get(objectPath(journalObjectId))!.sha;
    const weekSha = store.files.get(objectPath(weekObjectId))!.sha;
    await stripProgramRevision(store, curriculumObjectId);

    const putsBefore = store.puts.length;
    const migrated = session(store);
    await migrated.open();
    const snap = migrated.getSnapshot();
    expect(snap.phase).toBe("ready");
    expect(snap.errorMessage).toBeNull();
    expect(snap.curriculum?.programRevision).toBe(current.programRevision);
    expect(snap.curriculum?.inconsistency.summary).toBe(current.inconsistency.summary);
    expect(snap.curriculum?.authoredComplement.questions).toHaveLength(38);
    expect(snap.curriculum?.gaps).toEqual(current.gaps);
    expect(snap.manifest?.activeWeekId).toBe("P0-S1");
    expect(snap.manifest?.curriculumObjectId).toBe(curriculumObjectId);
    expect(snap.manifest?.journalObjectId).toBe(journalObjectId);
    expect(snap.journal?.entries).toEqual(before.journal?.entries);
    expect(snap.weeks["P0-S1"]?.notes).toBe("note-conservée");
    expect(snap.weeks["P0-S1"]?.answers).toEqual([{ questionId: "P0-S1-q-bases", value: { kind: "text", text: "réponse-conservée" } }]);
    expect(snap.weeks["P0-S1"]?.evidence).toHaveLength(1);
    const evidence = snap.weeks["P0-S1"]?.evidence[0];
    if (!evidence || evidence.kind !== "file") throw new Error("preuve absente");
    expect((await migrated.downloadEvidence("P0-S1", evidence.id)).bytes).toEqual(proof);
    expect(store.files.get("vault/v1/manifest.enc.json")!.sha).toBe(manifestSha);
    expect(store.files.get(objectPath(journalObjectId))!.sha).toBe(journalSha);
    expect(store.files.get(objectPath(weekObjectId))!.sha).toBe(weekSha);
    expect(store.puts.slice(putsBefore)).toEqual([objectPath(curriculumObjectId)]);

    const putsAfter = store.puts.length;
    const again = session(store);
    await again.open();
    expect(again.getSnapshot().curriculum?.inconsistency.summary).toBe(current.inconsistency.summary);
    expect(again.getSnapshot().weeks["P0-S1"]?.notes).toBe("note-conservée");
    expect(store.puts).toHaveLength(putsAfter);
  });

  it("enregistre et relit une réponse", async () => {
    const { store, current } = await openReady();
    current.updateWeek("P0-S1", (week) => ({ ...week, notes: "réponse-s1-vecteurs-café" }));
    await current.saveWeek("P0-S1");
    expect(current.getSnapshot().saveStatus).toBe("saved");
    const reloaded = session(store);
    await reloaded.open();
    expect(reloaded.getSnapshot().weeks["P0-S1"]?.notes).toBe("réponse-s1-vecteurs-café");
    const weekRef = reloaded.getSnapshot().manifest?.weeks[0];
    const file = store.files.get(objectPath(weekRef!.objectId))!;
    expect(file.text).not.toContain("réponse-s1-vecteurs-café");
    const envelope = parseEnvelope(JSON.parse(file.text) as unknown);
    const plain = utf8Decode(await openObject(dataKey, envelope));
    expect(plain).toContain("réponse-s1-vecteurs-café");
  });

  it("fusionne deux champs et refuse d’écraser le même champ", async () => {
    const { store, current } = await openReady();
    const other = session(store);
    await other.open();
    current.updateWeek("P0-S1", (week) => ({ ...week, notes: "depuis-A" }));
    await current.saveWeek("P0-S1");
    other.updateWeek("P0-S1", (week) => ({ ...week, writeUp: { ...week.writeUp, learned: "depuis-B" } }));
    await other.saveWeek("P0-S1");
    expect(other.getSnapshot().saveStatus).toBe("saved");
    const merged = session(store);
    await merged.open();
    expect(merged.getSnapshot().weeks["P0-S1"]?.notes).toBe("depuis-A");
    expect(merged.getSnapshot().weeks["P0-S1"]?.writeUp.learned).toBe("depuis-B");

    const left = session(store);
    const right = session(store);
    await left.open();
    await right.open();
    left.updateWeek("P0-S1", (week) => ({ ...week, notes: "version-A" }));
    await left.saveWeek("P0-S1");
    right.updateWeek("P0-S1", (week) => ({ ...week, notes: "version-B" }));
    await right.saveWeek("P0-S1");
    expect(right.getSnapshot().saveStatus).toBe("conflict");
    const remote = session(store);
    await remote.open();
    expect(remote.getSnapshot().weeks["P0-S1"]?.notes).toBe("version-A");
    right.resolveConflict("notes", "local");
    await right.saveWeek("P0-S1");
    const chosen = session(store);
    await chosen.open();
    expect(chosen.getSnapshot().weeks["P0-S1"]?.notes).toBe("version-B");
    expect(chosen.getSnapshot().weeks["P0-S1"]?.writeUp.learned).toBe("depuis-B");
  });

  it("additionne le journal par identifiant", async () => {
    const { store, current } = await openReady();
    const other = session(store);
    await other.open();
    await current.addJournalEntry(entry("11111111-1111-4111-8111-111111111111", 30, "matrice"));
    await other.addJournalEntry(entry("22222222-2222-4222-8222-222222222222", 20, "pointeurs"));
    const reloaded = session(store);
    await reloaded.open();
    expect(minutesEntered(reloaded.getSnapshot().journal!)).toBe(50);
    expect(reloaded.getSnapshot().manifest?.completedMinutes).toBe(50);
  });

  it("ne crée rien sur 401 ou 404 de dépôt", async () => {
    for (const code of ["unauthorized", "not_found"] as const) {
      const store = new MemoryContents();
      store.failRepo = new GitHubRequestError(code, code === "unauthorized" ? 401 : 404);
      const current = session(store);
      await current.open();
      expect(current.getSnapshot().phase).toBe("error");
      expect(current.getSnapshot().errorMessage).not.toContain("token");
      expect(store.puts).toEqual([]);
    }
  });

  it("garde le brouillon chiffré hors ligne", async () => {
    const drafts = new MemoryDraftStore();
    const { store } = await openReady();
    const offline = session(store, drafts);
    await offline.open();
    offline.updateWeek("P0-S1", (week) => ({ ...week, notes: "brouillon-café" }));
    await offline.flushDrafts();
    store.offline = true;
    await offline.saveWeek("P0-S1");
    expect(offline.getSnapshot().saveStatus).toBe("offline");
    expect([...store.files.values()].map((file) => file.text).join("\n")).not.toContain("brouillon-café");
    expect([...drafts["values" as never] ?? []]).toBeDefined();
    const raw = await drafts.get("week:P0-S1");
    expect(raw).toBeTruthy();
    expect(raw).not.toContain("brouillon-café");
    store.offline = false;
    await offline.saveWeek("P0-S1");
    const reloaded = session(store);
    await reloaded.open();
    expect(reloaded.getSnapshot().weeks["P0-S1"]?.notes).toBe("brouillon-café");
  });

  it("chiffre une pièce jointe en plusieurs morceaux", async () => {
    const { store, current } = await openReady();
    const bytes = Uint8Array.from({ length: 300 * 1024 }, (_, index) => index % 251);
    const before = store.puts.length;
    await current.uploadEvidence("P0-S1", { filename: "preuve secrète.txt", mimeType: "text/plain", bytes });
    await current.saveWeek("P0-S1");
    const week = parseWeekRecord(current.getSnapshot().weeks["P0-S1"]);
    const file = week.evidence.find((item) => item.kind === "file");
    if (!file || file.kind !== "file") throw new Error("preuve absente");
    expect(file.chunkObjectIds).toHaveLength(2);
    expect(file.filename).toBe("preuve secrète.txt");
    for (const path of store.puts.slice(before)) expect(path).not.toContain("preuve");
    for (const chunkId of file.chunkObjectIds) {
      expect(store.files.get(objectPath(chunkId))!.text).not.toContain("preuve secrète");
    }
    const downloaded = await current.downloadEvidence("P0-S1", file.id);
    expect(downloaded.filename).toBe("preuve secrète.txt");
    expect(downloaded.bytes).toEqual(bytes);
    await expect(current.uploadEvidence("P0-S1", { filename: "trop.bin", mimeType: "application/octet-stream", bytes: new Uint8Array(10 * 1024 * 1024 + 1) })).rejects.toThrow(/10 Mio/);
  });

  it("reprend un brouillon non envoyé", async () => {
    const drafts = new MemoryDraftStore();
    const { store, current } = await openReady();
    void current;
    const editing = session(store, drafts);
    await editing.open();
    editing.updateWeek("P0-S1", (week) => ({ ...week, notes: "pas encore sur GitHub" }));
    await editing.flushDrafts();
    const resumed = session(store, drafts);
    await resumed.open();
    expect(resumed.getSnapshot().weeks["P0-S1"]?.notes).toBe("pas encore sur GitHub");
    expect(resumed.getSnapshot().saveStatus).toBe("dirty");
  });

  it("se résume sans imprimer la clé", async () => {
    const { store, current } = await openReady();
    current.updateWeek("P0-S1", (week) => ({
      ...week,
      notes: "note-lue",
      objectives: week.objectives.map((item, index) => (index === 0 ? { ...item, selfAssessment: "declared" } : item)),
    }));
    await current.saveWeek("P0-S1");
    const dir = join(tmpdir(), `rover-notes-${Date.now()}`);
    mkdirSync(join(dir, "vault/v1/objects"), { recursive: true });
    for (const [path, file] of store.files) {
      const target = join(dir, path);
      mkdirSync(join(target, ".."), { recursive: true });
      writeFileSync(target, file.text);
    }
    const summary = await summarizeVault({
      dataKey,
      week: "P0-S1",
      read: async (path) => {
        try {
          const text = readFileSync(join(dir, path), "utf8");
          return { text, sha: "sha-test" };
        } catch {
          return null;
        }
      },
    });
    expect(summary.weeks[0]?.notes).toBe("note-lue");
    expect(summary.weeks[0]?.objectives[0]?.selfAssessment).toBe("declared");
    expect(summary.note).toMatch(/auto-évaluations/);
    expect(JSON.stringify(summary)).not.toContain(Buffer.from(dataKey).toString("base64"));
  });
});

async function stripProgramRevision(store: MemoryContents, objectId: string): Promise<void> {
  const path = objectPath(objectId);
  const file = store.files.get(path);
  if (!file) throw new Error("programme absent");
  const envelope = parseEnvelope(JSON.parse(file.text) as unknown);
  const plain = JSON.parse(utf8Decode(await openObject(dataKey, envelope))) as Record<string, unknown>;
  delete plain.programRevision;
  const resealed = await sealObject(dataKey, "k1", objectId, utf8(canonicalJson(plain)));
  store.files.set(path, { sha: file.sha, text: serializeEnvelope(resealed) });
}

function entry(id: string, minutes: number, summary: string) {
  return {
    id,
    weekId: "P0-S1",
    kind: "study_session" as const,
    localDate: "2026-11-08",
    timezone: "Europe/Paris" as const,
    minutes,
    summary,
    evidenceIds: [],
    recordedAt: parisTimestamp(new Date("2026-11-08T12:00:00Z")),
  };
}
