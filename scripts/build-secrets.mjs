import { writeBootstrapArtifacts, MissingSecretsError } from "../src/bootstrap/writeSecrets.ts";

const outDir = process.argv.includes("--out") ? process.argv[process.argv.indexOf("--out") + 1] : "public";

try {
  const result = await writeBootstrapArtifacts(process.env, outDir);
  if (!result.wrote) {
    console.log(
      "Amorçage ignoré : secrets absents. Le déploiement exige SYNC_PAT, SYNC_PASSWORD, SYNC_USERNAME et SYNC_DATA_KEY. Aucun mot de passe par défaut.",
    );
  } else {
    console.log(`Bundle d’amorçage écrit dans ${outDir}.`);
  }
} catch (error) {
  if (error instanceof MissingSecretsError) {
    console.error(error.message);
    process.exit(1);
  }
  console.error("Écriture du bundle d’amorçage impossible.");
  process.exit(1);
}
