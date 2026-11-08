import { describe, expect, it } from "vitest";
import { loadCurriculumDocument } from "../src/domain/loadCurriculum";
import { formatFrenchDate, formatFrenchNumeric, parisWeekday, parseFrenchNumeric } from "../src/domain/time";
import { labelForHref, resourceParts, richPieces, slotTasks } from "../src/ui/present";
import { saveLabel } from "../src/ui/status";

describe("libellés et dates", () => {
  it("ne montre jamais l’URL complète et garde les libellés imposés", () => {
    const playlist = "https://www.youtube.com/playlist?list=PLZHQObOWTQDPD3MizzM2xVFitgF8hE_ab";
    expect(labelForHref(playlist, "épisodes de « Essence of linear algebra »")).toBe("Playlist Essence of linear algebra");
    expect(labelForHref("https://missing.csail.mit.edu/")).toBe("Missing Semester");
    expect(labelForHref("https://www.ti.com/lit/ds/symlink/ina219.pdf")).toBe("INA219");
    expect(labelForHref("https://learn.sparkfun.com/tutorials/pulse-width-modulation")).not.toMatch(/^https?:\/\//);

    const document = loadCurriculumDocument();
    for (const week of document.weeks) {
      if (!("slots" in week.scheduleNotes)) continue;
      for (const slot of week.scheduleNotes.slots) {
        for (const part of resourceParts(slot.res, slot.contenu)) {
          if (part.kind === "link") {
            expect(part.label).not.toMatch(/https?:\/\//);
            expect(part.label).not.toBe(part.href);
          } else {
            expect(part.text).not.toMatch(/https?:\/\//);
          }
        }
        const tasks = slotTasks(slot.contenu);
        const joined = [...tasks.read, ...tasks.do].join(" ");
        expect(tasks.read.length + tasks.do.length).toBeGreaterThan(0);
        for (const word of slot.contenu.split(/\s+/)) {
          const cleaned = word.replace(/^[.;]+|[.;]+$/g, "");
          if (!cleaned || cleaned === "Puis" || cleaned === "·") continue;
          expect(joined).toContain(cleaned);
        }
      }
    }

    const s1 = document.weeks[0];
    if (!s1 || !("slots" in s1.scheduleNotes)) throw new Error("S1 absente");
    const mardi = s1.scheduleNotes.slots[0];
    const samedi = s1.scheduleNotes.slots[2];
    if (!mardi || !samedi) throw new Error("créneaux S1 absents");
    const mardiTasks = slotTasks(mardi.contenu);
    expect(mardiTasks.read.join(" ")).toMatch(/Essence of linear algebra/);
    expect(mardiTasks.do.join(" ")).toMatch(/\[\[0,-1\],\[1,0\]\]/);
    expect(richPieces(mardiTasks.do.join(" "))).toContainEqual({ kind: "code", text: "[[0,-1],[1,0]]" });
    expect(resourceParts(mardi.res, mardi.contenu)).toContainEqual({
      kind: "link",
      href: playlist,
      label: "Playlist Essence of linear algebra",
    });
    const samediParts = resourceParts(samedi.res, samedi.contenu);
    expect(samediParts).toContainEqual({ kind: "link", href: "https://missing.csail.mit.edu/", label: "Missing Semester" });
    expect(samediParts).toContainEqual({ kind: "text", text: "wiki UGV Rover (format JSON)" });
    const samediTasks = slotTasks(samedi.contenu);
    expect(samediTasks.read.join(" ")).toMatch(/Linux/);
    expect(samediTasks.do.join(" ")).toMatch(/parseur/);
  });

  it("lit le 8 novembre 2026 et non le 11 août", () => {
    expect(formatFrenchDate("2026-11-08")).toBe("8 novembre 2026");
    expect(formatFrenchNumeric("2026-11-08")).toBe("08/11/2026");
    expect(parseFrenchNumeric("08/11/2026")).toBe("2026-11-08");
    expect(parseFrenchNumeric("11/08/2026")).toBe("2026-08-11");
    expect(parseFrenchNumeric("31/02/2026")).toBeNull();
    expect(parseFrenchNumeric("2026-11-08")).toBeNull();
    expect(parisWeekday(new Date("2026-11-08T18:00:00Z"))).toBe("dimanche");
    expect(parisWeekday(new Date("2026-11-09T12:00:00Z"))).toBe("lundi");
  });

  it("présente l’enregistrement comme un état", () => {
    expect(saveLabel("saved")).toBe("Enregistré");
    expect(saveLabel("dirty")).toBe("Non enregistré");
    expect(saveLabel("offline")).toBe("Hors ligne");
  });
});
