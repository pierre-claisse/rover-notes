import { describe, expect, it, vi } from "vitest";
import { decodeBase64, utf8Decode } from "../src/crypto/bytes";
import { GitHubContents, GitHubRequestError } from "../src/github/client";

describe("client GitHub", () => {
  it("envoie un message générique, le ref et n’expose pas le jeton", async () => {
    const token = "fixture-pat-not-a-token";
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      expect(url).toContain("ref=main");
      expect(url).not.toContain(token);
      expect(init?.cache).toBe("no-store");
      const headers = new Headers(init?.headers);
      expect(headers.get("Authorization")).toBe(`Bearer ${token}`);
      if (init?.method === "PUT") {
        const body = JSON.parse(String(init.body)) as { message: string; content: string; sha?: string };
        expect(body.message).toBe("vault: update");
        expect(utf8Decode(decodeBase64(body.content))).toBe("{\"chiffre\":true}");
        return jsonResponse({ content: { sha: "blob-2" } }, 201);
      }
      return jsonResponse({ sha: "blob-1", content: encode("{\"chiffre\":true}") });
    });
    const client = new GitHubContents({ owner: "pierre-claisse", repo: "rover-notes-data", branch: "main", token, fetchImpl });
    const file = await client.getFile("vault/v1/manifest.enc.json");
    expect(file?.sha).toBe("blob-1");
    const put = await client.putFile("vault/v1/manifest.enc.json", "{\"chiffre\":true}", "blob-1");
    expect(put.sha).toBe("blob-2");
  });

  it("traduit 401 sans corps de réponse", async () => {
    const fetchImpl = vi.fn(async () => new Response("token=fixture-pat-not-a-token", { status: 401 }));
    const client = new GitHubContents({
      owner: "pierre-claisse",
      repo: "rover-notes-data",
      branch: "main",
      token: "fixture-pat-not-a-token",
      fetchImpl,
    });
    await expect(client.getRepo()).rejects.toBeInstanceOf(GitHubRequestError);
    try {
      await client.getRepo();
    } catch (error) {
      expect(error instanceof Error ? error.message : "").not.toContain("fixture-pat");
    }
  });
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function encode(value: string) {
  return Buffer.from(value, "utf8").toString("base64");
}
