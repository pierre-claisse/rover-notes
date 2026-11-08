import { hkdfSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import { aesGcmDecrypt, aesGcmEncrypt } from "../src/crypto/aead";
import { decodeBase64, encodeBase64, utf8 } from "../src/crypto/bytes";
import { ConfigurationError, IntegrityError } from "../src/crypto/errors";
import {
  bootstrapAad,
  normalizeUsername,
  objectAad,
  openBootstrap,
  openObject,
  parseDataKey,
  parseSecretsFile,
  sealBootstrap,
  sealObject,
  type BootstrapPayload,
} from "../src/crypto/envelope";
import { HKDF_SALT_LABEL, deriveObjectKey } from "../src/crypto/kdf";
import { MANIFEST_PATH } from "../src/domain/limits";

const salt = Uint8Array.from({ length: 16 }, (_, index) => index + 1);
const nonce = Uint8Array.from({ length: 12 }, (_, index) => index + 20);
const dataKey = Uint8Array.from({ length: 32 }, (_, index) => index + 3);
const objectId = "aaaaaaaaaaaaaaaaaaaaaa";

function payload(passwordPatch?: Partial<BootstrapPayload>): BootstrapPayload {
  return {
    username: "Ada",
    pat: "fixture-pat-not-a-token",
    repoOwner: "pierre-claisse",
    repoName: "rover-notes-data",
    branch: "main",
    keyId: "k1",
    dataKey,
    vaultManifestPath: MANIFEST_PATH,
    ...passwordPatch,
  };
}

describe("coffre", () => {
  it("normalise l’identifiant et laisse le mot de passe intact", async () => {
    expect(normalizeUsername("  Ada\u0301 ")).toBe("Adá".normalize("NFC"));
    const file = await sealBootstrap(payload({ username: "  Ada  " }), "secret ", { salt, nonce });
    expect(await openBootstrap(file, "secret ", "Ada")).not.toBeNull();
    expect(await openBootstrap(file, "secret", "Ada")).toBeNull();
    expect(await openBootstrap(file, "secret ", "ada")).toBeNull();
    expect(await openBootstrap(file, "secret ", " Adá ")).toBeNull();
  });

  it("accepte une identité NFC équivalente", async () => {
    const file = await sealBootstrap(payload({ username: "É" }), "secret", { salt, nonce });
    expect(await openBootstrap(file, "secret", "E\u0301")).not.toBeNull();
  });

  it("refuse un KDF hors limites avant dérivation", () => {
    expect(() =>
      parseSecretsFile({
        version: 1,
        kdf: { name: "argon2id", memoryKiB: 1_000_000_000, iterations: 2, parallelism: 1, outputBytes: 32 },
        blob: { salt: encodeBase64(salt), nonce: encodeBase64(nonce), ciphertext: encodeBase64(new Uint8Array(32)) },
      }),
    ).toThrow(ConfigurationError);
  });

  it("tourne l’enveloppe sans changer la clé de données", async () => {
    const first = await sealBootstrap(payload(), "ancien-secret", { salt, nonce });
    const opened = await openBootstrap(first, "ancien-secret", "Ada");
    expect(opened?.dataKey).toEqual(dataKey);
    const second = await sealBootstrap(opened!, "nouveau-secret", { salt: Uint8Array.from(salt).map((value) => value + 1), nonce });
    expect(await openBootstrap(first, "ancien-secret", "Ada")).not.toBeNull();
    expect((await openBootstrap(second, "nouveau-secret", "Ada"))?.dataKey).toEqual(dataKey);
    const sealed = await sealObject(dataKey, "k1", objectId, utf8("café — déjà"), nonce);
    expect(new TextDecoder().decode(await openObject(dataKey, sealed))).toBe("café — déjà");
  });

  it("refuse ciphertext, AAD et nonce altérés", async () => {
    const envelope = await sealObject(dataKey, "k1", objectId, utf8("ok"), nonce);
    const flipped = { ...envelope, ciphertext: flip(envelope.ciphertext) };
    await expect(openObject(dataKey, flipped)).rejects.toBeInstanceOf(IntegrityError);
    await expect(openObject(dataKey, { ...envelope, objectId: "bbbbbbbbbbbbbbbbbbbbbb" })).rejects.toBeInstanceOf(IntegrityError);
    await expect(openObject(dataKey, { ...envelope, nonce: encodeBase64(Uint8Array.from(nonce).map((value) => value ^ 1)) })).rejects.toBeInstanceOf(
      IntegrityError,
    );
    await expect(openObject(dataKey, { ...envelope, version: 2 as 1 })).rejects.toBeInstanceOf(IntegrityError);
  });

  it("aligne HKDF sur Node et lie l’AAD", async () => {
    const web = await deriveObjectKey(dataKey, "k1", objectId);
    const node = hkdfSync("sha256", dataKey, Buffer.from(HKDF_SALT_LABEL), Buffer.from(`rover-notes/v1/k1/${objectId}`), 32);
    expect(Buffer.from(web)).toEqual(Buffer.from(node));
    const key = web;
    const aad = objectAad("k1", objectId);
    const ciphertext = await aesGcmEncrypt(key, nonce, utf8("ok"), aad);
    await expect(aesGcmDecrypt(key, nonce, ciphertext, bootstrapAad())).rejects.toBeInstanceOf(IntegrityError);
    expect(parseDataKey(Buffer.from(dataKey).toString("hex"))).toEqual(dataKey);
  });
});

function flip(value: string): string {
  const bytes = decodeBase64(value);
  bytes[0] = bytes[0]! ^ 0xff;
  return encodeBase64(bytes);
}
