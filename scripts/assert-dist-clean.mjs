import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";

const allowBootstrap = process.argv.includes("--allow-bootstrap");
const root = "dist";
const canaries = [
  "Je sais écrire sans IA un parseur C",
  "cursor.com/canvas",
  "rawCanvasSources",
  "fixture-unlock-phrase",
  "fixture-pat-not-a-token",
];

const files = await walk(root);
const offenders = [];
for (const file of files) {
  if (file.endsWith(".map") || file.includes("sourceMappingURL")) offenders.push(`${file} source map`);
  const name = file.slice(root.length + 1);
  if (!allowBootstrap && (name === "secrets.json" || name === "curriculum.seed.enc.json")) {
    offenders.push(`${name} présent dans un build sans secrets`);
  }
  if (file.endsWith(".map")) continue;
  const text = await readFile(file, "utf8").catch(() => "");
  for (const canary of canaries) {
    if (text.includes(canary)) offenders.push(`${name} contient « ${canary} »`);
  }
}

if (offenders.length > 0) {
  console.error(offenders.join("\n"));
  process.exit(1);
}
console.log(allowBootstrap ? "dist sans texte pédagogique en clair." : "dist sans secrets ni texte pédagogique en clair.");

async function walk(dir) {
  const found = [];
  const entries = await readdir(dir);
  for (const entry of entries) {
    const path = join(dir, entry);
    const info = await stat(path);
    if (info.isDirectory()) found.push(...(await walk(path)));
    else found.push(path);
  }
  return found;
}
