import { copyBytes, encodeBase64Url, utf8 } from "../crypto/bytes";

export interface DraftStore {
  readonly persistent: boolean;
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
}

export class MemoryDraftStore implements DraftStore {
  readonly persistent = false;
  private readonly values = new Map<string, string>();

  async get(key: string): Promise<string | null> {
    return this.values.get(key) ?? null;
  }

  async set(key: string, value: string): Promise<void> {
    this.values.set(key, value);
  }
}

export function createBrowserDraftStore(): DraftStore {
  if (typeof indexedDB === "undefined") return new MemoryDraftStore();
  return new IdbDraftStore();
}

export async function draftObjectId(logical: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", copyBytes(utf8(`rover-notes/draft/${logical}`)));
  return encodeBase64Url(new Uint8Array(digest).slice(0, 16));
}

class IdbDraftStore implements DraftStore {
  readonly persistent = true;

  async get(key: string): Promise<string | null> {
    const db = await openDb();
    try {
      return await request<string | undefined>(db.transaction("drafts").objectStore("drafts").get(key)).then((value) => value ?? null);
    } finally {
      db.close();
    }
  }

  async set(key: string, value: string): Promise<void> {
    const db = await openDb();
    try {
      await request(db.transaction("drafts", "readwrite").objectStore("drafts").put(value, key));
    } finally {
      db.close();
    }
  }
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("rover-notes", 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore("drafts");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB"));
  });
}

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB"));
  });
}
