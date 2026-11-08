export const MANIFEST_PATH = "vault/v1/manifest.enc.json";
export const OBJECTS_PREFIX = "vault/v1/objects/";
export const CURRICULUM_VERSION = "initial-canvas-import-v1";
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const CHUNK_BYTES = 256 * 1024;
export const IDLE_LOCK_MS = 15 * 60 * 1000;
export const DEFAULT_REPO_OWNER = "pierre-claisse";
export const DEFAULT_REPO_NAME = "rover-notes-data";
export const DEFAULT_BRANCH = "main";
export const DEFAULT_KEY_ID = "k1";

export function objectPath(objectId: string): string {
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(objectId)) throw new Error("Identifiant d’objet refusé");
  return `${OBJECTS_PREFIX}${objectId}.enc.json`;
}

export function newObjectId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}
