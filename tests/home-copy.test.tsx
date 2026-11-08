// @vitest-environment happy-dom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { loadCurriculumDocument } from "../src/domain/loadCurriculum";
import { MemoryContents } from "../src/github/memory";
import { HomePage } from "../src/ui/HomePage";
import { VaultProvider } from "../src/ui/vault";
import type { DraftStore } from "../src/vault/drafts";
import { VaultSession } from "../src/vault/session";

const dataKey = Uint8Array.from({ length: 32 }, (_, index) => index + 4);

afterEach(() => cleanup());

describe("brouillon sur l’appareil", () => {
  it("dit que le brouillon reste chiffré et que la clé n’est pas avec lui", async () => {
    const drafts: DraftStore = {
      persistent: true,
      async get() {
        return null;
      },
      async set() {},
    };
    const session = new VaultSession({
      client: new MemoryContents(),
      dataKey,
      keyId: "k1",
      seed: async () => loadCurriculumDocument(),
      drafts,
      now: () => new Date("2026-11-08T18:00:00Z"),
      autosaveMs: 0,
    });
    await session.open();
    render(
      <VaultProvider session={session}>
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      </VaultProvider>,
    );
    expect(await screen.findByText(/Un brouillon de vos saisies reste sur cet appareil, chiffré/)).toHaveTextContent(
      "n’est pas enregistrée avec lui",
    );
    expect(screen.queryByRole("heading", { name: "18 mois et S94" })).not.toBeInTheDocument();
  });
});
