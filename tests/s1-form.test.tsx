// @vitest-environment happy-dom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { loadCurriculumDocument } from "../src/domain/loadCurriculum";
import { MemoryContents } from "../src/github/memory";
import { VaultProvider } from "../src/ui/vault";
import { WeekPage } from "../src/ui/WeekPage";
import { MemoryDraftStore } from "../src/vault/drafts";
import { VaultSession } from "../src/vault/session";

const dataKey = Uint8Array.from({ length: 32 }, (_, index) => index + 6);
const document = loadCurriculumDocument();

afterEach(() => cleanup());

describe("formulaire S1", () => {
  it("enregistre et retrouve les réponses sous fixture", async () => {
    const store = new MemoryContents();
    const current = create(store);
    await current.open();
    const user = userEvent.setup();
    render(harness(current));
    await screen.findByRole("heading", { name: /S1 — Vecteurs/ });
    await user.click(screen.getByRole("checkbox", { name: /matrice 2×2/ }));
    await user.type(screen.getByRole("textbox", { name: /Images des vecteurs de base/ }), "(1,0) vers (0,1)");
    await user.type(screen.getByLabelText("Appris"), "rotation");
    await user.type(screen.getByLabelText("Minutes"), "30");
    await user.type(screen.getByLabelText("Résumé"), "épisodes 1 à 3");
    await user.click(screen.getByRole("button", { name: "Ajouter la séance" }));
    await screen.findByText(/30 min/);
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));
    await waitFor(() => expect(current.getSnapshot().saveStatus).toBe("saved"));
    expect(screen.getByText(/origin: authored/)).toBeInTheDocument();
    expect(screen.queryByText(/Indice 1/)).toBeNull();
    await user.click(screen.getAllByRole("button", { name: "Afficher l’indice 1" })[0]!);
    expect(screen.getByText(/Indice 1/)).toBeInTheDocument();

    cleanup();
    const reloaded = create(store);
    await reloaded.open();
    render(harness(reloaded));
    expect(await screen.findByRole("checkbox", { name: /matrice 2×2/ })).toBeChecked();
    expect(screen.getByRole("textbox", { name: /Images des vecteurs de base/ })).toHaveValue("(1,0) vers (0,1)");
    expect(screen.getByLabelText("Appris")).toHaveValue("rotation");
    expect(screen.getByText(/30 min/)).toBeInTheDocument();
    expect(reloaded.getSnapshot().journal?.entries).toHaveLength(1);
  });
});

function create(store: MemoryContents) {
  return new VaultSession({
    client: store,
    dataKey,
    keyId: "k1",
    seed: async () => document,
    drafts: new MemoryDraftStore(),
    now: () => new Date("2026-11-08T18:00:00Z"),
    autosaveMs: 0,
  });
}

function harness(session: VaultSession) {
  return (
    <VaultProvider session={session}>
      <MemoryRouter initialEntries={["/semaine/P0-S1"]}>
        <Routes>
          <Route path="/semaine/:weekId" element={<WeekPage />} />
        </Routes>
      </MemoryRouter>
    </VaultProvider>
  );
}
