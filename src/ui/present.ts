export type ResourcePart =
  | { kind: "link"; href: string; label: string }
  | { kind: "text"; text: string };

export type RichPiece =
  | { kind: "text"; text: string }
  | { kind: "code"; text: string }
  | { kind: "link"; href: string; label: string };

const TOKEN = /https?:\/\/[^\s<>)\]]+|\[\[[\s\S]*?\]\]/g;
const WIKI = /wiki UGV Rover/i;

export function labelForHref(href: string, context = ""): string {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return "Lien";
  }
  const host = url.hostname.replace(/^www\./, "");
  if (host === "youtube.com" || host.endsWith(".youtube.com") || host === "youtu.be") {
    const title = context.match(/«\s*([^»]+?)\s*»/)?.[1];
    if (url.pathname.includes("playlist") && title) return `Playlist ${title}`;
    if (url.pathname.includes("playlist")) return "Playlist YouTube";
    return "YouTube";
  }
  if (host === "missing.csail.mit.edu") return "Missing Semester";
  const segments = url.pathname
    .split("/")
    .filter(Boolean)
    .map((part) => {
      try {
        return decodeURIComponent(part);
      } catch {
        return part;
      }
    });
  const last = segments.at(-1)?.replace(/\.pdf$/i, "").replace(/\.html$/i, "") ?? "";
  const slug = last.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
  if (host === "doc.rust-lang.org" && slug.toLowerCase() === "book") return "Rust Book";
  if (host === "docs.rust-embedded.org" && slug.toLowerCase() === "book") return "Embedded Rust Book";
  if (host === "ocw.mit.edu") {
    const course = segments.find((part) => /^\d+-\d+-/.test(part)) ?? slug;
    return course
      .replace(/-/g, " ")
      .replace(/^(\d+) (\d+)\b/, "$1.$2")
      .replace(/\s+spring\s+\d{4}$/i, "");
  }
  if (host === "docs.ros.org" && segments.includes("humble")) return "ROS Humble";
  if (host === "ti.com" && slug) return slug.toUpperCase();
  if (slug && !/^(book|tutorials?|index)$/i.test(slug)) return slug;
  const site = host.split(".").slice(-2, -1)[0] ?? host;
  return slug ? `${site} ${slug}` : site;
}

export function resourceParts(value: string, context = ""): ResourcePart[] {
  const parts: ResourcePart[] = [];
  for (const chunk of value.split(/\s*;\s*/)) {
    const trimmed = chunk.trim();
    if (!trimmed) continue;
    const found = trimmed.match(/https?:\/\/[^\s;]+/);
    if (!found) {
      parts.push(...plainParts(trimmed));
      continue;
    }
    const href = found[0].replace(/[.,)]+$/, "");
    parts.push({ kind: "link", href, label: labelForHref(href, `${context} ${trimmed}`) });
    const rest = `${trimmed.slice(0, found.index ?? 0)} ${trimmed.slice((found.index ?? 0) + found[0].length)}`.trim();
    if (rest) parts.push(...plainParts(rest));
  }
  return parts;
}

export function richPieces(text: string, context = text): RichPiece[] {
  const pieces: RichPiece[] = [];
  let last = 0;
  for (const match of text.matchAll(TOKEN)) {
    const index = match.index ?? 0;
    if (index > last) pieces.push({ kind: "text", text: text.slice(last, index) });
    const token = match[0];
    if (token.startsWith("[[")) {
      pieces.push({ kind: "code", text: token });
    } else {
      const href = token.replace(/[.,;:)]+$/, "");
      pieces.push({ kind: "link", href, label: labelForHref(href, context) });
      const trail = token.slice(href.length);
      if (trail) pieces.push({ kind: "text", text: trail });
    }
    last = index + token.length;
  }
  if (last < text.length) pieces.push({ kind: "text", text: text.slice(last) });
  if (pieces.length === 0) pieces.push({ kind: "text", text });
  return pieces;
}

export function slotTasks(contenu: string): { read: string[]; do: string[] } {
  const read: string[] = [];
  const tasks: string[] = [];
  for (const clause of splitClauses(contenu)) {
    if (isRead(clause)) read.push(clause);
    else tasks.push(clause);
  }
  if (read.length === 0 && tasks.length === 0 && contenu.trim()) tasks.push(contenu.trim());
  return { read, do: tasks };
}

function plainParts(text: string): ResourcePart[] {
  const wiki = WIKI.exec(text);
  if (!wiki || wiki.index == null) return [{ kind: "text", text }];
  const before = text.slice(0, wiki.index).trim();
  const after = text.slice(wiki.index + wiki[0].length).trim();
  const parts: ResourcePart[] = [];
  if (before) parts.push({ kind: "text", text: before });
  const parenthetical = after.startsWith("(") ? after : "";
  parts.push({ kind: "text", text: parenthetical ? `wiki UGV Rover ${parenthetical}` : "wiki UGV Rover" });
  if (after && !parenthetical) parts.push({ kind: "text", text: after });
  return parts;
}

function splitClauses(contenu: string): string[] {
  return contenu
    .split(/\.\s+(?=(?:Puis\s+)?(?:\d+\s*h\b|Exercice\b|Programme\b))|\s+Puis\s+(?=\d+\s*h\b)/)
    .flatMap((part) => part.split(/\s*;\s+/))
    .map((part) => part.trim().replace(/^Puis\s+/, "").replace(/\s+/g, " "))
    .filter((part) => part.length > 0);
}

function isRead(clause: string): boolean {
  if (/^\s*(exercice|notes|commit|premier commit)\b/i.test(clause)) return false;
  return /épisode|book\b|électricité|linux\s*:|shell\s*\(|bus série|datasheet|principe|mit 18|ros 2|no_std|révision des/i.test(clause);
}
