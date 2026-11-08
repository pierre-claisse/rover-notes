import { GitHubContents } from "../github/client";
import { parseDataKey } from "../crypto/envelope";
import { loadCurriculumDocument } from "../domain/loadCurriculum";
import { DEFAULT_BRANCH, DEFAULT_KEY_ID, DEFAULT_REPO_NAME, DEFAULT_REPO_OWNER, MANIFEST_PATH } from "../domain/limits";
import { MemoryDraftStore } from "../vault/drafts";
import { VaultSession } from "../vault/session";
import { MissingSecretsError, REQUIRED_SECRETS } from "./writeSecrets";

export async function bootstrapVault(env: NodeJS.ProcessEnv): Promise<"created" | "exists"> {
  const missing = REQUIRED_SECRETS.filter((name) => !env[name]);
  if (missing.length > 0) throw new MissingSecretsError(missing);
  const dataKey = parseDataKey(env.SYNC_DATA_KEY ?? "");
  const client = new GitHubContents({
    owner: env.SYNC_REPO_OWNER || DEFAULT_REPO_OWNER,
    repo: env.SYNC_REPO_NAME || DEFAULT_REPO_NAME,
    branch: env.SYNC_BRANCH || DEFAULT_BRANCH,
    token: env.SYNC_PAT ?? "",
  });
  await client.getRepo();
  const existing = await client.getFile(MANIFEST_PATH);
  if (existing) {
    dataKey.fill(0);
    return "exists";
  }
  const session = new VaultSession({
    client,
    dataKey,
    keyId: env.SYNC_KEY_ID || DEFAULT_KEY_ID,
    seed: () => Promise.resolve(loadCurriculumDocument()),
    drafts: new MemoryDraftStore(),
    autosaveMs: 0,
  });
  await session.open();
  const snap = session.getSnapshot();
  session.dispose();
  dataKey.fill(0);
  if (snap.phase === "error") throw new Error(snap.errorMessage ?? "Initialisation impossible");
  return "created";
}
