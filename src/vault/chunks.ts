import { CHUNK_BYTES, MAX_FILE_BYTES } from "../domain/limits";

export class FileTooLargeError extends Error {
  readonly name = "FileTooLargeError";
  constructor() {
    super("Fichier trop volumineux (maximum 10 Mio).");
  }
}

export function splitFile(bytes: Uint8Array): Uint8Array[] {
  if (bytes.byteLength > MAX_FILE_BYTES) throw new FileTooLargeError();
  const parts: Uint8Array[] = [];
  for (let offset = 0; offset < bytes.byteLength; offset += CHUNK_BYTES) {
    parts.push(bytes.subarray(offset, Math.min(bytes.byteLength, offset + CHUNK_BYTES)));
  }
  return parts;
}
