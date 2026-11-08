import { describe, expect, it } from "vitest";
import { loadCurriculumDocument } from "../src/domain/loadCurriculum";
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
    expect(document.inconsistency.summary).toMatch(/S94/);
    expect(document.context.activeWeek).toBe("P0-S1");
    expect(document.context.completedHours).toBe(0);
    expect(document.context.robotPurchased).toBe(false);
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
