import { decodeBase64, encodeBase64, utf8 } from "../crypto/bytes";

export interface StoredFile {
  sha: string;
  text: string;
}

export interface ContentsStore {
  getRepo(): Promise<void>;
  getFile(path: string): Promise<StoredFile | null>;
  putFile(path: string, text: string, sha: string | null): Promise<{ sha: string }>;
}

export type GitHubCode = "unauthorized" | "forbidden" | "not_found" | "conflict" | "unprocessable" | "network" | "http";

export class GitHubRequestError extends Error {
  readonly name = "GitHubRequestError";
  constructor(
    readonly code: GitHubCode,
    readonly status: number,
  ) {
    super(messageFor(code, status));
  }
}

export function isConflictError(error: unknown): boolean {
  return error instanceof GitHubRequestError && (error.code === "conflict" || error.code === "unprocessable");
}

export function isNetworkError(error: unknown): boolean {
  return error instanceof GitHubRequestError && error.code === "network";
}

export class GitHubContents implements ContentsStore {
  private chain: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly options: {
      owner: string;
      repo: string;
      branch: string;
      token: string;
      fetchImpl?: typeof fetch;
    },
  ) {}

  getRepo(): Promise<void> {
    return this.enqueue(async () => {
      await this.request(`/repos/${encodeURIComponent(this.options.owner)}/${encodeURIComponent(this.options.repo)}`);
    });
  }

  getFile(path: string): Promise<StoredFile | null> {
    return this.enqueue(async () => {
      try {
        const body = await this.request(this.contentsPath(path));
        const sha = typeof body.sha === "string" ? body.sha : "";
        const content = typeof body.content === "string" ? body.content : "";
        if (!sha || !content) throw new GitHubRequestError("http", 200);
        const text = new TextDecoder().decode(decodeBase64(content.replace(/\s/g, "")));
        return { sha, text };
      } catch (error) {
        if (error instanceof GitHubRequestError && error.code === "not_found") return null;
        throw error;
      }
    });
  }

  putFile(path: string, text: string, sha: string | null): Promise<{ sha: string }> {
    return this.enqueue(async () => {
      const body = await this.request(this.contentsPath(path), {
        method: "PUT",
        body: JSON.stringify({
          message: "vault: update",
          content: encodeBase64(utf8(text)),
          branch: this.options.branch,
          ...(sha ? { sha } : {}),
        }),
      });
      const content = body.content;
      const next = typeof content === "object" && content !== null ? (content as { sha?: unknown }).sha : undefined;
      if (typeof next !== "string" || !next) throw new GitHubRequestError("http", 200);
      return { sha: next };
    });
  }

  private contentsPath(path: string): string {
    const encoded = path.split("/").map((part) => encodeURIComponent(part)).join("/");
    const ref = encodeURIComponent(this.options.branch);
    return `/repos/${encodeURIComponent(this.options.owner)}/${encodeURIComponent(this.options.repo)}/contents/${encoded}?ref=${ref}`;
  }

  private async request(path: string, init?: { method?: string; body?: string }): Promise<Record<string, unknown>> {
    const fetchImpl = this.options.fetchImpl ?? fetch;
    let response: Response;
    try {
      response = await fetchImpl(`https://api.github.com${path}`, {
        method: init?.method ?? "GET",
        cache: "no-store",
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${this.options.token}`,
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "rover-notes",
          ...(init?.body ? { "Content-Type": "application/json" } : {}),
        },
        body: init?.body,
      });
    } catch {
      throw new GitHubRequestError("network", 0);
    }
    if (response.status === 404) throw new GitHubRequestError("not_found", 404);
    if (!response.ok) {
      await response.text();
      throw new GitHubRequestError(codeFor(response.status), response.status);
    }
    const json: unknown = await response.json();
    if (typeof json !== "object" || json === null) throw new GitHubRequestError("http", response.status);
    return json as Record<string, unknown>;
  }

  private enqueue<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.chain.then(fn, fn);
    this.chain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }
}

function codeFor(status: number): GitHubCode {
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 409) return "conflict";
  if (status === 422) return "unprocessable";
  return "http";
}

function messageFor(code: GitHubCode, status: number): string {
  switch (code) {
    case "unauthorized":
      return "Accès refusé (401). Le jeton a expiré ou n’est plus accepté.";
    case "forbidden":
      return "Accès refusé (403). Le jeton n’a pas le droit Contents sur le dépôt de données.";
    case "not_found":
      return "Dépôt de données introuvable ou non autorisé (404). Ce n’est pas un coffre vide : rien n’a été créé.";
    case "conflict":
    case "unprocessable":
      return "Conflit d’écriture. La copie distante a été relue.";
    case "network":
      return "Hors ligne ou réseau interrompu. Le brouillon chiffré reste sur cet appareil, sans la clé.";
    case "http":
      return `GitHub a répondu ${status}. Aucune écriture n’est confirmée.`;
    default: {
      const neverCode: never = code;
      return neverCode;
    }
  }
}
