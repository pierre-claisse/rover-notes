export function assertNever(value: never): never {
  throw new Error(`Cas non géré: ${String(value)}`);
}
