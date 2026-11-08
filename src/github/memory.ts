import { GitHubRequestError, type ContentsStore, type StoredFile } from "./client";

export class MemoryContents implements ContentsStore {
  readonly files = new Map<string, StoredFile>();
  failRepo: GitHubRequestError | null = null;
  offline = false;
  readonly puts: string[] = [];
  private counter = 0;

  async getRepo(): Promise<void> {
    if (this.offline) throw new GitHubRequestError("network", 0);
    if (this.failRepo) throw this.failRepo;
  }

  async getFile(path: string): Promise<StoredFile | null> {
    if (this.offline) throw new GitHubRequestError("network", 0);
    return this.files.get(path) ?? null;
  }

  async putFile(path: string, text: string, sha: string | null): Promise<{ sha: string }> {
    if (this.offline) throw new GitHubRequestError("network", 0);
    const current = this.files.get(path);
    if (sha === null) {
      if (current) throw new GitHubRequestError("conflict", 409);
    } else if (!current || current.sha !== sha) {
      throw new GitHubRequestError("conflict", 409);
    }
    this.counter += 1;
    const next = { sha: `sha-${this.counter}`, text };
    this.files.set(path, next);
    this.puts.push(path);
    return { sha: next.sha };
  }
}
