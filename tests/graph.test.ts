import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("graphe client", () => {
  it("ne charge pas le curriculum en clair", () => {
    const files = walk(resolve("src/main.tsx"));
    const blob = files.map((file) => readFileSync(file, "utf8")).join("\n");
    expect(files.some((file) => file.endsWith("loadCurriculum.ts"))).toBe(false);
    expect(blob).not.toContain("Je sais écrire sans IA un parseur C");
    expect(blob).not.toContain("rawCanvasSources");
    expect(blob).not.toContain("dangerouslySetInnerHTML");
    expect(blob).not.toContain("sessionStorage");
    const stored = files.filter((file) => readFileSync(file, "utf8").includes("localStorage"));
    expect(stored.map((file) => file.endsWith("src/ui/navigation.tsx"))).toEqual([true]);
    expect(readFileSync(stored[0] ?? "", "utf8")).toContain("rover-notes.sidebar");
  });
});

function walk(file: string, seen = new Set<string>()): string[] {
  if (seen.has(file)) return [];
  seen.add(file);
  const text = readFileSync(file, "utf8");
  const specs = [...text.matchAll(/from "(\.[^"]+)"/g)].map((match) => match[1]!);
  const found = [file];
  for (const spec of specs) {
    const base = resolve(dirname(file), spec);
    const candidate = [base, `${base}.ts`, `${base}.tsx`].find((path) => existsSync(path));
    if (candidate) found.push(...walk(candidate, seen));
  }
  return found;
}
