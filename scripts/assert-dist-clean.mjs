import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";

const allowBootstrap = process.argv.includes("--allow-bootstrap");
const root = "dist";
const siteBase = "/rover-notes/";
const canaries = [
  "Je sais écrire sans IA un parseur C",
  "cursor.com/canvas",
  "rawCanvasSources",
  "fixture-unlock-phrase",
  "fixture-pat-not-a-token",
];

const files = await walk(root);
const offenders = [];
const indexHtml = await readFile(join(root, "index.html"), "utf8");
const fallbackHtml = await readFile(join(root, "404.html"), "utf8").catch(() => null);
if (fallbackHtml !== indexHtml) {
  offenders.push("404.html doit être une copie de index.html pour les liens profonds");
}
if (!indexHtml.includes('src="/rover-notes/assets/')) {
  offenders.push("index.html ne charge pas les scripts sous /rover-notes/assets/");
}
for (const match of indexHtml.matchAll(/\s(?:src|href)=["']([^"']+)["']/gi)) {
  const url = match[1];
  if (isExternal(url) || url.startsWith("#")) continue;
  if (!url.startsWith(siteBase)) offenders.push(`index.html référence « ${url} » hors de ${siteBase}`);
}
for (const tag of indexHtml.matchAll(/<link\b[^>]*>/gi)) {
  const rel = /rel=["']([^"']+)["']/i.exec(tag[0])?.[1] ?? "";
  const href = /href=["']([^"']+)["']/i.exec(tag[0])?.[1] ?? "";
  const kind = rel.split(/\s+/).find((item) => item === "icon" || item === "manifest" || item === "apple-touch-icon");
  if (!kind || !href || isExternal(href)) continue;
  if (!href.startsWith(siteBase)) offenders.push(`lien ${kind} pointe vers ${href}, attendu sous ${siteBase}`);
}
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

function isExternal(url) {
  return /^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith("//");
}

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
