import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { canonicalJson } from "../src/domain/json";
import { CURRICULUM_VERSION } from "../src/domain/limits";
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
    expect(CURRICULUM_VERSION).toBe("initial-canvas-import-v1");
    expect(document.curriculumVersion).toBe(CURRICULUM_VERSION);
    expect(document.programRevision).toBe(2);
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
    const authored = JSON.parse(readFileSync("curriculum/authored-p0.json", "utf8")) as { questions: { id: string; prompt: string }[] };
    expect(document.authoredComplement.questions.map((question) => [question.id, question.prompt])).toEqual(
      authored.questions.map((question) => [question.id, question.prompt]),
    );
  });

  it("porte les briefings, les récits et le glossaire sans dates inventées", () => {
    const document = loadCurriculumDocument();
    const detailed = document.weeks.filter((week) => week.detailLevel === "source-detailed");
    expect(detailed.map((week) => week.id)).toEqual(["P0-S1", "P0-S2", "P0-S3", "P0-S4", "P0-S5", "P0-S6", "P0-S7", "P0-S8", "P0-S9"]);
    for (const week of detailed) {
      expect(week.briefing?.whyThisWeek).toBeTruthy();
      expect(week.briefing?.keyIdea).toBeTruthy();
      expect(week.briefing?.sundayOutcome).toBeTruthy();
      expect(week.briefing?.roverLink).toBeTruthy();
      expect(week.briefing?.jsToCTrap).toBeTruthy();
      expect(week.briefing?.nextUnlocks).toBeTruthy();
      expect(week.briefing?.withoutRobot).toBeTruthy();
    }
    expect(document.weeks.filter((week) => week.detailLevel === "indicative-block-only" && week.briefing)).toHaveLength(0);
    expect(document.phases).toHaveLength(8);
    let blocks = 0;
    for (const phase of document.phases) {
      expect(phase.narrative.promise).toBeTruthy();
      expect(phase.narrative.hardwareNote).toBeTruthy();
      expect(phase.narrative.exitCriteria.length).toBeGreaterThan(0);
      expect(phase.narrative.throughLine).toBeTruthy();
      expect(phase.narrative.portfolioNote).toBeTruthy();
      expect(phase.narrative.commonPitfall).toBeTruthy();
      for (const block of phase.blocks) {
        blocks += 1;
        expect(block.briefing.whyThisBlock).toBeTruthy();
        expect(block.briefing.hardwareNote).toBeTruthy();
        expect(dated(block.briefing.whyThisBlock)).toBe(false);
        expect(dated(block.briefing.hardwareNote)).toBe(false);
      }
    }
    expect(blocks).toBe(23);
    expect(document.phases.filter((phase) => phase.id !== "P0").every((phase) => phase.blocks.length > 0)).toBe(true);
    expect(document.throughLines.map((line) => line.id)).toEqual(["parseur", "maths-mardi", "js-vers-c", "architecture"]);
    expect(document.glossary).toHaveLength(29);
    expect(document.homeCoach.activeWeekId).toBe("P0-S1");
    expect(document.homeCoach.honestCalendar).toContain("22 mois");
    expect(document.homeCoach.honestCalendar).toContain("pas 18");
    const dates = document.weeks.flatMap((week) => ("sourceMondayDate" in week.scheduleNotes ? [week.scheduleNotes.sourceMondayDate] : []));
    expect(dates).toEqual(["2 nov. 2026", "9 nov. 2026", "16 nov. 2026", "23 nov. 2026", "30 nov. 2026", "7 déc. 2026", "14 déc. 2026", "21 déc. 2026", "28 déc. 2026"]);
    const coachDates = `${document.homeCoach.body} ${document.homeCoach.honestCalendar}`.match(/\d{1,2}\s+novembre(?:\s+2026)?/gi) ?? [];
    expect(coachDates.map((item) => item.toLowerCase()).sort()).toEqual(["2 novembre 2026", "8 novembre 2026", "9 novembre"]);
    const s1 = document.weeks[0];
    expect(s1?.exercises.join("\n")).toContain("dépôt de travail distinct");
    expect(s1?.exercises.join("\n")).not.toContain("github.com/pierre-claisse/rover-notes");
    if (!s1 || !("slots" in s1.scheduleNotes)) throw new Error("S1 absente");
    expect(s1.scheduleNotes.slots[3]?.res).toBe("Le hub rover-notes (coffre) pour les notes ; un dépôt de code distinct pour le parseur");
    expect(s1.scheduleNotes.slots[3]?.contenu).toContain("coffre chiffré");
    expect(document.phases[0]?.done).toBe("Vous savez expliquer sans notes chaque fil entre le Pi et l'ESP32, et un test C passe en CI");
    const note = "Objectifs, exercices et livrables sont décrits au niveau de la phase. Le détail semaine par semaine sera écrit dans rover-notes à l’approche de cette phase, sans dates inventées.";
    for (const week of document.weeks) {
      if (week.detailLevel !== "indicative-block-only" || !("note" in week.scheduleNotes)) continue;
      expect(week.scheduleNotes.note).toBe(note);
      expect(week.scheduleNotes.note).not.toContain("Canvas");
      expect(dated(week.scheduleNotes.note)).toBe(false);
    }
    for (const gap of document.gaps) expect(gap).not.toMatch(/canvas/i);
    const student = JSON.stringify({
      done: document.phases.map((phase) => phase.done),
      narratives: document.phases.map((phase) => phase.narrative),
      briefings: document.weeks.map((week) => week.briefing),
      homeCoach: document.homeCoach,
      throughLines: document.throughLines,
      glossary: document.glossary,
    });
    expect(student).not.toMatch(/Tu sais/);
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

function dated(value: string): boolean {
  return /(?:\d{1,2}\s+)?(?:janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre|janv|févr|avr|juil|sept|oct|nov|déc)\b|\b20\d{2}\b|\b\d{1,2}\/\d{1,2}\/\d{4}\b/i.test(value);
}
