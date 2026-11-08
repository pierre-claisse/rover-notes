// @vitest-environment happy-dom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { App } from "../src/App";
import { sealBootstrap } from "../src/crypto/envelope";
import { loadCurriculumDocument } from "../src/domain/loadCurriculum";
import { MANIFEST_PATH } from "../src/domain/limits";
import { MemoryContents } from "../src/github/memory";
import { MemoryDraftStore } from "../src/vault/drafts";

const dataKey = Uint8Array.from({ length: 32 }, (_, index) => index + 9);
let secrets = "";

beforeAll(async () => {
  const file = await sealBootstrap(
    {
      username: "Ada",
      pat: "fixture-pat-not-a-token",
      repoOwner: "pierre-claisse",
      repoName: "rover-notes-data",
      branch: "main",
      keyId: "k1",
      dataKey,
      vaultManifestPath: MANIFEST_PATH,
    },
    "phrase-de-test",
  );
  secrets = JSON.stringify(file);
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  window.sessionStorage.clear();
  window.location.hash = "";
});

describe("login", () => {
  it("n’affiche pas le hub et ne lit pas GitHub avant déverrouillage", async () => {
    window.location.hash = "#/semaine/P0-S1";
    const calls: string[] = [];
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      calls.push(url);
      if (url.includes("secrets.json")) return new Response(secrets, { status: 200 });
      return new Response("absent", { status: 404 });
    });
    render(<App deps={{ fetchImpl, secretsUrl: "/rover-notes/secrets.json", idleMs: 60_000, autosaveMs: 0 }} />);
    expect(screen.queryByText(/Maintenant/)).toBeNull();
    expect(screen.queryByText(/parseur/i)).toBeNull();
    await screen.findByLabelText("Mot de passe");
    await settled(fetchImpl);
    expect(calls.every((url) => url.includes("secrets.json"))).toBe(true);
    expect(calls.some((url) => url.includes("api.github.com"))).toBe(false);
  });

  it("refuse un mot de passe faux sans ouvrir le hub", async () => {
    const fetchImpl = vi.fn(async () => new Response(secrets, { status: 200 }));
    const user = userEvent.setup();
    render(<App deps={{ fetchImpl, secretsUrl: "/rover-notes/secrets.json", idleMs: 60_000 }} />);
    await screen.findByLabelText("Identifiant");
    await settled(fetchImpl);
    await user.type(screen.getByLabelText("Identifiant"), "Ada");
    await user.type(screen.getByLabelText("Mot de passe"), "mauvais");
    await user.click(screen.getByRole("button", { name: "Déverrouiller" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Identifiant ou mot de passe incorrect.");
    expect(screen.queryByText(/Maintenant/)).toBeNull();
  });

  it("ouvre S1 puis verrouille", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes("secrets.json")) return new Response(secrets, { status: 200 });
      throw new Error(`requête inattendue ${String(input)}`);
    });
    const user = userEvent.setup();
    render(
      <App
        deps={{
          fetchImpl,
          secretsUrl: "/rover-notes/secrets.json",
          idleMs: 60_000,
          autosaveMs: 0,
          drafts: new MemoryDraftStore(),
          seed: async () => loadCurriculumDocument(),
          createClient: () => new MemoryContents(),
        }}
      />,
    );
    await screen.findByLabelText("Identifiant");
    await settled(fetchImpl);
    await user.type(screen.getByLabelText("Identifiant"), "Ada");
    await user.type(screen.getByLabelText("Mot de passe"), "phrase-de-test");
    await user.click(screen.getByRole("button", { name: "Déverrouiller" }));
    expect(await screen.findByRole("heading", { name: "Maintenant : S1" })).toBeInTheDocument();
    expect(screen.getByText(/0 h au/)).toBeInTheDocument();
    expect(screen.getByText(/Robot non acheté/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "18 mois et S94" })).toBeInTheDocument();
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
    await user.click(screen.getByRole("button", { name: "Verrouiller" }));
    await waitFor(() => expect(screen.getByLabelText("Mot de passe")).toBeInTheDocument());
    expect(screen.queryByText(/Maintenant/)).toBeNull();
    expect(window.localStorage.length).toBe(0);
  });

  it("échoue fermé sans bundle", async () => {
    const fetchImpl = vi.fn(async () => new Response("absent", { status: 404 }));
    render(<App deps={{ fetchImpl, secretsUrl: "/rover-notes/secrets.json" }} />);
    expect(await screen.findByRole("heading", { name: "Configuration manquante" })).toBeInTheDocument();
    expect(screen.getByText(/SYNC_PASSWORD/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Mot de passe")).toBeNull();
  });
});

async function settled(fetchImpl: { mock: { results: Array<{ value?: Promise<unknown> }> } }) {
  await waitFor(() => expect(fetchImpl.mock.results.length).toBeGreaterThan(0));
  await fetchImpl.mock.results[0]?.value;
  await new Promise((resolve) => setTimeout(resolve, 0));
}
