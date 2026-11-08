import { utf8, utf8Decode } from "../crypto/bytes";
import { openObject, parseEnvelope, sealObject, serializeEnvelope } from "../crypto/envelope";
import { canonicalJson } from "../domain/json";
import { MANIFEST_PATH, newObjectId, objectPath } from "../domain/limits";
import {
  conflictLabel,
  mergeJournal,
  mergeManifest,
  mergeWeek,
  weekConflictText,
  type JournalConflict,
  type ManifestConflict,
  type WeekConflict,
} from "../domain/merge";
import { emptyJournal, emptyWeek, initialManifest, sameWeekContent } from "../domain/records";
import {
  minutesEntered,
  parseJournal,
  parseManifest,
  parseWeekRecord,
  sanitizeStoredFilename,
  type Journal,
  type JournalEntry,
  type Manifest,
  type WeekRecord,
} from "../domain/schemas";
import { parisTimestamp } from "../domain/time";
import { packagedCurriculumWins, parseCurriculumDocument, type CurriculumDocument } from "../domain/curriculumDocument";
import { GitHubRequestError, isConflictError, isNetworkError, type ContentsStore } from "../github/client";
import { sha256Hex } from "../crypto/bytes";
import { splitFile } from "./chunks";
import { draftObjectId, type DraftStore } from "./drafts";

export type SaveStatus = "saved" | "dirty" | "saving" | "conflict" | "offline";

export type ConflictView = { key: string; label: string; localText: string; remoteText: string };

export type Snapshot = {
  phase: "loading" | "ready" | "error";
  errorMessage: string | null;
  saveStatus: SaveStatus;
  saveDetail: string | null;
  draftsPersistent: boolean;
  manifest: Manifest | null;
  curriculum: CurriculumDocument | null;
  journal: Journal | null;
  weeks: Record<string, WeekRecord>;
  activeWeekId: string | null;
  conflicts: ConflictView[];
};

type WeekSlot = { objectId: string; sha: string; base: WeekRecord; draft: WeekRecord };

type Pending =
  | {
      domain: "week";
      weekId: string;
      remoteSha: string;
      remoteRevision: number;
      conflicts: WeekConflict[];
      local: WeekRecord;
      remote: WeekRecord;
    }
  | {
      domain: "journal";
      remoteSha: string;
      conflicts: JournalConflict[];
      local: Journal;
      remote: Journal;
    }
  | {
      domain: "manifest";
      remoteSha: string;
      conflicts: ManifestConflict[];
      local: Manifest;
      remote: Manifest;
    };

type Options = {
  client: ContentsStore;
  dataKey: Uint8Array;
  keyId: string;
  seed: () => Promise<CurriculumDocument>;
  drafts: DraftStore;
  now?: () => Date;
  newId?: () => string;
  autosaveMs?: number;
};

export class VaultSession {
  private readonly dataKey: Uint8Array;
  private readonly listeners = new Set<() => void>();
  private snapshot: Snapshot;
  private phase: Snapshot["phase"] = "loading";
  private errorMessage: string | null = null;
  private saveStatus: SaveStatus = "saved";
  private saveDetail: string | null = null;
  private manifest: Manifest | null = null;
  private manifestObjectId = "";
  private manifestSha = "";
  private manifestBase: Manifest | null = null;
  private curriculum: CurriculumDocument | null = null;
  private journal: Journal | null = null;
  private journalBase: Journal | null = null;
  private journalSha = "";
  private readonly weekSlots = new Map<string, WeekSlot>();
  private pending: Pending | null = null;
  private tail: Promise<void> = Promise.resolve();
  private opened: Promise<void> | null = null;
  private draftWrite: Promise<void> = Promise.resolve();
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private disposed = false;

  constructor(private readonly options: Options) {
    this.dataKey = new Uint8Array(options.dataKey);
    this.snapshot = this.compute();
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): Snapshot => this.snapshot;

  open(): Promise<void> {
    if (!this.opened) this.opened = this.enqueue(() => this.openBody());
    return this.opened;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.dataKey.fill(0);
    this.manifest = null;
    this.curriculum = null;
    this.journal = null;
    this.weekSlots.clear();
    this.pending = null;
    this.phase = "error";
    this.errorMessage = null;
    this.snapshot = this.compute();
  }

  async flushDrafts(): Promise<void> {
    await this.draftWrite;
  }

  updateWeek(weekId: string, recipe: (week: WeekRecord) => WeekRecord): void {
    if (this.pending?.conflicts.length) return;
    const slot = this.weekSlots.get(weekId);
    if (!slot) return;
    slot.draft = recipe(structuredClone(slot.draft));
    this.pending = null;
    this.saveStatus = sameWeekContent(slot.base, slot.draft) ? "saved" : "dirty";
    this.saveDetail = null;
    this.rememberWeek(weekId);
    this.schedule(weekId);
    this.touch();
  }

  saveWeek(weekId: string): Promise<void> {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    return this.enqueue(() => this.saveWeekBody(weekId));
  }

  ensureWeek(weekId: string): Promise<void> {
    return this.enqueue(() => this.ensureWeekBody(weekId));
  }

  addJournalEntry(entry: JournalEntry): Promise<void> {
    return this.enqueue(() => this.addJournalBody(entry));
  }

  uploadEvidence(weekId: string, file: { filename: string; mimeType: string; bytes: Uint8Array }): Promise<void> {
    return this.enqueue(() => this.uploadBody(weekId, file));
  }

  async downloadEvidence(weekId: string, evidenceId: string): Promise<{ filename: string; bytes: Uint8Array }> {
    const slot = this.weekSlots.get(weekId);
    const evidence = slot?.draft.evidence.find((item) => item.id === evidenceId);
    if (!evidence) throw new Error("Preuve introuvable");
    if (evidence.kind !== "file") throw new Error("Ce lien se lit dans le coffre, il ne se télécharge pas comme un fichier.");
    const parts: Uint8Array[] = [];
    for (const chunkId of evidence.chunkObjectIds) {
      const file = await this.options.client.getFile(objectPath(chunkId));
      if (!file) throw new Error("Morceau manquant");
      const envelope = parseEnvelope(JSON.parse(file.text) as unknown);
      if (envelope.objectId !== chunkId) throw new Error("Morceau incohérent");
      parts.push(await openObject(this.dataKey, envelope));
    }
    const bytes = concat(parts);
    const hash = await sha256Hex(bytes);
    if (hash !== evidence.sha256 || bytes.byteLength !== evidence.byteLength) throw new Error("Preuve non authentifiée");
    return { filename: evidence.filename, bytes };
  }

  setActiveWeek(weekId: string): Promise<void> {
    return this.enqueue(async () => {
      if (!this.curriculum?.weeks.some((week) => week.id === weekId)) throw new Error("Semaine inconnue");
      await this.ensureWeekBody(weekId);
      await this.updateManifestBody((manifest) => ({ ...manifest, activeWeekId: weekId }));
    });
  }

  setRobotPurchased(value: boolean): Promise<void> {
    return this.enqueue(() => this.updateManifestBody((manifest) => ({ ...manifest, robotPurchased: value })));
  }

  resolveConflict(key: string, choice: "local" | "remote"): void {
    const pending = this.pending;
    if (!pending) return;
    const sourceIsRemote = choice === "remote";
    if (pending.domain === "week") {
      const conflict = pending.conflicts.find((item) => weekKeyOf(item) === key);
      const slot = this.weekSlots.get(pending.weekId);
      if (!conflict || !slot) return;
      applyWeek(slot.draft, conflict, sourceIsRemote ? pending.remote : pending.local);
      pending.conflicts = pending.conflicts.filter((item) => weekKeyOf(item) !== key);
    } else if (pending.domain === "journal" && this.journal) {
      const conflict = pending.conflicts.find((item) => `entry.${item.id}` === key);
      if (!conflict) return;
      applyJournal(this.journal, conflict, sourceIsRemote ? pending.remote : pending.local);
      pending.conflicts = pending.conflicts.filter((item) => item.id !== conflict.id);
    } else if (pending.domain === "manifest" && this.manifest) {
      const conflict = pending.conflicts.find((item) => manifestKey(item) === key);
      if (!conflict) return;
      applyManifest(this.manifest, conflict, sourceIsRemote ? pending.remote : pending.local);
      pending.conflicts = pending.conflicts.filter((item) => manifestKey(item) !== key);
    }
    if (pending.conflicts.length === 0) this.saveStatus = "dirty";
    this.touch();
  }

  retry(): Promise<void> {
    const weekId = this.manifest?.activeWeekId;
    if (!weekId) return Promise.resolve();
    return this.saveWeek(weekId);
  }

  private async openBody(): Promise<void> {
    try {
      await this.options.client.getRepo();
      const manifestFile = await this.options.client.getFile(MANIFEST_PATH);
      if (!manifestFile) await this.initialize();
      else await this.loadManifest(manifestFile.text, manifestFile.sha);
      if (this.phase !== "error") this.phase = "ready";
    } catch (error) {
      this.failOpen(error);
    }
    this.touch();
  }

  private async initialize(): Promise<void> {
    const curriculum = parseCurriculumDocument(await this.options.seed());
    const now = this.now();
    const curriculumId = this.freshId();
    const journalId = this.freshId();
    const weekObjectId = this.freshId();
    const manifestId = this.freshId();
    const active = curriculum.context.activeWeek;
    const week = emptyWeek(curriculum, active, now);
    const journal = emptyJournal();
    const manifest = initialManifest(curriculum, { curriculum: curriculumId, journal: journalId, week: weekObjectId });
    await this.putNew(objectPath(curriculumId), curriculumId, utf8(canonicalJson(curriculum)));
    const journalSha = await this.putNew(objectPath(journalId), journalId, utf8(canonicalJson(journal)));
    const weekSha = await this.putNew(objectPath(weekObjectId), weekObjectId, utf8(canonicalJson(week)));
    try {
      const sha = await this.putNew(MANIFEST_PATH, manifestId, utf8(canonicalJson(manifest)));
      this.installFresh(curriculum, manifest, manifestId, sha, journal, journalSha, week, weekObjectId, weekSha);
    } catch (error) {
      if (!isConflictError(error)) throw error;
      const existing = await this.options.client.getFile(MANIFEST_PATH);
      if (!existing) throw error;
      await this.loadManifest(existing.text, existing.sha);
    }
  }

  private installFresh(
    curriculum: CurriculumDocument,
    manifest: Manifest,
    manifestId: string,
    manifestSha: string,
    journal: Journal,
    journalSha: string,
    week: WeekRecord,
    weekObjectId: string,
    weekSha: string,
  ): void {
    this.curriculum = curriculum;
    this.manifest = manifest;
    this.manifestBase = structuredClone(manifest);
    this.manifestObjectId = manifestId;
    this.manifestSha = manifestSha;
    this.journal = journal;
    this.journalBase = structuredClone(journal);
    this.journalSha = journalSha;
    this.weekSlots.set(week.weekId, {
      objectId: weekObjectId,
      sha: weekSha,
      base: structuredClone(week),
      draft: structuredClone(week),
    });
    this.saveStatus = "saved";
  }

  private async loadManifest(text: string, sha: string): Promise<void> {
    const envelope = parseEnvelope(JSON.parse(text) as unknown);
    const manifest = parseManifest(JSON.parse(utf8Decode(await openObject(this.dataKey, envelope))) as unknown);
    this.manifest = manifest;
    this.manifestBase = structuredClone(manifest);
    this.manifestObjectId = envelope.objectId;
    this.manifestSha = sha;
    const curriculumFile = await this.requireObject(manifest.curriculumObjectId);
    const stored = JSON.parse(utf8Decode(curriculumFile.plain)) as unknown;
    this.curriculum = await this.adoptCurriculum(manifest.curriculumObjectId, curriculumFile.sha, stored);
    const journalFile = await this.requireObject(manifest.journalObjectId);
    this.journal = parseJournal(JSON.parse(utf8Decode(journalFile.plain)) as unknown);
    this.journalBase = structuredClone(this.journal);
    this.journalSha = journalFile.sha;
    await this.hydrateJournalDraft();
    const active = manifest.weeks.find((item) => item.weekId === manifest.activeWeekId);
    if (!active) throw new Error("La semaine en cours n’est pas référencée.");
    await this.loadWeek(active.weekId, active.objectId);
  }

  private async adoptCurriculum(objectId: string, sha: string, stored: unknown): Promise<CurriculumDocument> {
    const packaged = await this.readPackagedCurriculum();
    if (!packaged || !(await packagedCurriculumWins(stored, packaged))) return parseCurriculumDocument(stored);
    const path = objectPath(objectId);
    const plaintext = utf8(canonicalJson(packaged));
    const first = await this.putPlain(path, objectId, plaintext, sha);
    if (first.ok) return packaged;
    const remote = JSON.parse(utf8Decode(await this.decrypt(first.remoteText, objectId))) as unknown;
    if (!(await packagedCurriculumWins(remote, packaged))) return parseCurriculumDocument(remote);
    const second = await this.putPlain(path, objectId, plaintext, first.remoteSha);
    if (!second.ok) throw new Error("Programme du coffre non mis à jour.");
    return packaged;
  }

  private async readPackagedCurriculum(): Promise<CurriculumDocument | null> {
    try {
      return parseCurriculumDocument(await this.options.seed());
    } catch {
      return null;
    }
  }

  private async loadWeek(weekId: string, objectId: string): Promise<void> {
    const file = await this.requireObject(objectId);
    const week = parseWeekRecord(JSON.parse(utf8Decode(file.plain)) as unknown);
    if (week.weekId !== weekId) throw new Error("Semaine incohérente");
    const slot: WeekSlot = { objectId, sha: file.sha, base: structuredClone(week), draft: structuredClone(week) };
    this.weekSlots.set(weekId, slot);
    await this.hydrateWeekDraft(slot);
  }

  private async ensureWeekBody(weekId: string): Promise<void> {
    if (this.weekSlots.has(weekId) || !this.manifest || !this.curriculum) return;
    const existing = this.manifest.weeks.find((item) => item.weekId === weekId);
    if (existing) {
      await this.loadWeek(weekId, existing.objectId);
      this.touch();
      return;
    }
    const objectId = this.freshId();
    const week = emptyWeek(this.curriculum, weekId, this.now());
    const sha = await this.putNew(objectPath(objectId), objectId, utf8(canonicalJson(week)));
    this.weekSlots.set(weekId, { objectId, sha, base: structuredClone(week), draft: structuredClone(week) });
    await this.updateManifestBody((manifest) => ({ ...manifest, weeks: [...manifest.weeks, { weekId, objectId }] }));
  }

  private async saveWeekBody(weekId: string): Promise<void> {
    const slot = this.weekSlots.get(weekId);
    if (!slot) return;
    if (this.pending && this.pending.conflicts.length > 0) return;
    this.saveStatus = "saving";
    this.saveDetail = null;
    this.touch();
    try {
      const resolving = this.pending?.domain === "week" && this.pending.weekId === weekId;
      const sha = resolving ? this.pending!.remoteSha : slot.sha;
      const revision = (resolving && this.pending?.domain === "week" ? this.pending.remoteRevision : slot.base.revision) + 1;
      const payload: WeekRecord = { ...structuredClone(slot.draft), revision, updatedAt: parisTimestamp(this.now()) };
      const first = await this.putPlain(objectPath(slot.objectId), slot.objectId, utf8(canonicalJson(payload)), sha);
      if (first.ok) {
        this.acceptWeek(slot, payload, first.sha);
        return;
      }
      const remote = parseWeekRecord(JSON.parse(utf8Decode(await this.decrypt(first.remoteText, slot.objectId))) as unknown);
      const localBefore = structuredClone(slot.draft);
      const merged = mergeWeek(slot.base, localBefore, remote);
      if (merged.conflicts.length === 0) {
        const again: WeekRecord = { ...merged.value, revision: remote.revision + 1, updatedAt: parisTimestamp(this.now()) };
        const second = await this.putPlain(objectPath(slot.objectId), slot.objectId, utf8(canonicalJson(again)), first.remoteSha);
        if (!second.ok) {
          this.saveStatus = "conflict";
          this.saveDetail = "Le coffre a encore changé. Aucune écriture n’a écrasé la copie distante.";
          this.touch();
          return;
        }
        this.acceptWeek(slot, again, second.sha);
        return;
      }
      slot.draft = merged.value;
      this.pending = {
        domain: "week",
        weekId,
        remoteSha: first.remoteSha,
        remoteRevision: remote.revision,
        conflicts: merged.conflicts,
        local: localBefore,
        remote,
      };
      this.saveStatus = "conflict";
      this.saveDetail = "Deux modifications portent sur le même champ.";
      this.rememberWeek(weekId);
    } catch (error) {
      this.failWrite(error);
    }
    this.touch();
  }

  private acceptWeek(slot: WeekSlot, payload: WeekRecord, sha: string): void {
    slot.base = structuredClone(payload);
    slot.draft = structuredClone(payload);
    slot.sha = sha;
    this.pending = null;
    this.saveStatus = "saved";
    this.saveDetail = null;
    this.rememberWeek(payload.weekId);
    this.touch();
  }

  private async addJournalBody(entry: JournalEntry): Promise<void> {
    if (!this.journal || !this.journalBase) return;
    if (this.pending?.conflicts.length) return;
    const next = parseJournal({ schemaVersion: 1, entries: [...this.journal.entries, entry] });
    this.journal = next;
    this.saveStatus = "saving";
    this.touch();
    try {
      await this.commitJournal();
      if (this.manifest && this.journal) {
        const minutes = minutesEntered(this.journal);
        if (this.manifest.completedMinutes !== minutes) {
          await this.updateManifestBody((manifest) => ({ ...manifest, completedMinutes: minutes }));
        }
      }
    } catch (error) {
      this.failWrite(error);
      this.touch();
    }
  }

  private async commitJournal(): Promise<void> {
    if (!this.journal || !this.manifest) return;
    const resolving = this.pending?.domain === "journal";
    const sha = resolving ? this.pending!.remoteSha : this.journalSha;
    const first = await this.putPlain(
      objectPath(this.manifest.journalObjectId),
      this.manifest.journalObjectId,
      utf8(canonicalJson(this.journal)),
      sha,
    );
    if (first.ok) {
      this.journalBase = structuredClone(this.journal);
      this.journalSha = first.sha;
      this.pending = null;
      this.saveStatus = "saved";
      await this.persist(`journal`, { schemaVersion: 1, kind: "journal", base: this.journalBase, local: this.journal });
      this.touch();
      return;
    }
    const remote = parseJournal(JSON.parse(utf8Decode(await this.decrypt(first.remoteText, this.manifest.journalObjectId))) as unknown);
    const localBefore = structuredClone(this.journal);
    const merged = mergeJournal(this.journalBase ?? remote, localBefore, remote);
    if (merged.conflicts.length === 0) {
      const second = await this.putPlain(
        objectPath(this.manifest.journalObjectId),
        this.manifest.journalObjectId,
        utf8(canonicalJson(merged.value)),
        first.remoteSha,
      );
      if (!second.ok) {
        this.saveStatus = "conflict";
        this.saveDetail = "Le coffre a encore changé. Aucune écriture n’a écrasé la copie distante.";
        this.touch();
        return;
      }
      this.journal = merged.value;
      this.journalBase = structuredClone(merged.value);
      this.journalSha = second.sha;
      this.pending = null;
      this.saveStatus = "saved";
      this.touch();
      return;
    }
    this.journal = merged.value;
    this.pending = { domain: "journal", remoteSha: first.remoteSha, conflicts: merged.conflicts, local: localBefore, remote };
    this.saveStatus = "conflict";
    this.saveDetail = "Deux séances portent le même identifiant avec des contenus différents.";
    this.touch();
  }

  private async updateManifestBody(recipe: (manifest: Manifest) => Manifest): Promise<void> {
    if (!this.manifest || !this.manifestBase) return;
    if (this.pending?.conflicts.length) return;
    this.manifest = recipe(structuredClone(this.manifest));
    const resolving = this.pending?.domain === "manifest";
    const sha = resolving ? this.pending!.remoteSha : this.manifestSha;
    const first = await this.putPlain(MANIFEST_PATH, this.manifestObjectId, utf8(canonicalJson(this.manifest)), sha);
    if (first.ok) {
      this.manifestBase = structuredClone(this.manifest);
      this.manifestSha = first.sha;
      this.pending = null;
      this.saveStatus = "saved";
      this.touch();
      return;
    }
    const remote = parseManifest(JSON.parse(utf8Decode(await this.decrypt(first.remoteText, this.manifestObjectId))) as unknown);
    const localBefore = structuredClone(this.manifest);
    const merged = mergeManifest(this.manifestBase, localBefore, remote);
    merged.value.completedMinutes = this.journal ? minutesEntered(this.journal) : merged.value.completedMinutes;
    if (merged.conflicts.length === 0) {
      const second = await this.putPlain(MANIFEST_PATH, this.manifestObjectId, utf8(canonicalJson(merged.value)), first.remoteSha);
      if (!second.ok) {
        this.saveStatus = "conflict";
        this.saveDetail = "Le coffre a encore changé. Aucune écriture n’a écrasé la copie distante.";
        this.touch();
        return;
      }
      this.manifest = merged.value;
      this.manifestBase = structuredClone(merged.value);
      this.manifestSha = second.sha;
      this.pending = null;
      this.saveStatus = "saved";
      this.touch();
      return;
    }
    this.manifest = merged.value;
    this.pending = { domain: "manifest", remoteSha: first.remoteSha, conflicts: merged.conflicts, local: localBefore, remote };
    this.saveStatus = "conflict";
    this.saveDetail = "Le manifeste a divergé.";
    this.touch();
  }

  private async uploadBody(weekId: string, file: { filename: string; mimeType: string; bytes: Uint8Array }): Promise<void> {
    const slot = this.weekSlots.get(weekId);
    if (!slot) throw new Error("Semaine non ouverte");
    const parts = splitFile(file.bytes);
    const chunkObjectIds: string[] = [];
    for (const part of parts) {
      const chunkId = this.freshId();
      await this.putNew(objectPath(chunkId), chunkId, part);
      chunkObjectIds.push(chunkId);
    }
    const evidenceId = this.freshId();
    const filename = sanitizeStoredFilename(file.filename);
    const mimeType = file.mimeType.replace(/[\u0000-\u001f]/g, "").slice(0, 120) || "application/octet-stream";
    const evidence = {
      id: evidenceId,
      kind: "file" as const,
      filename,
      mimeType,
      byteLength: file.bytes.byteLength,
      sha256: await sha256Hex(file.bytes),
      chunkObjectIds,
    };
    const next = parseWeekRecord({ ...slot.draft, evidence: [...slot.draft.evidence, evidence] });
    slot.draft = next;
    this.saveStatus = "dirty";
    this.saveDetail = null;
    this.rememberWeek(weekId);
    this.touch();
  }

  private async hydrateWeekDraft(slot: WeekSlot): Promise<void> {
    const raw = await this.options.drafts.get(`week:${slot.draft.weekId}`);
    if (!raw) return;
    try {
      const parsed = JSON.parse(utf8Decode(await this.decrypt(raw, await draftObjectId(`week:${slot.draft.weekId}`)))) as {
        base: unknown;
        local: unknown;
      };
      const base = parseWeekRecord(parsed.base);
      const local = parseWeekRecord(parsed.local);
      const merged = mergeWeek(base, local, slot.draft);
      if (merged.conflicts.length > 0) {
        slot.draft = merged.value;
        this.pending = {
          domain: "week",
          weekId: slot.draft.weekId,
          remoteSha: slot.sha,
          remoteRevision: slot.base.revision,
          conflicts: merged.conflicts,
          local,
          remote: structuredClone(slot.base),
        };
        this.saveStatus = "conflict";
        return;
      }
      if (!sameWeekContent(merged.value, slot.base)) {
        slot.draft = { ...merged.value, revision: slot.base.revision, updatedAt: slot.base.updatedAt };
        slot.base = structuredClone(slot.base);
        this.saveStatus = "dirty";
      }
    } catch {
      /* brouillon illisible : on garde le serveur */
    }
  }

  private async hydrateJournalDraft(): Promise<void> {
    if (!this.journal || !this.journalBase) return;
    const raw = await this.options.drafts.get("journal");
    if (!raw) return;
    try {
      const objectId = await draftObjectId("journal");
      const parsed = JSON.parse(utf8Decode(await this.decrypt(raw, objectId))) as { base: unknown; local: unknown };
      const base = parseJournal(parsed.base);
      const local = parseJournal(parsed.local);
      const merged = mergeJournal(base, local, this.journal);
      if (merged.conflicts.length > 0) {
        this.journal = merged.value;
        this.pending = { domain: "journal", remoteSha: this.journalSha, conflicts: merged.conflicts, local, remote: structuredClone(this.journalBase) };
        this.saveStatus = "conflict";
        return;
      }
      if (canonicalJson(merged.value) !== canonicalJson(this.journalBase)) {
        this.journal = merged.value;
        this.saveStatus = "dirty";
      }
    } catch {
      /* ignore */
    }
  }

  private async putNew(path: string, objectId: string, plaintext: Uint8Array): Promise<string> {
    const envelope = await sealObject(this.dataKey, this.options.keyId, objectId, plaintext);
    const result = await this.options.client.putFile(path, serializeEnvelope(envelope), null);
    return result.sha;
  }

  private async putPlain(
    path: string,
    objectId: string,
    plaintext: Uint8Array,
    sha: string | null,
  ): Promise<{ ok: true; sha: string } | { ok: false; remoteText: string; remoteSha: string }> {
    const envelope = await sealObject(this.dataKey, this.options.keyId, objectId, plaintext);
    try {
      const result = await this.options.client.putFile(path, serializeEnvelope(envelope), sha);
      return { ok: true, sha: result.sha };
    } catch (error) {
      if (!isConflictError(error)) throw error;
      const remote = await this.options.client.getFile(path);
      if (!remote) throw error;
      return { ok: false, remoteText: remote.text, remoteSha: remote.sha };
    }
  }

  private async requireObject(objectId: string): Promise<{ plain: Uint8Array; sha: string }> {
    const file = await this.options.client.getFile(objectPath(objectId));
    if (!file) throw new Error("Objet du coffre manquant");
    return { plain: await this.decrypt(file.text, objectId), sha: file.sha };
  }

  private async decrypt(text: string, objectId: string): Promise<Uint8Array> {
    const envelope = parseEnvelope(JSON.parse(text) as unknown);
    if (envelope.objectId !== objectId) throw new Error("Identifiant d’objet incohérent");
    return openObject(this.dataKey, envelope);
  }

  private rememberWeek(weekId: string): void {
    const slot = this.weekSlots.get(weekId);
    if (!slot) return;
    void this.persist(`week:${weekId}`, { schemaVersion: 1, kind: "week", base: slot.base, local: slot.draft });
  }

  private persist(logical: string, payload: unknown): Promise<void> {
    this.draftWrite = this.draftWrite.then(async () => {
      if (this.disposed) return;
      const objectId = await draftObjectId(logical);
      const envelope = await sealObject(this.dataKey, this.options.keyId, objectId, utf8(canonicalJson(payload)));
      await this.options.drafts.set(logical, serializeEnvelope(envelope));
    });
    return this.draftWrite;
  }

  private schedule(weekId: string): void {
    const ms = this.options.autosaveMs ?? 1500;
    if (!ms) return;
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      void this.saveWeek(weekId);
    }, ms);
  }

  private freshId(): string {
    return this.options.newId ? this.options.newId() : newObjectId();
  }

  private now(): Date {
    return this.options.now ? this.options.now() : new Date();
  }

  private failOpen(error: unknown): void {
    this.phase = "error";
    this.errorMessage = error instanceof GitHubRequestError ? error.message : "Ouverture du coffre impossible.";
    if (error instanceof Error && !(error instanceof GitHubRequestError) && /introuvable|Programme/.test(error.message)) {
      this.errorMessage = error.message;
    }
  }

  private failWrite(error: unknown): void {
    if (isNetworkError(error)) {
      this.saveStatus = "offline";
      this.saveDetail = error instanceof Error ? error.message : "Hors ligne";
      return;
    }
    if (error instanceof GitHubRequestError) {
      this.saveStatus = "dirty";
      this.saveDetail = error.message;
      return;
    }
    this.saveStatus = "dirty";
    this.saveDetail = error instanceof Error ? error.message : "Écriture impossible.";
  }

  private enqueue(fn: () => Promise<void>): Promise<void> {
    const run = this.tail.then(fn, fn);
    this.tail = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  private touch(): void {
    if (this.disposed) return;
    this.snapshot = this.compute();
    for (const listener of this.listeners) listener();
  }

  private compute(): Snapshot {
    const weeks: Record<string, WeekRecord> = {};
    for (const [id, slot] of this.weekSlots) weeks[id] = slot.draft;
    return {
      phase: this.phase,
      errorMessage: this.errorMessage,
      saveStatus: this.saveStatus,
      saveDetail: this.saveDetail,
      draftsPersistent: this.options.drafts.persistent,
      manifest: this.manifest,
      curriculum: this.curriculum,
      journal: this.journal,
      weeks,
      activeWeekId: this.manifest?.activeWeekId ?? null,
      conflicts: this.conflictViews(),
    };
  }

  private conflictViews(): ConflictView[] {
    const pending = this.pending;
    if (!pending) return [];
    if (pending.domain === "week") {
      return pending.conflicts.map((conflict) => ({
        key: weekKeyOf(conflict),
        label: conflictLabel(conflict),
        localText: weekConflictText(pending.local, conflict),
        remoteText: weekConflictText(pending.remote, conflict),
      }));
    }
    if (pending.domain === "journal") {
      return pending.conflicts.map((conflict) => ({
        key: `entry.${conflict.id}`,
        label: conflictLabel(conflict),
        localText: canonicalJson(pending.local.entries.find((entry) => entry.id === conflict.id) ?? null),
        remoteText: canonicalJson(pending.remote.entries.find((entry) => entry.id === conflict.id) ?? null),
      }));
    }
    return pending.conflicts.map((conflict) => ({
      key: manifestKey(conflict),
      label: conflictLabel(conflict),
      localText: manifestText(pending.local, conflict),
      remoteText: manifestText(pending.remote, conflict),
    }));
  }
}

function weekKeyOf(conflict: WeekConflict): string {
  switch (conflict.kind) {
    case "writeUp":
      return `writeUp.${conflict.field}`;
    case "objective":
      return `objective.${conflict.id}.${conflict.field}`;
    case "answer":
      return `answer.${conflict.questionId}`;
    case "evidence":
      return `evidence.${conflict.id}`;
    case "notes":
    case "state":
    case "curriculumVersion":
      return conflict.kind;
    default: {
      const neverConflict: never = conflict;
      return neverConflict;
    }
  }
}

function manifestKey(conflict: ManifestConflict): string {
  switch (conflict.kind) {
    case "weekRef":
      return `weekRef.${conflict.weekId}`;
    case "activeWeekId":
    case "robotPurchased":
    case "curriculumVersion":
    case "curriculumObjectId":
    case "journalObjectId":
      return conflict.kind;
    default: {
      const neverConflict: never = conflict;
      return neverConflict;
    }
  }
}

function applyWeek(target: WeekRecord, conflict: WeekConflict, source: WeekRecord): void {
  switch (conflict.kind) {
    case "notes":
      target.notes = source.notes;
      return;
    case "state":
      target.state = source.state;
      return;
    case "curriculumVersion":
      target.curriculumVersion = source.curriculumVersion;
      return;
    case "writeUp":
      target.writeUp = { ...target.writeUp, [conflict.field]: source.writeUp[conflict.field] };
      return;
    case "objective": {
      const found = source.objectives.find((item) => item.id === conflict.id);
      const current = target.objectives.find((item) => item.id === conflict.id);
      if (!found || !current) return;
      if (conflict.field === "selfAssessment") current.selfAssessment = found.selfAssessment;
      else current.explanation = found.explanation;
      return;
    }
    case "answer": {
      target.answers = target.answers.filter((item) => item.questionId !== conflict.questionId);
      const found = source.answers.find((item) => item.questionId === conflict.questionId);
      if (found) target.answers.push(structuredClone(found));
      return;
    }
    case "evidence": {
      target.evidence = target.evidence.filter((item) => item.id !== conflict.id);
      const found = source.evidence.find((item) => item.id === conflict.id);
      if (found) target.evidence.push(structuredClone(found));
      return;
    }
    default: {
      const neverConflict: never = conflict;
      throw new Error(neverConflict);
    }
  }
}

function applyJournal(target: Journal, conflict: JournalConflict, source: Journal): void {
  target.entries = target.entries.filter((entry) => entry.id !== conflict.id);
  const found = source.entries.find((entry) => entry.id === conflict.id);
  if (found) target.entries.push(structuredClone(found));
}

function applyManifest(target: Manifest, conflict: ManifestConflict, source: Manifest): void {
  switch (conflict.kind) {
    case "activeWeekId":
      target.activeWeekId = source.activeWeekId;
      return;
    case "robotPurchased":
      target.robotPurchased = source.robotPurchased;
      return;
    case "curriculumVersion":
      target.curriculumVersion = source.curriculumVersion;
      return;
    case "curriculumObjectId":
      target.curriculumObjectId = source.curriculumObjectId;
      return;
    case "journalObjectId":
      target.journalObjectId = source.journalObjectId;
      return;
    case "weekRef": {
      target.weeks = target.weeks.filter((item) => item.weekId !== conflict.weekId);
      const found = source.weeks.find((item) => item.weekId === conflict.weekId);
      if (found) target.weeks.push(structuredClone(found));
      return;
    }
    default: {
      const neverConflict: never = conflict;
      throw new Error(neverConflict);
    }
  }
}

function manifestText(manifest: Manifest, conflict: ManifestConflict): string {
  switch (conflict.kind) {
    case "activeWeekId":
      return manifest.activeWeekId;
    case "robotPurchased":
      return manifest.robotPurchased ? "oui" : "non";
    case "curriculumVersion":
      return manifest.curriculumVersion;
    case "curriculumObjectId":
      return manifest.curriculumObjectId;
    case "journalObjectId":
      return manifest.journalObjectId;
    case "weekRef":
      return manifest.weeks.find((item) => item.weekId === conflict.weekId)?.objectId ?? "";
    default: {
      const neverConflict: never = conflict;
      return neverConflict;
    }
  }
}

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.byteLength, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.byteLength;
  }
  return out;
}
