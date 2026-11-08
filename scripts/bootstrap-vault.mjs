import { bootstrapVault } from "../src/bootstrap/run.ts";
import { MissingSecretsError } from "../src/bootstrap/writeSecrets.ts";

try {
  const result = await bootstrapVault(process.env);
  console.log(result === "exists" ? "Coffre déjà présent, aucune écriture." : "Coffre initialisé.");
} catch (error) {
  if (error instanceof MissingSecretsError) console.error(error.message);
  else console.error(error instanceof Error ? error.message : "Initialisation impossible.");
  process.exit(1);
}
