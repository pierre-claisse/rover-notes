import { argon2idAsync } from "@noble/hashes/argon2.js";
import { ConfigurationError, IntegrityError } from "./errors";
import { copyBytes, utf8 } from "./bytes";

export const KDF_V1 = {
  name: "argon2id",
  memoryKiB: 19456,
  iterations: 2,
  parallelism: 1,
  outputBytes: 32,
} as const;

export type KdfParams = {
  name: "argon2id";
  memoryKiB: number;
  iterations: number;
  parallelism: number;
  outputBytes: number;
};

export const HKDF_SALT_LABEL = "rover-notes/hkdf/v1";

export function assertKdfV1(params: KdfParams): void {
  if (
    params.name !== "argon2id" ||
    params.memoryKiB !== KDF_V1.memoryKiB ||
    params.iterations !== KDF_V1.iterations ||
    params.parallelism !== KDF_V1.parallelism ||
    params.outputBytes !== KDF_V1.outputBytes
  ) {
    throw new ConfigurationError("Paramètres KDF hors limites pour la version 1.");
  }
}

export async function deriveUnlockKey(password: string, salt: Uint8Array, params: KdfParams = KDF_V1): Promise<Uint8Array> {
  assertKdfV1(params);
  if (salt.byteLength !== 16) throw new ConfigurationError("Sel d’amorçage hors limites.");
  const derived = await argon2idAsync(utf8(password), copyBytes(salt), {
    t: params.iterations,
    m: params.memoryKiB,
    p: params.parallelism,
    dkLen: params.outputBytes,
  });
  return copyBytes(derived);
}

export function objectInfo(keyId: string, objectId: string): Uint8Array {
  return utf8(`rover-notes/v1/${keyId}/${objectId}`);
}

export async function deriveObjectKey(dataKey: Uint8Array, keyId: string, objectId: string): Promise<Uint8Array> {
  if (dataKey.byteLength !== 32) throw new IntegrityError();
  const base = await crypto.subtle.importKey("raw", copyBytes(dataKey), "HKDF", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: copyBytes(utf8(HKDF_SALT_LABEL)),
      info: copyBytes(objectInfo(keyId, objectId)),
    },
    base,
    256,
  );
  return new Uint8Array(bits);
}
