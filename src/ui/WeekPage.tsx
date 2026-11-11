import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useLocation, useParams } from "react-router-dom";
import { copyBytes } from "../crypto/bytes";
import { newObjectId } from "../domain/limits";
import type { CurriculumDocument, StudyQuestion, WeekDocument } from "../domain/curriculumDocument";
import { minutesEntered, parseWeekRecord, type AnswerValue, type WeekRecord } from "../domain/schemas";
import { assertNever } from "../domain/assert";
import { formatFrenchDate, formatFrenchNumeric, parisWeekday } from "../domain/time";
import { entryKindLabel, paceFigure, sameDayName } from "./atelier";
import { readScrollTarget, scrollToId } from "./anchor";
import { SessionForm } from "./JournalPage";
import { MarkdownText } from "./markdown";
import { TimeMeter } from "./Meter";
import { WeekBriefingView, WeekTerms } from "./pedagogy";
import { labelForHref } from "./present";
import { SlotList } from "./slots";
import { useVault } from "./vault";

const TABS = [
  { id: "plan", label: "Plan" },
  { id: "je-sais", label: "Je sais" },
  { id: "exercices", label: "Exercices" },
  { id: "notes-bilan", label: "Notes & bilan" },
  { id: "preuves", label: "Preuves" },
] as const;

type WeekTab = (typeof TABS)[number]["id"];

const TAB_IDS = TABS.map((item) => item.id);

export function WeekPage() {
  const { weekId = "" } = useParams();
  const location = useLocation();
  const { session, snap } = useVault();
  const [localError, setLocalError] = useState<string | null>(null);
  const [href, setHref] = useState("");
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [consented, setConsented] = useState(false);
  const [preview, setPreview] = useState(false);
  const [noted, setNoted] = useState(false);
  const [chosenFile, setChosenFile] = useState<string | null>(null);
  const scrolledTo = useRef<string | null>(null);
  const scrollTo = readScrollTarget(location.state);
  const [tab, setTab] = useState<WeekTab>(scrollTo === "bilan" ? "notes-bilan" : "plan");
  const [sessionOpen, setSessionOpen] = useState(scrollTo === "seance");

  useEffect(() => {
    if (snap.phase === "ready") void session.ensureWeek(weekId);
  }, [session, snap.phase, weekId]);

  const recordReady = snap.phase === "ready" && Boolean(snap.weeks[weekId]);
  useEffect(() => {
    if (!scrollTo || !recordReady || scrolledTo.current === scrollTo) return;
    if (!document.getElementById(scrollTo)) return;
    scrolledTo.current = scrollTo;
    scrollToId(scrollTo);
  }, [scrollTo, recordReady, weekId]);

  if (snap.phase !== "ready" || !snap.curriculum || !snap.journal) return <p>{snap.errorMessage ?? "Ouverture du coffre…"}</p>;
  const plan = snap.curriculum.weeks.find((item) => item.id === weekId);
  const record = snap.weeks[weekId];
  if (!plan) return <p role="alert">Semaine inconnue.</p>;
  if (!record) return <p>Chargement de la semaine…</p>;
  const locked = snap.saveStatus === "conflict";
  const questions = [
    ...snap.curriculum.sourceQuestions.filter((item) => item.weekId === weekId),
    ...snap.curriculum.authoredComplement.questions.filter((item) => item.weekId === weekId),
  ];
  const minutes = minutesEntered(snap.journal, weekId);
  const hours = snap.curriculum.context.hoursPerWeek;
  const weekday = parisWeekday(new Date()).toLocaleLowerCase("fr-FR");
  const sunday = sameDayName(weekday, "dimanche");
  const slots = plan.detailLevel === "source-detailed" && "slots" in plan.scheduleNotes ? plan.scheduleNotes.slots : null;
  const todaySlot = slots?.some((slot) => sameDayName(slot.c, weekday)) ?? false;
  const currentWeek = snap.manifest?.activeWeekId === weekId;

  function onWeekTabKey(event: KeyboardEvent<HTMLDivElement>) {
    const next = moveTab(TAB_IDS, tab, event.key);
    if (!next) return;
    event.preventDefault();
    setTab(next);
    window.requestAnimationFrame(() => document.getElementById(`tab-${next}`)?.focus());
  }

  function onNoteTabKey(event: KeyboardEvent<HTMLDivElement>) {
    const next = moveTab(["ecrire", "apercu"] as const, preview ? "apercu" : "ecrire", event.key);
    if (!next) return;
    event.preventDefault();
    setPreview(next === "apercu");
    window.requestAnimationFrame(() => document.getElementById(next === "apercu" ? "tab-apercu" : "tab-ecrire")?.focus());
  }
  const declared = record.objectives.filter((item) => item.selfAssessment === "declared").length;
  const entries = snap.journal.entries.filter((entry) => entry.weekId === weekId);
  const block = weekBlock(snap.curriculum, plan);

  return (
    <article className="week page">
      <header className="week-head">
        <p className="meta">
          S{plan.weekNumber} · {plan.phase} · {hours} h
        </p>
        <h1>
          S{plan.weekNumber} — {plan.title}
        </h1>
        {plan.proofs.length > 0 ? (
          <p className="due">
            <strong>À rendre : </strong>
            {plan.proofs.join(" · ")}
          </p>
        ) : null}
        <div className="week-status">
          <div className="week-meta">
            <label htmlFor="week-state">État</label>
            <select
              id="week-state"
              value={record.state}
              disabled={locked}
              onChange={(event) => {
                const state = event.target.value;
                if (state === "not_started" || state === "in_progress" || state === "handed_in") {
                  session.updateWeek(weekId, (week) => ({ ...week, state }));
                }
              }}
            >
              <option value="not_started">Pas commencée</option>
              <option value="in_progress">En cours</option>
              <option value="handed_in">Write-up remis</option>
            </select>
          </div>
          <div className="week-pace">
            <p className="pace">{paceFigure(minutes, hours)}</p>
            <TimeMeter minutes={minutes} hours={hours} label="Temps saisi cette semaine" />
          </div>
        </div>
      </header>
      <Conflicts />
      <div className="week-tabs-wrap">
      <div className="week-tabs" role="tablist" aria-label="Semaine" onKeyDown={onWeekTabKey}>
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            className="text-button"
            role="tab"
            id={`tab-${item.id}`}
            aria-selected={tab === item.id}
            aria-controls={item.id}
            tabIndex={tab === item.id ? 0 : -1}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void session.saveWeek(weekId);
        }}
      >
      <section id="plan" role="tabpanel" aria-labelledby="tab-plan" hidden={tab !== "plan"} tabIndex={0}>
        {sunday && currentWeek ? (
          <p className="today-note">
            Aujourd’hui, le bilan du write-up.{" "}
            <button type="button" className="text-button" onClick={() => setTab("notes-bilan")}>
              Ouvrir le bilan
            </button>
          </p>
        ) : null}
        {slots ? (
          <>
            {!todaySlot && !sunday ? <p>Pas de créneau ce {weekday}. Le livrable et le plan de la semaine restent le repère.</p> : null}
            <SlotList slots={slots} weekday={weekday} />
          </>
        ) : (
          <>
            <p className="callout">Bloc indicatif, à détailler. Les objectifs ci-dessous sont ceux de la phase, pas un programme de semaine inventé.</p>
            {"note" in plan.scheduleNotes ? <p>{plan.scheduleNotes.note}</p> : null}
          </>
        )}
        {plan.briefing ? <WeekBriefingView briefing={plan.briefing} /> : null}
        {block && !plan.briefing ? (
          <>
            <p>{block.briefing.whyThisBlock}</p>
            <p>{block.briefing.hardwareNote}</p>
          </>
        ) : null}
        <WeekTerms weekId={weekId} entries={snap.curriculum.glossary} />
      </section>
        <section id="je-sais" role="tabpanel" aria-labelledby="tab-je-sais" hidden={tab !== "je-sais"} tabIndex={0}>
          <h2>Je sais…</h2>
          <p>Auto-évaluation. Cocher une case ne valide pas la compétence.</p>
          {record.objectives.length > 0 ? (
            <>
              <p>
                {declared} sur {record.objectives.length} déclarés
              </p>
              <fieldset disabled={locked} className="plain-set">
                <legend className="sr-only">Auto-évaluation</legend>
                <ul className="know-list">
                  {record.objectives.map((objective) => {
                    const text = plan.objectives.find((item) => item.id === objective.id)?.text ?? objective.id;
                    return (
                      <li key={objective.id} className="know-card">
                        <label>
                          <input
                            type="checkbox"
                            checked={objective.selfAssessment === "declared"}
                            onChange={(event) =>
                              session.updateWeek(weekId, (week) => ({
                                ...week,
                                objectives: week.objectives.map((item) =>
                                  item.id === objective.id
                                    ? { ...item, selfAssessment: event.target.checked ? "declared" : "not_yet" }
                                    : item,
                                ),
                              }))
                            }
                          />
                          {text}
                        </label>
                        {objective.selfAssessment === "declared" || objective.explanation.trim().length > 0 ? (
                          <>
                            <label htmlFor={`${objective.id}-note`}>Précision facultative</label>
                            <textarea
                              id={`${objective.id}-note`}
                              value={objective.explanation}
                              onChange={(event) =>
                                session.updateWeek(weekId, (week) => ({
                                  ...week,
                                  objectives: week.objectives.map((item) =>
                                    item.id === objective.id ? { ...item, explanation: event.target.value } : item,
                                  ),
                                }))
                              }
                            />
                          </>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </fieldset>
            </>
          ) : (
            <>
              <h3>Objectifs de phase</h3>
              <PhaseList phaseId={plan.phase} part="objectives" />
            </>
          )}
        </section>
        <section id="exercices" role="tabpanel" aria-labelledby="tab-exercices" hidden={tab !== "exercices"} tabIndex={0}>
          <h2>Exercices</h2>
          {questions.length > 0 ? (
            questions.map((question, index) => (
              <QuestionField
                key={question.id}
                legend={`Question ${index + 1} sur ${questions.length}`}
                question={question}
                record={record}
                disabled={locked}
                weekId={weekId}
                last={index === questions.length - 1}
              />
            ))
          ) : (
            <>
              <h3>Exercices de phase</h3>
              <PhaseList phaseId={plan.phase} part="exercises" />
            </>
          )}
        </section>
        <section id="notes-bilan" role="tabpanel" aria-labelledby="tab-notes-bilan" hidden={tab !== "notes-bilan"} tabIndex={0}>
          <h2 id="notes-title">Notes</h2>
          <div className="note-tabs" role="tablist" aria-label="Édition des notes" onKeyDown={onNoteTabKey}>
            <button type="button" className="text-button" role="tab" id="tab-ecrire" aria-selected={!preview} aria-controls="notes-ecrire" tabIndex={preview ? -1 : 0} onClick={() => setPreview(false)}>
              Écrire
            </button>
            <button type="button" className="text-button" role="tab" id="tab-apercu" aria-selected={preview} aria-controls="notes-apercu" tabIndex={preview ? 0 : -1} onClick={() => setPreview(true)}>
              Aperçu
            </button>
          </div>
          <div id="notes-ecrire" role="tabpanel" aria-labelledby="tab-ecrire" hidden={preview}>
            <label className="sr-only" htmlFor="notes">
              Notes
            </label>
            <textarea
              id="notes"
              className="writing"
              value={record.notes}
              disabled={locked}
              onChange={(event) => session.updateWeek(weekId, (week) => ({ ...week, notes: event.target.value }))}
            />
          </div>
          <div id="notes-apercu" role="tabpanel" aria-labelledby="tab-apercu" hidden={!preview} className="markdown-preview">
            {record.notes ? <MarkdownText text={record.notes} /> : <p>Rien à prévisualiser.</p>}
          </div>
        <section id="bilan" className="ritual" tabIndex={-1}>
          <h2>Bilan du dimanche</h2>
          <p>Appris, blocages, prochaine action — le write-up de la semaine.</p>
          <label htmlFor="learned">Appris</label>
          <textarea
            id="learned"
            value={record.writeUp.learned}
            disabled={locked}
            onChange={(event) => session.updateWeek(weekId, (week) => ({ ...week, writeUp: { ...week.writeUp, learned: event.target.value } }))}
          />
          <label htmlFor="difficulties">Blocages</label>
          <textarea
            id="difficulties"
            value={record.writeUp.difficulties}
            disabled={locked}
            onChange={(event) =>
              session.updateWeek(weekId, (week) => ({ ...week, writeUp: { ...week.writeUp, difficulties: event.target.value } }))
            }
          />
          <label htmlFor="next-steps">Prochaine action</label>
          <textarea
            id="next-steps"
            value={record.writeUp.nextSteps}
            disabled={locked}
            onChange={(event) =>
              session.updateWeek(weekId, (week) => ({ ...week, writeUp: { ...week.writeUp, nextSteps: event.target.value } }))
            }
          />
          <button type="submit">Enregistrer</button>
        </section>
        </section>
      </form>
      <section id="preuves" role="tabpanel" aria-labelledby="tab-preuves" className="panel" hidden={tab !== "preuves"} tabIndex={0}>
        <h2>Preuves</h2>
        <p>10 Mio maximum. Le nom du fichier reste dans le coffre chiffré.</p>
        <label className="file-button">
          <input
            className="sr-only"
            aria-label="Ajouter une preuve"
            type="file"
            disabled={locked}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) return;
              setChosenFile(file.name);
              void file.arrayBuffer().then((buffer) =>
                session
                  .uploadEvidence(weekId, {
                    filename: file.name,
                    mimeType: file.type || "application/octet-stream",
                    bytes: new Uint8Array(buffer),
                  })
                  .then(() => setLocalError(null))
                  .catch((error: unknown) => {
                    setLocalError(error instanceof Error ? error.message : "Envoi impossible");
                  }),
              );
            }}
          />
          {chosenFile ?? "Choisir un fichier"}
        </label>
        <label htmlFor="proof-url">Lien</label>
        <input id="proof-url" value={href} onChange={(event) => setHref(event.target.value)} disabled={locked} />
        <label htmlFor="proof-visibility">Visibilité du lien</label>
        <select
          id="proof-visibility"
          value={visibility}
          disabled={locked}
          onChange={(event) => setVisibility(event.target.value === "public" ? "public" : "private")}
        >
          <option value="private">privée</option>
          <option value="public">publique</option>
        </select>
        <label>
          <input type="checkbox" checked={consented} disabled={locked} onChange={(event) => setConsented(event.target.checked)} />
          Je consens à enregistrer ce lien dans le coffre
        </label>
        <button
          type="button"
          className="proof-add"
          disabled={locked || !consented}
          onClick={() => {
            try {
              session.updateWeek(weekId, (week) =>
                parseWeekRecord({
                  ...week,
                  evidence: [...week.evidence, { id: newObjectId(), kind: "url", href, visibility, consented: true }],
                }),
              );
              setHref("");
              setConsented(false);
              setLocalError(null);
            } catch {
              setLocalError("Lien refusé. Utilisez une adresse http ou https, et cochez le consentement.");
            }
          }}
        >
          Ajouter le lien
        </button>
        {localError ? <p role="alert">{localError}</p> : null}
        <ul className="evidence-list">
          {record.evidence.map((item) =>
            item.kind === "file" ? (
              <li key={item.id}>
                <span>
                  {item.filename} · {item.byteLength} octets
                </span>
                <button
                  type="button"
                  onClick={() => {
                    void session.downloadEvidence(weekId, item.id).then((file) => {
                      const url = URL.createObjectURL(new Blob([copyBytes(file.bytes)], { type: "application/octet-stream" }));
                      const anchor = document.createElement("a");
                      anchor.href = url;
                      anchor.download = file.filename;
                      anchor.rel = "noopener";
                      anchor.click();
                      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
                    });
                  }}
                >
                  Télécharger
                </button>
              </li>
            ) : (
              <li key={item.id}>
                <a href={item.href} rel="noreferrer noopener" target="_blank">
                  {labelForHref(item.href)}
                </a>
                <span>{visibilityLabel(item.visibility)}</span>
              </li>
            ),
          )}
        </ul>
      </section>
      <section id="seance" className="session-card" tabIndex={-1}>
        {noted ? (
          <p className="session-note" role="status">
            Séance notée.
          </p>
        ) : null}
        {entries.length > 0 ? (
          <ol className="timeline">
            {entries.map((entry) => (
              <li key={entry.id}>
                <p className="timeline-date">
                  <time dateTime={entry.localDate}>{formatFrenchDate(entry.localDate)}</time>
                  <span className="muted"> · {formatFrenchNumeric(entry.localDate)}</span>
                </p>
                <p className="timeline-meta">
                  {entry.minutes} min · {entryKindLabel(entry.kind)}
                </p>
                <p>{entry.summary}</p>
              </li>
            ))}
          </ol>
        ) : null}
        {sessionOpen ? (
          <SessionForm
            weekId={weekId}
            weeks={[weekId]}
            onAdd={(entry) => {
              void session.addJournalEntry(entry);
            }}
            onNoted={() => setNoted(true)}
          />
        ) : (
          <button type="button" onClick={() => setSessionOpen(true)}>
            Noter une séance
          </button>
        )}
      </section>
    </article>
  );
}

function moveTab<T extends string>(ids: readonly T[], current: T, key: string): T | null {
  const index = ids.indexOf(current);
  if (index < 0) return null;
  if (key === "ArrowRight") return ids[(index + 1) % ids.length];
  if (key === "ArrowLeft") return ids[(index - 1 + ids.length) % ids.length];
  if (key === "Home") return ids[0];
  if (key === "End") return ids[ids.length - 1];
  return null;
}

function weekBlock(curriculum: CurriculumDocument, week: WeekDocument) {
  const phase = curriculum.phases.find((item) => item.id === week.phase);
  return phase?.blocks.find((item) => week.weekNumber >= item.fromWeek && week.weekNumber <= item.toWeek) ?? null;
}

function visibilityLabel(visibility: "private" | "public"): string {
  switch (visibility) {
    case "private":
      return "privée";
    case "public":
      return "publique";
    default: {
      const neverVisibility: never = visibility;
      return neverVisibility;
    }
  }
}

function PhaseList({ phaseId, part }: { phaseId: string; part: "objectives" | "exercises" }) {
  const { snap } = useVault();
  const phase = snap.curriculum?.phases.find((item) => item.id === phaseId);
  const indicative = snap.curriculum?.weeks.some((item) => item.phase === phaseId && item.detailLevel === "indicative-block-only") ?? false;
  if (!phase || !indicative) return null;
  const items = part === "objectives" ? phase.objectives : phase.exercices;
  return (
    <ul>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function QuestionField({
  question,
  record,
  weekId,
  disabled,
  legend,
  last,
}: {
  question: StudyQuestion;
  record: WeekRecord;
  weekId: string;
  disabled: boolean;
  legend: string;
  last: boolean;
}) {
  const { session } = useVault();
  const [hints, setHints] = useState(0);
  return (
    <fieldset className={last ? "exercise-card is-last" : "exercise-card"} disabled={disabled}>
      <legend>{legend}</legend>
      <p>{question.prompt}</p>
      {renderAnswer(question, record, (value) =>
        session.updateWeek(weekId, (week) => ({
          ...week,
          answers: [...week.answers.filter((item) => item.questionId !== question.id), { questionId: question.id, value }],
        })),
      )}
      {question.hints.slice(0, hints).map((hint, index) => (
        <p key={hint}>
          Indice {index + 1}. {hint}
        </p>
      ))}
      {hints < question.hints.length ? (
        <button type="button" className="hint-button" onClick={() => setHints((count) => count + 1)}>
          Afficher l’indice {hints + 1}
        </button>
      ) : null}
    </fieldset>
  );
}

function renderAnswer(question: StudyQuestion, record: WeekRecord, onChange: (value: AnswerValue) => void) {
  const current = record.answers.find((item) => item.questionId === question.id)?.value;
  switch (question.answerKind) {
    case "text":
      return (
        <textarea
          aria-label={question.prompt}
          value={current?.kind === "text" ? current.text : ""}
          onChange={(event) => onChange({ kind: "text", text: event.target.value })}
        />
      );
    case "checkboxes":
      return question.options.map((option) => {
        const selected = current?.kind === "checkboxes" ? current.selectedIds : [];
        return (
          <label className="choice" key={option.id}>
            <input
              type="checkbox"
              checked={selected.includes(option.id)}
              onChange={(event) => {
                const next = event.target.checked ? [...selected, option.id] : selected.filter((id) => id !== option.id);
                onChange({ kind: "checkboxes", selectedIds: next });
              }}
            />
            {option.label}
          </label>
        );
      });
    default:
      return assertNever(question.answerKind);
  }
}

function Conflicts() {
  const { session, snap } = useVault();
  if (snap.conflicts.length === 0) return null;
  return (
    <section id="conflit" className="conflict" tabIndex={-1} aria-labelledby="conflit-title">
      <h2 id="conflit-title">Conflit</h2>
      {snap.conflicts.map((conflict) => (
        <div key={conflict.key}>
          <p>{conflict.label}</p>
          <p>Votre version : {conflict.localText}</p>
          <p>Version du coffre : {conflict.remoteText}</p>
          <button type="button" onClick={() => session.resolveConflict(conflict.key, "local")}>
            Garder la mienne
          </button>
          <button type="button" onClick={() => session.resolveConflict(conflict.key, "remote")}>
            Garder celle du coffre
          </button>
        </div>
      ))}
    </section>
  );
}
