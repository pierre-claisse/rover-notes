import { execFile } from "node:child_process";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { utf8Decode } from "../src/crypto/bytes";
import { openBootstrap, openObject, parseEnvelope, parseSecretsFile } from "../src/crypto/envelope";

describe("amorçage", () => {
  it("échoue fermé quand les secrets de production manquent", async () => {
    const result = await run(["scripts/build-secrets.mjs"], {
      REQUIRE_SYNC_SECRETS: "1",
      SYNC_PAT: "",
      SYNC_PASSWORD: "",
      SYNC_USERNAME: "",
      SYNC_DATA_KEY: "",
    });
    expect(result.code).not.toBe(0);
    expect(result.stderr).toContain("SYNC_PAT");
    expect(result.stderr).toContain("SYNC_PASSWORD");
    expect(result.stderr).toContain("SYNC_DATA_KEY");
    expect(result.stderr).not.toContain("fixture-unlock-phrase");
  });

  it("écrit un bundle sans le mot de passe en clair", async () => {
    const dir = await mkdtemp(join(tmpdir(), "rover-secrets-"));
    const password = "fixture-unlock-phrase-rover-notes";
    const pat = "fixture-pat-not-a-token";
    const dataKey = Buffer.alloc(32, 7).toString("base64");
    const result = await run(["scripts/build-secrets.mjs", "--out", dir], {
      SYNC_PAT: pat,
      SYNC_PASSWORD: password,
      SYNC_USERNAME: "Ada",
      SYNC_DATA_KEY: dataKey,
    });
    expect(result.code).toBe(0);
    const secretsText = await readFile(join(dir, "secrets.json"), "utf8");
    const seedText = await readFile(join(dir, "curriculum.seed.enc.json"), "utf8");
    expect(secretsText).not.toContain(password);
    expect(secretsText).not.toContain(pat);
    expect(seedText).not.toContain("Je sais écrire sans IA");
    const opened = await openBootstrap(parseSecretsFile(JSON.parse(secretsText) as unknown), password, "Ada");
    expect(opened?.pat).toBe(pat);
    const plain = utf8Decode(await openObject(opened!.dataKey, parseEnvelope(JSON.parse(seedText) as unknown)));
    expect(plain).toContain("P0-S1");
    opened?.dataKey.fill(0);
  });
});

function run(args: string[], env: Record<string, string>): Promise<{ code: number; stderr: string }> {
  return new Promise((resolve) => {
    execFile("npx", ["tsx", ...args], { env: { ...process.env, ...env } }, (error, _stdout, stderr) => {
      const code = error && typeof error === "object" && "code" in error && typeof error.code === "number" ? error.code : 0;
      resolve({ code, stderr });
    });
  });
}
