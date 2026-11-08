import { mkdir, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { utf8 } from "../crypto/bytes";
import { parseDataKey, sealBootstrap, sealObject, serializeEnvelope } from "../crypto/envelope";
import { loadCurriculumDocument } from "../domain/loadCurriculum";
import { canonicalJson } from "../domain/json";
import { DEFAULT_BRANCH, DEFAULT_KEY_ID, DEFAULT_REPO_NAME, DEFAULT_REPO_OWNER, MANIFEST_PATH, newObjectId } from "../domain/limits";

export const REQUIRED_SECRETS = ["SYNC_PAT", "SYNC_PASSWORD", "SYNC_USERNAME", "SYNC_DATA_KEY"] as const;

export class MissingSecretsError extends Error {
  readonly name = "MissingSecretsError";
  constructor(readonly names: string[]) {
    super(
      `Configuration manquante : ${names.join(", ")}. Le déploiement exige SYNC_PAT, SYNC_PASSWORD, SYNC_USERNAME et SYNC_DATA_KEY. Aucun mot de passe par défaut.`,
    );
  }
}

export async function writeBootstrapArtifacts(env: NodeJS.ProcessEnv, outDir: string): Promise<{ wrote: boolean }> {
  const missing = REQUIRED_SECRETS.filter((name) => !env[name]);
  if (missing.length > 0) {
    if (env.REQUIRE_SYNC_SECRETS === "1") throw new MissingSecretsError(missing);
    return { wrote: false };
  }
  const dataKey = parseDataKey(env.SYNC_DATA_KEY ?? "");
  const keyId = env.SYNC_KEY_ID || DEFAULT_KEY_ID;
  const secrets = await sealBootstrap(
    {
      username: env.SYNC_USERNAME ?? "",
      pat: env.SYNC_PAT ?? "",
      repoOwner: env.SYNC_REPO_OWNER || DEFAULT_REPO_OWNER,
      repoName: env.SYNC_REPO_NAME || DEFAULT_REPO_NAME,
      branch: env.SYNC_BRANCH || DEFAULT_BRANCH,
      keyId,
      dataKey,
      vaultManifestPath: MANIFEST_PATH,
    },
    env.SYNC_PASSWORD ?? "",
  );
  const document = loadCurriculumDocument();
  const objectId = newObjectId();
  const seed = await sealObject(dataKey, keyId, objectId, utf8(canonicalJson(document)));
  dataKey.fill(0);
  await mkdir(outDir, { recursive: true });
  await writeAtomic(join(outDir, "secrets.json"), JSON.stringify(secrets));
  await writeAtomic(join(outDir, "curriculum.seed.enc.json"), serializeEnvelope(seed));
  return { wrote: true };
}

async function writeAtomic(path: string, contents: string): Promise<void> {
  const temporary = `${path}.tmp`;
  await mkdir(dirname(path), { recursive: true });
  await writeFile(temporary, contents, { encoding: "utf8", mode: 0o600 });
  await rename(temporary, path);
}
