// @vitest-environment happy-dom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { loadCurriculumDocument } from "../src/domain/loadCurriculum";
import { MemoryContents } from "../src/github/memory";
import { GlossaryPage } from "../src/ui/GlossaryPage";
import { HomePage } from "../src/ui/HomePage";
import { ProgramPage } from "../src/ui/ProgramPage";
import { VaultProvider } from "../src/ui/vault";
import { WeekPage } from "../src/ui/WeekPage";
import { MemoryDraftStore } from "../src/vault/drafts";
import { VaultSession } from "../src/vault/session";

const dataKey = Uint8Array.from({ length: 32 }, (_, index) => index + 8);
const document = loadCurriculumDocument();

afterEach(() => cleanup());

describe("lot pédagogique", () => {
  it("remplace le bandeau d’accueil par le coach, sans alerte", async () => {
    const session = await open();
    render(
      <VaultProvider session={session}>
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      </VaultProvider>,
    );
    expect(await screen.findByRole("heading", { name: "Maintenant : S1" })).toBeInTheDocument();
    expect(screen.getByText(document.homeCoach.body)).toBeInTheDocument();
    expect(screen.getByText(document.homeCoach.honestCalendar)).toBeInTheDocument();
    expect(screen.getByText(document.homeCoach.nextAction)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Le parseur de trames" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Les maths du mardi" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "De JavaScript vers la machine" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Pi 5 ↔ UART ↔ ESP32" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "18 mois et S94" })).not.toBeInTheDocument();
    expect(screen.queryByText(document.inconsistency.summary)).not.toBeInTheDocument();
  });

  it("place le briefing dans le plan, avant les objectifs et les questions", async () => {
    const session = await open();
    render(weekHarness(session, "/semaine/P0-S1"));
    const briefing = await screen.findByText(/C’est la bascule/);
    const plan = screen.getByRole("heading", { name: "Plan" });
    const objectives = screen.getByRole("heading", { name: "Je sais…" });
    const questions = screen.getByRole("heading", { name: "Questions" });
    const verification = screen.getByText("Exercice de vérification");
    expect(order(plan, briefing)).toBe(true);
    expect(order(briefing, objectives)).toBe(true);
    expect(order(objectives, questions)).toBe(true);
    expect(order(objectives, verification)).toBe(true);
    const briefingSection = briefing.closest("section");
    expect(briefingSection?.textContent ?? "").not.toMatch(/la plus haute/);
    expect(screen.getByRole("link", { name: "Matrice comme transformation" })).toHaveAttribute("href", "/glossaire/matrice-transformation");
    expect(screen.getByRole("navigation", { name: "Sommaire de la semaine" })).toBeInTheDocument();
  });

  it("ouvre le glossaire depuis une semaine et le récit de phase", async () => {
    const session = await open();
    const user = userEvent.setup();
    render(
      <VaultProvider session={session}>
        <MemoryRouter initialEntries={["/semaine/P0-S1"]}>
          <Routes>
            <Route path="/semaine/:weekId" element={<WeekPage />} />
            <Route path="/glossaire/:entryId?" element={<GlossaryPage />} />
            <Route path="/programme" element={<ProgramPage />} />
          </Routes>
        </MemoryRouter>
      </VaultProvider>,
    );
    await screen.findByRole("heading", { name: /S1 — Vecteurs/ });
    await user.click(screen.getByRole("link", { name: "UART" }));
    expect(await screen.findByRole("heading", { name: "Glossaire" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "UART" })).toBeInTheDocument();
    expect(screen.getByText(/Liaison série asynchrone/)).toBeInTheDocument();
    cleanup();
    render(
      <VaultProvider session={session}>
        <MemoryRouter>
          <ProgramPage />
        </MemoryRouter>
      </VaultProvider>,
    );
    expect(await screen.findByText(/En neuf semaines, vous passez de développeur web/)).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { name: "Critères de sortie" })).toHaveLength(8);
    expect(screen.getByText(/Vous savez expliquer sans notes/)).toBeInTheDocument();
    expect(screen.getByText(/Avant de toucher au PID/)).toBeInTheDocument();
    expect(screen.getAllByText(/outillage et compilation reproductible/)).toHaveLength(1);
    expect(screen.queryByText(/\b\d{1,2}\s+(?:janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+20\d{2}\b/i)).not.toBeInTheDocument();
  });

  it("affiche le briefing de bloc sans inventer un calendrier", async () => {
    const session = await open();
    render(weekHarness(session, "/semaine/P1-S10"));
    expect(await screen.findByText(/Avant de toucher au PID/)).toBeInTheDocument();
    expect(screen.getByText(/sera écrit dans rover-notes/)).toBeInTheDocument();
    expect(screen.queryByText(/Canvas/)).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Briefing" })).not.toBeInTheDocument();
    expect(screen.queryByText(/sourceMondayDate|2 nov/)).not.toBeInTheDocument();
  });
});

function order(before: HTMLElement, after: HTMLElement): boolean {
  return (before.compareDocumentPosition(after) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
}

async function open(): Promise<VaultSession> {
  const session = new VaultSession({
    client: new MemoryContents(),
    dataKey,
    keyId: "k1",
    seed: async () => document,
    drafts: new MemoryDraftStore(),
    now: () => new Date("2026-11-08T18:00:00Z"),
    autosaveMs: 0,
  });
  await session.open();
  return session;
}

function weekHarness(session: VaultSession, path: string) {
  return (
    <VaultProvider session={session}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/semaine/:weekId" element={<WeekPage />} />
          <Route path="/glossaire/:entryId?" element={<GlossaryPage />} />
        </Routes>
      </MemoryRouter>
    </VaultProvider>
  );
}
