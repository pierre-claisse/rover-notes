export function canonicalJson(value: unknown): string {
  return JSON.stringify(normalizeJson(value));
}

function normalizeJson(value: unknown): unknown {
  if (value === null) return null;
  const kind = typeof value;
  if (kind === "string" || kind === "boolean") return value;
  if (kind === "number") {
    if (!Number.isFinite(value)) throw new Error("Nombre non fini");
    return value;
  }
  if (Array.isArray(value)) return value.map((item) => normalizeJson(item));
  if (kind === "object") {
    const record = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(record).sort()) {
      const child = record[key];
      if (child !== undefined) out[key] = normalizeJson(child);
    }
    return out;
  }
  throw new Error("Valeur non sérialisable");
}
