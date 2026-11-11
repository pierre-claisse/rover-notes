// @vitest-environment happy-dom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { App } from "../src/App";
import { sealBootstrap } from "../src/crypto/envelope";
import { loadCurriculumDocument } from "../src/domain/loadCurriculum";
import { parisWeekday } from "../src/domain/time";
import { sameDayName } from "../src/ui/atelier";
import { todayHeadline } from "../src/ui/today";
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

beforeEach(() => {
  at("/rover-notes/");
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  window.sessionStorage.clear();
  at("/rover-notes/");
});

describe("login", () => {
  it("n’affiche pas le hub et ne lit pas GitHub avant déverrouillage", async () => {
    at("/rover-notes/semaine/P0-S1");
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
    expect(window.location.pathname).toBe("/rover-notes/semaine/P0-S1");
    expect(screen.queryByRole("heading", { name: /Vecteurs, mémoire C/ })).toBeNull();
  });

  it("laisse une URL à dièse telle quelle", async () => {
    at("/rover-notes/#/programme");
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
    await screen.findByLabelText("Mot de passe");
    expect(window.location.pathname).toBe("/rover-notes/");
    expect(window.location.hash).toBe("#/programme");
    await settled(fetchImpl);
    await user.type(screen.getByLabelText("Identifiant"), "Ada");
    await user.type(screen.getByLabelText("Mot de passe"), "phrase-de-test");
    await user.click(screen.getByRole("button", { name: "Déverrouiller" }));
    expect(await screen.findByRole("heading", { name: homeHeading() })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Accueil" })).toHaveAttribute("aria-current", "page");
    expect(screen.queryByRole("heading", { name: "Programme" })).toBeNull();
    expect(window.location.pathname).toBe("/rover-notes/");
    expect(window.location.hash).toBe("#/programme");
  });

  it("ouvre la semaine demandée par l’URL, puis retrouve la page après verrouillage", async () => {
    at("/rover-notes/semaine/P0-S1");
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
    expect(await screen.findByRole("heading", { name: "S1 — Vecteurs, mémoire C, Linux série, premier parseur" })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/rover-notes/semaine/P0-S1");
    expect(window.location.hash).toBe("");
    expect(screen.getByRole("link", { name: "Accueil" })).toHaveAttribute("href", "/rover-notes/");
    expect(screen.getByRole("link", { name: "Programme" })).toHaveAttribute("href", "/rover-notes/programme");
    expect(screen.getByRole("link", { name: "Glossaire" })).toHaveAttribute("href", "/rover-notes/glossaire");
    expect(screen.getByRole("link", { name: "Journal" })).toHaveAttribute("href", "/rover-notes/journal");
    expect(screen.getByRole("link", { name: "Accueil" })).not.toHaveAttribute("aria-current");
    await user.click(screen.getByRole("link", { name: "Accueil" }));
    expect(await screen.findByRole("heading", { name: homeHeading() })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/rover-notes/");
    expect(screen.getByRole("link", { name: "Ouvrir l’atelier de la semaine" })).toHaveAttribute("href", "/rover-notes/semaine/P0-S1");
    await user.click(screen.getByRole("button", { name: "Verrouiller" }));
    await waitFor(() => expect(screen.getByLabelText("Mot de passe")).toBeInTheDocument());
    expect(window.location.pathname).toBe("/rover-notes/");
    expect(screen.queryByRole("heading", { name: homeHeading() })).toBeNull();
    await user.type(screen.getByLabelText("Identifiant"), "Ada");
    await user.type(screen.getByLabelText("Mot de passe"), "phrase-de-test");
    await user.click(screen.getByRole("button", { name: "Déverrouiller" }));
    expect(await screen.findByRole("heading", { name: homeHeading() })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/rover-notes/");
  });

  it("affiche ou masque le mot de passe, et le déverrouillage occupe la largeur du coffre", async () => {
    const fetchImpl = vi.fn(async () => new Response(secrets, { status: 200 }));
    const user = userEvent.setup();
    render(<App deps={{ fetchImpl, secretsUrl: "/rover-notes/secrets.json", idleMs: 60_000 }} />);
    const password = await screen.findByLabelText("Mot de passe");
    const username = screen.getByLabelText("Identifiant");
    expect(password).toHaveAttribute("type", "password");
    document.head.appendChild(Object.assign(document.createElement("style"), { textContent: readFileSync(resolve("src/styles.css"), "utf8") }));
    expect(password.parentElement).toHaveClass("password-field");
    expect(password.parentElement).toContainElement(screen.getByRole("button", { name: "Afficher" }));
    const toggle = screen.getByRole("button", { name: "Afficher" });
    const form = username.closest("form");
    if (form instanceof HTMLElement) form.style.width = "320px";
    const userWidth = getComputedStyle(username).width;
    const passWidth = getComputedStyle(password).width;
    expect(userWidth).not.toBe("");
    expect(passWidth).toBe(userWidth);
    expect(getComputedStyle(password.parentElement as Element).position).toBe("relative");
    expect(getComputedStyle(toggle).position).toBe("absolute");
    const unlock = screen.getByRole("button", { name: "Déverrouiller" });
    expect(unlock).toHaveClass("wide");
    expect(unlock).toHaveAttribute("type", "submit");
    await user.click(screen.getByRole("button", { name: "Afficher" }));
    expect(password).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "Masquer" })).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "Masquer" }));
    expect(password).toHaveAttribute("type", "password");
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
    expect(await screen.findByRole("heading", { name: homeHeading() })).toBeInTheDocument();
    const summary = loadCurriculumDocument().inconsistency.summary;
    expect(screen.queryByRole("heading", { name: "18 mois et S94" })).not.toBeInTheDocument();
    expect(screen.queryByText(summary)).not.toBeInTheDocument();
    const due = screen.getByText(/À rendre/);
    const days = screen.getByRole("heading", { name: "À lire, à faire" });
    expect(due.compareDocumentPosition(days) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
    expect(screen.getByRole("link", { name: "Playlist Essence of linear algebra" })).toHaveAttribute(
      "href",
      "https://www.youtube.com/playlist?list=PLZHQObOWTQDPD3MizzM2xVFitgF8hE_ab",
    );
    expect(screen.getByRole("link", { name: "Missing Semester" })).toHaveAttribute("href", "https://missing.csail.mit.edu/");
    expect(screen.getByText("wiki UGV Rover (format JSON)")).toBeInTheDocument();
    expect(screen.getByText("[[0,-1],[1,0]]").tagName).toBe("CODE");
    expect(screen.getAllByText("À regarder ou lire").length).toBeGreaterThan(0);
    expect(screen.getAllByText("À faire").length).toBeGreaterThan(0);
    expect(document.body.textContent ?? "").not.toMatch(/https?:\/\//);
    expect(window.location.pathname).toBe("/rover-notes/");
    expect(window.location.hash).toBe("");
    expect(screen.getByRole("link", { name: "Accueil" })).toHaveAttribute("href", "/rover-notes/");
    expect(screen.getByRole("link", { name: "Accueil" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Programme" })).toHaveAttribute("href", "/rover-notes/programme");
    expect(screen.getByRole("link", { name: "Programme" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "Glossaire" })).toHaveAttribute("href", "/rover-notes/glossaire");
    expect(screen.getByRole("link", { name: "Journal" })).toHaveAttribute("href", "/rover-notes/journal");
    expect(screen.getByRole("link", { name: /semaine en cours/ })).toHaveAttribute("href", "/rover-notes/semaine/P0-S1");
    expect(screen.getByRole("button", { name: "Verrouiller" })).toHaveClass("text-button");
    expect(screen.getByRole("status")).toHaveTextContent("Enregistré");
    expect(screen.getByRole("status")).not.toHaveTextContent("GitHub");
    await user.click(screen.getByText("Détails du suivi"));
    expect(screen.getByText(/0 h au/)).toBeInTheDocument();
    expect(screen.getByText(/Robot non acheté/)).toBeInTheDocument();
    expect(screen.getByText(/Repère source/)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Calendrier" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "18 mois et S94" })).not.toBeInTheDocument();
    expect(screen.queryByText(/ne décrivent pas le même calendrier/)).not.toBeInTheDocument();
    expect(screen.queryByText(/sans arbitrage/)).not.toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: "Programme" }));
    expect(await screen.findByRole("heading", { name: "Programme" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Semaine en cours : S1" })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/rover-notes/programme");
    expect(screen.getByRole("link", { name: "Aller à S1" })).toHaveAttribute("href", "#semaine-en-cours");
    await user.click(screen.getByRole("link", { name: "Aller à S1" }));
    expect(window.location.pathname).toBe("/rover-notes/programme");
    expect(window.location.hash).toBe("");
    expect(screen.getByRole("link", { name: "Programme" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByText("94 sem. · ~846 h · ~22 mois")).toBeInTheDocument();
    await user.click(screen.getByText("Pourquoi 22 mois ?"));
    expect(screen.getByText(summary)).toBeInTheDocument();
    expect(screen.getByText(/environ 22 mois, pas 18/)).toBeInTheDocument();
    expect(screen.getByText(/S1 à S9 sont détaillées. S10 à S94 restent des blocs indicatifs/)).toBeInTheDocument();
    expect(screen.getByText(/environ 22 mois \(846 h\)/)).toBeInTheDocument();
    expect(screen.queryByText(/planning de 18 mois daté/)).not.toBeInTheDocument();
    expect(screen.queryAllByRole("button", { name: "Définir comme semaine en cours" })).toHaveLength(0);
    expect(screen.getAllByText("en cours", { selector: ".pill-current" })).toHaveLength(1);
    expect(screen.queryAllByText("détaillée", { selector: ".pill" })).toHaveLength(0);
    expect(screen.getAllByText("indicative", { selector: ".pill" }).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/outillage et compilation reproductible/)).toHaveLength(1);
    expect(screen.getByRole("link", { name: /^S10$/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^S11$/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /S11 — outillage/ })).not.toBeInTheDocument();
    await user.click(screen.getByText("Changer la semaine en cours"));
    await user.selectOptions(screen.getByLabelText("Semaine en cours"), "P0-S2");
    await waitFor(() => expect(screen.getByText("en cours", { selector: ".pill-current" }).closest("li")?.textContent).toMatch(/S2/));
    await user.click(screen.getByRole("link", { name: "Journal" }));
    expect(await screen.findByRole("heading", { name: "Journal" })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/rover-notes/journal");
    expect(screen.getByRole("link", { name: "Journal" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("heading", { name: "Ajouter une séance" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Ajouter des minutes" })).not.toBeInTheDocument();
    const date = screen.getByLabelText("Date");
    expect(date).toHaveAttribute("type", "text");
    await user.clear(date);
    await user.type(date, "08/11/2026");
    expect(date).toHaveValue("08/11/2026");
    expect(screen.getByText("8 novembre 2026")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("11/08/2026")).not.toBeInTheDocument();
    expect(screen.queryByText("11/08/2026")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Minutes")).not.toHaveAttribute("placeholder");
    expect(screen.getByText("ex. 90")).toBeInTheDocument();
    expect(screen.getByText("min")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ajouter la séance" })).toHaveAttribute("type", "submit");
    const fold = screen.getByRole("button", { name: "Replier la navigation" });
    expect(fold).toHaveAttribute("aria-expanded", "true");
    expect(fold).toHaveAttribute("aria-controls", "navigation-principale");
    await user.click(fold);
    const unfold = screen.getByRole("button", { name: "Déplier la navigation" });
    expect(unfold).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("link", { name: "Accueil" })).toHaveAttribute("title", "Accueil");
    expect(window.localStorage.getItem("rover-notes.sidebar")).toBe("rail");
    await user.click(unfold);
    expect(window.localStorage.getItem("rover-notes.sidebar")).toBeNull();
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
    await user.click(screen.getByRole("button", { name: "Verrouiller" }));
    await waitFor(() => expect(screen.getByLabelText("Mot de passe")).toBeInTheDocument());
    expect(screen.queryByText(/Maintenant/)).toBeNull();
    expect(window.location.pathname).toBe("/rover-notes/journal");
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

function homeHeading(): string {
  const weekday = parisWeekday(new Date()).toLocaleLowerCase("fr-FR");
  const week = loadCurriculumDocument().weeks.find((item) => item.id === "P0-S1");
  const slots = week && "slots" in week.scheduleNotes ? week.scheduleNotes.slots : [];
  const match = slots.find((slot) => sameDayName(slot.c, weekday));
  return todayHeadline(weekday, match ? match.d : null);
}

function at(path: string): void {
  window.history.replaceState(null, "", path);
}

async function settled(fetchImpl: { mock: { results: Array<{ value?: Promise<unknown> }> } }) {
  await waitFor(() => expect(fetchImpl.mock.results.length).toBeGreaterThan(0));
  await fetchImpl.mock.results[0]?.value;
  await new Promise((resolve) => setTimeout(resolve, 0));
}
