import { aesGcmDecrypt, aesGcmEncrypt } from "./aead";
import { decodeBase64, encodeBase64, randomBytes, utf8 } from "./bytes";
import { ConfigurationError, IntegrityError } from "./errors";
import { assertKdfV1, deriveObjectKey, deriveUnlockKey, type KdfParams } from "./kdf";

export const KEY_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
export const OBJECT_ID_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;

export type VaultEnvelope = {
  version: 1;
  keyId: string;
  objectId: string;
  nonce: string;
  ciphertext: string;
};

export type SecretsFile = {
  version: 1;
  kdf: KdfParams;
  blob: { salt: string; nonce: string; ciphertext: string };
};

export type BootstrapPayload = {
  username: string;
  pat: string;
  repoOwner: string;
  repoName: string;
  branch: string;
  keyId: string;
  dataKey: Uint8Array;
  vaultManifestPath: string;
};

export function normalizeUsername(input: string): string {
  return input.normalize("NFC").trim();
}

export function objectAad(keyId: string, objectId: string): Uint8Array {
  return utf8(JSON.stringify(["rover-notes", 1, keyId, objectId]));
}

export function bootstrapAad(): Uint8Array {
  return utf8(JSON.stringify(["rover-notes", "secrets", 1]));
}

export function assertKeyId(keyId: string): void {
  if (!KEY_ID_PATTERN.test(keyId)) throw new IntegrityError();
}

export function assertObjectId(objectId: string): void {
  if (!OBJECT_ID_PATTERN.test(objectId)) throw new IntegrityError();
}

export function serializeEnvelope(envelope: VaultEnvelope): string {
  return JSON.stringify({
    version: envelope.version,
    keyId: envelope.keyId,
    objectId: envelope.objectId,
    nonce: envelope.nonce,
    ciphertext: envelope.ciphertext,
  });
}

export function parseEnvelope(value: unknown): VaultEnvelope {
  try {
    if (!isRecord(value)) throw new IntegrityError();
    if (value.version !== 1) throw new IntegrityError();
    if (typeof value.keyId !== "string" || typeof value.objectId !== "string") throw new IntegrityError();
    if (typeof value.nonce !== "string" || typeof value.ciphertext !== "string") throw new IntegrityError();
    assertKeyId(value.keyId);
    assertObjectId(value.objectId);
    const nonce = decodeBase64(value.nonce);
    const ciphertext = decodeBase64(value.ciphertext);
    if (nonce.byteLength !== 12 || ciphertext.byteLength < 16) throw new IntegrityError();
    return {
      version: 1,
      keyId: value.keyId,
      objectId: value.objectId,
      nonce: value.nonce,
      ciphertext: value.ciphertext,
    };
  } catch (error) {
    if (error instanceof IntegrityError) throw error;
    throw new IntegrityError();
  }
}

export async function sealObject(
  dataKey: Uint8Array,
  keyId: string,
  objectId: string,
  plaintext: Uint8Array,
  nonce: Uint8Array = randomBytes(12),
): Promise<VaultEnvelope> {
  assertKeyId(keyId);
  assertObjectId(objectId);
  const objectKey = await deriveObjectKey(dataKey, keyId, objectId);
  try {
    const ciphertext = await aesGcmEncrypt(objectKey, nonce, plaintext, objectAad(keyId, objectId));
    return {
      version: 1,
      keyId,
      objectId,
      nonce: encodeBase64(nonce),
      ciphertext: encodeBase64(ciphertext),
    };
  } finally {
    objectKey.fill(0);
  }
}

export async function openObject(dataKey: Uint8Array, envelope: VaultEnvelope): Promise<Uint8Array> {
  const parsed = parseEnvelope(envelope);
  const objectKey = await deriveObjectKey(dataKey, parsed.keyId, parsed.objectId);
  try {
    return await aesGcmDecrypt(
      objectKey,
      decodeBase64(parsed.nonce),
      decodeBase64(parsed.ciphertext),
      objectAad(parsed.keyId, parsed.objectId),
    );
  } finally {
    objectKey.fill(0);
  }
}

export function parseSecretsFile(value: unknown): SecretsFile {
  if (!isRecord(value) || value.version !== 1 || !isRecord(value.kdf) || !isRecord(value.blob)) {
    throw new ConfigurationError("Bundle d’amorçage illisible.");
  }
  const kdf = value.kdf;
  const blob = value.blob;
  if (
    kdf.name !== "argon2id" ||
    typeof kdf.memoryKiB !== "number" ||
    typeof kdf.iterations !== "number" ||
    typeof kdf.parallelism !== "number" ||
    typeof kdf.outputBytes !== "number" ||
    typeof blob.salt !== "string" ||
    typeof blob.nonce !== "string" ||
    typeof blob.ciphertext !== "string"
  ) {
    throw new ConfigurationError("Bundle d’amorçage illisible.");
  }
  const params: KdfParams = {
    name: "argon2id",
    memoryKiB: kdf.memoryKiB,
    iterations: kdf.iterations,
    parallelism: kdf.parallelism,
    outputBytes: kdf.outputBytes,
  };
  assertKdfV1(params);
  try {
    const salt = decodeBase64(blob.salt);
    const nonce = decodeBase64(blob.nonce);
    const ciphertext = decodeBase64(blob.ciphertext);
    if (salt.byteLength !== 16 || nonce.byteLength !== 12 || ciphertext.byteLength < 16) {
      throw new ConfigurationError("Bundle d’amorçage illisible.");
    }
  } catch (error) {
    if (error instanceof ConfigurationError) throw error;
    throw new ConfigurationError("Bundle d’amorçage illisible.");
  }
  return { version: 1, kdf: params, blob: { salt: blob.salt, nonce: blob.nonce, ciphertext: blob.ciphertext } };
}

export async function sealBootstrap(
  payload: BootstrapPayload,
  password: string,
  options?: { salt?: Uint8Array; nonce?: Uint8Array },
): Promise<SecretsFile> {
  const salt = options?.salt ?? randomBytes(16);
  const nonce = options?.nonce ?? randomBytes(12);
  const kdf: KdfParams = {
    name: "argon2id",
    memoryKiB: 19456,
    iterations: 2,
    parallelism: 1,
    outputBytes: 32,
  };
  const key = await deriveUnlockKey(password, salt, kdf);
  try {
    const plaintext = utf8(JSON.stringify(serializePayload(payload)));
    const ciphertext = await aesGcmEncrypt(key, nonce, plaintext, bootstrapAad());
    return {
      version: 1,
      kdf,
      blob: {
        salt: encodeBase64(salt),
        nonce: encodeBase64(nonce),
        ciphertext: encodeBase64(ciphertext),
      },
    };
  } finally {
    key.fill(0);
  }
}

export async function openBootstrap(
  file: SecretsFile,
  password: string,
  username: string,
): Promise<BootstrapPayload | null> {
  const parsed = parseSecretsFile(file);
  let key: Uint8Array | null = null;
  try {
    key = await deriveUnlockKey(password, decodeBase64(parsed.blob.salt), parsed.kdf);
    const plain = await aesGcmDecrypt(
      key,
      decodeBase64(parsed.blob.nonce),
      decodeBase64(parsed.blob.ciphertext),
      bootstrapAad(),
    );
    const json: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(plain));
    const payload = readPayload(json);
    if (!payload) return null;
    if (payload.username !== normalizeUsername(username)) return null;
    return payload;
  } catch (error) {
    if (error instanceof ConfigurationError) throw error;
    return null;
  } finally {
    key?.fill(0);
  }
}

function serializePayload(payload: BootstrapPayload): Record<string, string> {
  return {
    username: normalizeUsername(payload.username),
    pat: payload.pat,
    repoOwner: payload.repoOwner,
    repoName: payload.repoName,
    branch: payload.branch,
    keyId: payload.keyId,
    dataKey: encodeBase64(payload.dataKey),
    vaultManifestPath: payload.vaultManifestPath,
  };
}

export function readPayload(value: unknown): BootstrapPayload | null {
  if (!isRecord(value)) return null;
  const keys = ["username", "pat", "repoOwner", "repoName", "branch", "keyId", "dataKey", "vaultManifestPath"];
  if (Object.keys(value).length !== keys.length || keys.some((key) => typeof value[key] !== "string")) return null;
  const username = normalizeUsername(value.username as string);
  const pat = value.pat as string;
  const repoOwner = value.repoOwner as string;
  const repoName = value.repoName as string;
  const branch = value.branch as string;
  const keyId = value.keyId as string;
  const vaultManifestPath = value.vaultManifestPath as string;
  if (!username || username.length > 80 || /[\u0000-\u001f]/.test(username)) return null;
  if (!pat || pat.length > 300) return null;
  if (!/^[A-Za-z0-9_.-]+$/.test(repoOwner) || !/^[A-Za-z0-9_.-]+$/.test(repoName)) return null;
  if (!branch || branch.length > 200 || /[\s\u0000-\u001f]/.test(branch)) return null;
  if (!KEY_ID_PATTERN.test(keyId)) return null;
  if (vaultManifestPath !== "vault/v1/manifest.enc.json") return null;
  let dataKey: Uint8Array;
  try {
    dataKey = decodeBase64(value.dataKey as string);
  } catch {
    return null;
  }
  if (dataKey.byteLength !== 32) return null;
  return { username, pat, repoOwner, repoName, branch, keyId, dataKey, vaultManifestPath };
}

export function parseDataKey(value: string): Uint8Array {
  const trimmed = value.trim();
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    const out = new Uint8Array(32);
    for (let index = 0; index < 32; index += 1) out[index] = Number.parseInt(trimmed.slice(index * 2, index * 2 + 2), 16);
    return out;
  }
  const bytes = decodeBase64(trimmed);
  if (bytes.byteLength !== 32) throw new ConfigurationError("SYNC_DATA_KEY doit faire 32 octets.");
  return bytes;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
