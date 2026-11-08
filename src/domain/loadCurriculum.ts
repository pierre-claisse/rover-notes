import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildCurriculumDocument, type CurriculumDocument } from "./curriculumDocument";

export function loadCurriculumDocument(): CurriculumDocument {
  const root = join(process.cwd(), "curriculum");
  const source = JSON.parse(readFileSync(join(root, "curriculum.json"), "utf8")) as unknown;
  const authored = JSON.parse(readFileSync(join(root, "authored-p0.json"), "utf8")) as unknown;
  const pedagogie = JSON.parse(readFileSync(join(root, "pedagogie.json"), "utf8")) as unknown;
  return buildCurriculumDocument(source, authored, pedagogie);
}
