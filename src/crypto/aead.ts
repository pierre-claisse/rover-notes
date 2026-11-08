import { copyBytes } from "./bytes";
import { IntegrityError } from "./errors";

export async function aesGcmEncrypt(
  keyBytes: Uint8Array,
  nonce: Uint8Array,
  plaintext: Uint8Array,
  aad: Uint8Array,
): Promise<Uint8Array> {
  if (keyBytes.byteLength !== 32 || nonce.byteLength !== 12) throw new IntegrityError();
  const key = await crypto.subtle.importKey("raw", copyBytes(keyBytes), { name: "AES-GCM" }, false, ["encrypt"]);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: copyBytes(nonce), additionalData: copyBytes(aad), tagLength: 128 },
    key,
    copyBytes(plaintext),
  );
  return new Uint8Array(ciphertext);
}

export async function aesGcmDecrypt(
  keyBytes: Uint8Array,
  nonce: Uint8Array,
  ciphertext: Uint8Array,
  aad: Uint8Array,
): Promise<Uint8Array> {
  if (keyBytes.byteLength !== 32 || nonce.byteLength !== 12 || ciphertext.byteLength < 16) {
    throw new IntegrityError();
  }
  try {
    const key = await crypto.subtle.importKey("raw", copyBytes(keyBytes), { name: "AES-GCM" }, false, ["decrypt"]);
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: copyBytes(nonce), additionalData: copyBytes(aad), tagLength: 128 },
      key,
      copyBytes(ciphertext),
    );
    return new Uint8Array(plain);
  } catch {
    throw new IntegrityError();
  }
}
