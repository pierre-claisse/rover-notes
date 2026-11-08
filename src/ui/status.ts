import { assertNever } from "../domain/assert";
import type { SaveStatus } from "../vault/session";

export function saveLabel(status: SaveStatus): string {
  switch (status) {
    case "saved":
      return "Enregistré sur GitHub";
    case "dirty":
      return "Non enregistré";
    case "saving":
      return "En cours";
    case "conflict":
      return "Conflit";
    case "offline":
      return "Hors ligne";
    default:
      return assertNever(status);
  }
}
