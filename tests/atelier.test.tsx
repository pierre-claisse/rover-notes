// @vitest-environment happy-dom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { loadCurriculumDocument } from "../src/domain/loadCurriculum";
import { parisWeekday } from "../src/domain/time";
import { MemoryContents } from "../src/github/memory";
import { enteredTimeCopy, phaseTimeCopy, sameDayName } from "../src/ui/atelier";
import { HomePage } from "../src/ui/HomePage";
import { JournalPage } from "../src/ui/JournalPage";
import { ProgramPage } from "../src/ui/ProgramPage";
import { VaultProvider } from "../src/ui/vault";
import { WeekPage } from "../src/ui/WeekPage";
import { MemoryDraftStore } from "../src/vault/drafts";
import { VaultSession } from "../src/vault/session";

const dataKey = Uint8Array.from({ length: 32 }, (_, index) => index + 3);
const curriculum = loadCurriculumDocument();

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("atelier", () => {
  it("parle de temps saisi, jamais d’un retard", async () => {
    expect(enteredTimeCopy(0, 9)).toBe("Temps saisi : 0 min, sur un rythme de 9 h.");
    expect(enteredTimeCopy(90, 9)).not.toMatch(/retard/i);
    expect(phaseTimeCopy(15, 80)).not.toMatch(/retard/i);
    const session = await open();
    render(page(session, <HomePage />));
    const progress = await screen.findByRole("region", { name: "Temps saisi" });
    expect(progress).toHaveTextContent("Temps saisi : 0 min, sur un rythme de 9 h.");
    expect(progress.textContent ?? "").not.toMatch(/retard/i);
    expect(screen.getByRole("link", { name: "Ouvrir l’atelier de la semaine" })).toHaveAttribute("href", "/semaine/P0-S1");
    expect(screen.getByRole("link", { name: "Noter une séance" })).toBeInTheDocument();
    const atelier = screen.getByRole("link", { name: "Ouvrir l’atelier de la semaine" });
    const plan = screen.getByRole("heading", { name: "À lire, à faire" });
    expect(atelier.compareDocumentPosition(plan) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
  });

  it("met en avant le créneau dont le jour est celui de Paris, sans date inventée", async () => {
    const weekday = parisWeekday(new Date()).toLocaleLowerCase("fr-FR");
    const session = await open();
    render(page(session, <HomePage />));
    await screen.findByRole("heading", { name: "Maintenant : S1" });
    const week = curriculum.weeks.find((item) => item.id === "P0-S1");
    if (!week || !("slots" in week.scheduleNotes)) throw new Error("créneaux S1 absents");
    const match = week.scheduleNotes.slots.find((slot) => sameDayName(slot.c, weekday));
    const today = screen.queryByText("Aujourd’hui");
    if (match) {
      expect(today).toBeInTheDocument();
      expect(today?.closest("li")).toHaveTextContent(match.c);
      expect(today?.closest("li")).toHaveAttribute("aria-current", "date");
    } else {
      expect(today).not.toBeInTheDocument();
      expect(screen.getByText(new RegExp(`Pas de créneau ce ${weekday}`))).toBeInTheDocument();
    }
    if (sameDayName(weekday, "dimanche")) {
      expect(screen.getByRole("link", { name: "Ouvrir le bilan" })).toBeInTheDocument();
    }
    expect(screen.queryByText(/tu es en retard/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/en retard/i)).not.toBeInTheDocument();
  });

  it("invite à la première séance, puis confirme sans vider le sens des totaux", async () => {
    const session = await open();
    const user = userEvent.setup();
    render(page(session, <JournalPage />));
    expect(await screen.findByText(/première séance/)).toBeInTheDocument();
    expect(screen.queryByText("Aucune entrée sauvegardée.")).not.toBeInTheDocument();
    expect(within(totals()).getByText("Aujourd’hui").closest("div")).toHaveTextContent("0 min");
    expect(within(totals()).getByText("Total").closest("div")).toHaveTextContent("0 min");
    await user.type(screen.getByLabelText("Minutes"), "45");
    await user.type(screen.getByLabelText("Résumé"), "lecture calme");
    await user.click(screen.getByRole("button", { name: "Ajouter la séance" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Séance notée.");
    const noted = screen.getByRole("status");
    const written = await screen.findByText("lecture calme");
    expect(noted.compareDocumentPosition(written) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
    expect(screen.getByLabelText("Minutes")).toHaveValue("");
    expect(screen.getByText("ex. 90")).toBeInTheDocument();
    expect(screen.getByLabelText("Résumé")).toHaveValue("");
    expect(await screen.findByText("lecture calme")).toBeInTheDocument();
    await waitFor(() => expect(within(totals()).getByText("Total").closest("div")).toHaveTextContent("45 min"));
    expect(within(totals()).getByText("Cette semaine").closest("div")).toHaveTextContent("45 min");
    expect(screen.queryByText(/retard/i)).not.toBeInTheDocument();
  });

  it("donne un sommaire à la page semaine et un décompte déclaratif", async () => {
    const session = await open();
    render(week(session, "P0-S1"));
    const toc = await screen.findByRole("navigation", { name: "Sommaire de la semaine" });
    for (const [id, label] of [
      ["plan", "Plan"],
      ["je-sais", "Je sais"],
      ["exercices", "Exercices"],
      ["notes", "Notes"],
      ["bilan", "Bilan"],
      ["preuves", "Preuves"],
      ["seance", "Séance"],
    ] as const) {
      expect(within(toc).getByRole("link", { name: label })).toHaveAttribute("href", `#${id}`);
      expect(document.getElementById(id)).toBeTruthy();
    }
    expect(screen.getByText("0 sur 6 déclarés")).toBeInTheDocument();
    expect(screen.getByText(/Cocher une case ne valide pas la compétence/)).toBeInTheDocument();
    expect(screen.queryByText("Précision facultative")).not.toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(screen.getByRole("checkbox", { name: /matrice 2×2/ }));
    expect(screen.getByLabelText("Précision facultative")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Bilan du dimanche" })).toBeInTheDocument();
  });

  it("réserve l’encart du dimanche à la semaine en cours", async () => {
    const session = await open();
    render(week(session, "P1-S10"));
    expect(await screen.findByText(/Bloc indicatif, à détailler/)).toBeInTheDocument();
    expect(screen.queryByText(/Aujourd’hui, le bilan/)).not.toBeInTheDocument();
    expect(screen.queryByText("Enregistré")).not.toBeInTheDocument();
  });

  it("ramène la semaine en cours dans le champ, sauf si le mouvement est réduit", async () => {
    const scroll = vi.spyOn(Element.prototype, "scrollIntoView").mockImplementation(() => {});
    mockMotion(false);
    const session = await open();
    render(page(session, <ProgramPage />));
    await screen.findByRole("heading", { name: "Programme" });
    const current = document.getElementById("semaine-en-cours");
    expect(current?.textContent).toMatch(/S1 —/);
    expect(scroll).toHaveBeenCalled();
    expect(scroll.mock.instances[0]).toBe(current);
    cleanup();
    scroll.mockClear();
    mockMotion(true);
    render(page(session, <ProgramPage />));
    await screen.findByRole("heading", { name: "Programme" });
    expect(scroll).not.toHaveBeenCalled();
    const copies = document.querySelectorAll(".progress-copy");
    expect(copies.length).toBeGreaterThan(0);
    for (const node of copies) expect(node.textContent ?? "").not.toMatch(/retard/i);
  });
});

function totals() {
  const node = document.querySelector(".totals");
  if (!(node instanceof HTMLElement)) throw new Error("totaux absents");
  return node;
}

function mockMotion(reduce: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: reduce && query.includes("prefers-reduced-motion"),
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {
      return false;
    },
  }));
}

async function open() {
  const session = new VaultSession({
    client: new MemoryContents(),
    dataKey,
    keyId: "k1",
    seed: async () => curriculum,
    drafts: new MemoryDraftStore(),
    now: () => new Date("2026-11-08T18:00:00Z"),
    autosaveMs: 0,
  });
  await session.open();
  return session;
}

function page(session: VaultSession, child: ReactNode) {
  return (
    <VaultProvider session={session}>
      <MemoryRouter>{child}</MemoryRouter>
    </VaultProvider>
  );
}

function week(session: VaultSession, weekId: string) {
  return (
    <VaultProvider session={session}>
      <MemoryRouter initialEntries={[`/semaine/${weekId}`]}>
        <Routes>
          <Route path="/semaine/:weekId" element={<WeekPage />} />
        </Routes>
      </MemoryRouter>
    </VaultProvider>
  );
}
