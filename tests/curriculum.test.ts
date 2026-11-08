import { describe, expect, it } from "vitest";
import { canonicalJson } from "../src/domain/json";
import { loadCurriculumDocument } from "../src/domain/loadCurriculum";
import { packagedCurriculumWins, parseCurriculumDocument, readProgramRevision } from "../src/domain/curriculumDocument";
import { parseWeekRecord } from "../src/domain/schemas";
import { parisTimestamp } from "../src/domain/time";

describe("curriculum", () => {
  it("garde S1–S9 détaillées et S10–S94 indicatives", () => {
    const document = loadCurriculumDocument();
    expect(document.weeks.filter((week) => week.detailLevel === "source-detailed").map((week) => week.id)).toEqual([
      "P0-S1",
      "P0-S2",
      "P0-S3",
      "P0-S4",
      "P0-S5",
      "P0-S6",
      "P0-S7",
      "P0-S8",
      "P0-S9",
    ]);
    expect(document.weeks.filter((week) => week.detailLevel === "indicative-block-only")).toHaveLength(85);
    expect(document.weeks.at(-1)?.id).toBe("P7-S94");
    expect(document.weeks[0]?.objectives[5]?.text).toContain("sans IA un parseur C");
    expect(document.weeks[0]?.canvasDetailedQuestions).toEqual([]);
    expect(document.authoredComplement.origin).toBe("authored");
    expect(document.authoredComplement.questions.every((question) => question.origin === "authored")).toBe(true);
    expect(document.authoredComplement.questions).toHaveLength(38);
    const counts = new Map<string, number>();
    for (const question of document.authoredComplement.questions) {
      counts.set(question.weekId, (counts.get(question.weekId) ?? 0) + 1);
      expect(question.hints.length).toBeGreaterThan(0);
    }
    expect(counts.get("P0-S1")).toBe(6);
    for (let week = 2; week <= 9; week += 1) expect(counts.get(`P0-S${week}`)).toBe(4);
    expect(document.programRevision).toBe(1);
    expect(document.inconsistency.summary).toContain("environ 22 mois, pas 18");
    expect(document.inconsistency.summary).toContain("La semaine en cours reste P0-S1.");
    expect(document.inconsistency.summary).not.toContain("ne décrivent pas le même calendrier");
    expect(document.gaps).toHaveLength(4);
    expect(document.gaps[0]).toContain("maintenus dans rover-notes");
    expect(document.gaps[1]).toContain("sans dates inventées");
    expect(document.gaps[2]).toContain("846 h");
    expect(document.gaps[3]).toContain("Ne pas avancer automatiquement à S2");
    expect(document.provenance.extraction).toContain("source unique");
    expect(document.context.activeWeek).toBe("P0-S1");
    expect(document.context.completedHours).toBe(0);
    expect(document.context.robotPurchased).toBe(false);
  });

  it("accepte un programme de coffre sans révision et reconnaît un seed plus récent", async () => {
    const document = loadCurriculumDocument();
    const legacy = structuredClone(document) as unknown as Record<string, unknown>;
    delete legacy.programRevision;
    legacy.inconsistency = { origin: "authored", summary: "Les deux chiffres ne décrivent pas le même calendrier." };
    expect(readProgramRevision(legacy)).toBe(0);
    expect(parseCurriculumDocument(legacy).programRevision).toBe(0);
    expect(await packagedCurriculumWins(legacy, document)).toBe(true);
    const roundTrip = JSON.parse(canonicalJson(document)) as unknown;
    expect(await packagedCurriculumWins(roundTrip, document)).toBe(false);
    const newer = structuredClone(document);
    newer.programRevision = document.programRevision + 1;
    expect(await packagedCurriculumWins(newer, document)).toBe(false);
    const drifted = structuredClone(document);
    drifted.inconsistency = { origin: "authored", summary: "contenu différent à la même révision" };
    expect(await packagedCurriculumWins(drifted, document)).toBe(true);
    const foreign = structuredClone(document) as { curriculumVersion: string };
    foreign.curriculumVersion = "autre-version";
    expect(readProgramRevision(foreign)).toBeNull();
    expect(() => parseCurriculumDocument(foreign)).toThrow(/Programme chiffré refusé/);
  });

  it("rejette une réponse qui mélange les formes", () => {
    expect(() =>
      parseWeekRecord({
        schemaVersion: 1,
        weekId: "P0-S1",
        curriculumVersion: "initial-canvas-import-v1",
        revision: 1,
        state: "in_progress",
        objectives: [],
        answers: [{ questionId: "P0-S1-q-bases", value: { kind: "text", text: "ok", selectedIds: ["a"] } }],
        notes: "café — déjà",
        writeUp: { learned: "", difficulties: "", nextSteps: "" },
        evidence: [],
        updatedAt: parisTimestamp(new Date("2026-11-08T12:00:00Z")),
      }),
    ).toThrow(/Schéma refusé/);
  });
});
