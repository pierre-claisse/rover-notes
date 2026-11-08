import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { sha256Hex, utf8 } from "../crypto/bytes";
import { openBootstrap, parseSecretsFile } from "../crypto/envelope";
import { summaryMarkdown, summarizeVault } from "./summarize";

export async function main(argv: string[]): Promise<number> {
  if (argv.includes("--password") || argv.some((arg) => arg.startsWith("--password="))) {
    throw new Error("Ne passez pas le mot de passe en argument.");
  }
  if (argv.includes("--help")) {
    process.stdout.write(
      "Usage: read-progress --secrets <fichier> [--fixture-dir <dossier> | lecture gh] [--week <id|all>] [--format json|md] [--verify-evidence]\n",
    );
    return 0;
  }
  const secretsPath = flag(argv, "--secrets");
  if (!secretsPath) throw new Error("Indiquez --secrets.");
  const format = flag(argv, "--format") ?? "json";
  if (format !== "json" && format !== "md") throw new Error("Format refusé.");
  const password = await readPassword();
  const file = parseSecretsFile(JSON.parse(readFileSync(secretsPath, "utf8")) as unknown);
  const payload = await openBootstrap(file, password, await usernameFromPrompt(argv));
  if (!payload) throw new Error("Déverrouillage refusé.");
  const dataKey = payload.dataKey;
  const owner = payload.repoOwner;
  const repo = payload.repoName;
  const branch = payload.branch;
  payload.pat = "";
  const fixture = flag(argv, "--fixture-dir");
  const week = flag(argv, "--week") ?? "";
  const read = fixture ? fixtureReader(fixture) : ghReader(owner, repo, branch);
  const summary = await summarizeVault({
    dataKey,
    read,
    week: week || "",
    verifyEvidence: argv.includes("--verify-evidence"),
  });
  dataKey.fill(0);
  process.stdout.write(format === "md" ? summaryMarkdown(summary) : `${JSON.stringify(summary, null, 2)}\n`);
  return 0;
}

function flag(argv: string[], name: string): string | null {
  const index = argv.indexOf(name);
  if (index < 0) return null;
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`Argument manquant pour ${name}.`);
  return value;
}

async function readPassword(): Promise<string> {
  if (process.env.ROVER_NOTES_PASSWORD) return process.env.ROVER_NOTES_PASSWORD;
  if (!process.stdin.isTTY) throw new Error("Mot de passe requis via invite masquée ou ROVER_NOTES_PASSWORD.");
  return promptMasked();
}

async function usernameFromPrompt(argv: string[]): Promise<string> {
  const fromFlag = flag(argv, "--username");
  if (fromFlag) return fromFlag;
  if (process.env.ROVER_NOTES_USERNAME) return process.env.ROVER_NOTES_USERNAME;
  throw new Error("Indiquez --username ou ROVER_NOTES_USERNAME.");
}

function promptMasked(): Promise<string> {
  return new Promise((resolve, reject) => {
    const input = process.stdin;
    process.stderr.write("Mot de passe : ");
    input.setRawMode(true);
    input.resume();
    let value = "";
    const onData = (buf: Buffer) => {
      const text = buf.toString("utf8");
      if (text === "\u0003") {
        cleanup();
        reject(new Error("Interrompu"));
        return;
      }
      if (text === "\r" || text === "\n") {
        process.stderr.write("\n");
        cleanup();
        resolve(value);
        return;
      }
      if (text === "\u007f" || text === "\b") {
        value = value.slice(0, -1);
        return;
      }
      value += text;
    };
    const cleanup = () => {
      input.off("data", onData);
      input.setRawMode(false);
      input.pause();
    };
    input.on("data", onData);
  });
}

function fixtureReader(root: string): (path: string) => Promise<{ text: string; sha: string } | null> {
  return async (path) => {
    try {
      const text = readFileSync(join(root, path), "utf8");
      return { text, sha: (await sha256Hex(utf8(text))).slice(0, 16) };
    } catch {
      return null;
    }
  };
}

function ghReader(owner: string, repo: string, branch: string): (path: string) => Promise<{ text: string; sha: string } | null> {
  return async (path) => {
    const api = `/repos/${owner}/${repo}/contents/${path}?ref=${encodeURIComponent(branch)}`;
    try {
      const body = JSON.parse(await ghApi(api)) as { content?: string; sha?: string };
      if (!body.content || !body.sha) return null;
      const text = Buffer.from(body.content.replace(/\s/g, ""), "base64").toString("utf8");
      return { text, sha: body.sha };
    } catch {
      return null;
    }
  };
}

function ghApi(apiPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      "gh",
      ["api", "-H", "Accept: application/vnd.github.raw+json", apiPath],
      { maxBuffer: 20_000_000 },
      (error, stdout) => {
        if (error) reject(new Error("Lecture GitHub impossible."));
        else resolve(stdout);
      },
    );
  });
}
