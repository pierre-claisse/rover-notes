import { useEffect, useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthProvider";
import { LoginScreen } from "./auth/LoginScreen";
import { utf8Decode } from "./crypto/bytes";
import { openObject, parseEnvelope, type BootstrapPayload } from "./crypto/envelope";
import { parseCurriculumDocument, type CurriculumDocument } from "./domain/curriculumDocument";
import { GitHubContents, type ContentsStore } from "./github/client";
import { GlossaryPage } from "./ui/GlossaryPage";
import { HomePage } from "./ui/HomePage";
import { JournalPage } from "./ui/JournalPage";
import { ProgramPage } from "./ui/ProgramPage";
import { Shell } from "./ui/Shell";
import { VaultProvider } from "./ui/vault";
import { WeekPage } from "./ui/WeekPage";
import { createBrowserDraftStore, type DraftStore } from "./vault/drafts";
import { VaultSession } from "./vault/session";

export type AppDeps = {
  fetchImpl?: typeof fetch;
  secretsUrl?: string;
  idleMs?: number;
  createClient?: (payload: BootstrapPayload) => ContentsStore;
  seed?: () => Promise<CurriculumDocument>;
  drafts?: DraftStore;
  autosaveMs?: number;
};

export function App({ deps }: { deps?: AppDeps } = {}) {
  const secretsUrl = deps?.secretsUrl ?? publicAsset("secrets.json");
  return (
    <AuthProvider secretsUrl={secretsUrl} fetchImpl={deps?.fetchImpl} idleMs={deps?.idleMs}>
      <Gate deps={deps} />
    </AuthProvider>
  );
}

function Gate({ deps }: { deps?: AppDeps }) {
  const auth = useAuth();
  switch (auth.status) {
    case "locked":
    case "unlocking":
      return <LoginScreen />;
    case "unlocked":
      return <Unlocked deps={deps} />;
    default: {
      const neverStatus: never = auth.status;
      return neverStatus;
    }
  }
}

function Unlocked({ deps }: { deps?: AppDeps }) {
  const auth = useAuth();
  const [session] = useState(() => {
    const secrets = auth.getSecrets();
    if (!secrets) throw new Error("Session absente");
    return new VaultSession({
      client: deps?.createClient
        ? deps.createClient(secrets)
        : new GitHubContents({
            owner: secrets.repoOwner,
            repo: secrets.repoName,
            branch: secrets.branch,
            token: secrets.pat,
            fetchImpl: deps?.fetchImpl,
          }),
      dataKey: secrets.dataKey,
      keyId: secrets.keyId,
      seed: deps?.seed ?? (() => loadSeed(secrets.dataKey, deps?.fetchImpl)),
      drafts: deps?.drafts ?? createBrowserDraftStore(),
      autosaveMs: deps?.autosaveMs,
    });
  });

  useEffect(() => {
    auth.registerVault(session);
    void session.open();
    return () => {
      auth.registerVault(null);
      session.dispose();
    };
  }, [auth, session]);

  return (
    <VaultProvider session={session}>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Routes>
          <Route element={<Shell />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/programme" element={<ProgramPage />} />
            <Route path="/glossaire/:entryId?" element={<GlossaryPage />} />
            <Route path="/journal" element={<JournalPage />} />
            <Route path="/semaine/:weekId" element={<WeekPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </VaultProvider>
  );
}

async function loadSeed(dataKey: Uint8Array, fetchImpl?: typeof fetch): Promise<CurriculumDocument> {
  const response = await (fetchImpl ?? fetch)(publicAsset("curriculum.seed.enc.json"), { cache: "no-store" });
  if (!response.ok) throw new Error("Programme chiffré introuvable dans ce build.");
  const envelope = parseEnvelope(JSON.parse(await response.text()) as unknown);
  const plain = await openObject(dataKey, envelope);
  return parseCurriculumDocument(JSON.parse(utf8Decode(plain)) as unknown);
}

function publicAsset(file: string): string {
  return `${import.meta.env.BASE_URL}${file}`;
}
