import { useEffect, useRef, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { copyBytes } from "../crypto/bytes";
import { newObjectId } from "../domain/limits";
import type { StudyQuestion } from "../domain/curriculumDocument";
import { minutesEntered, parseWeekRecord, type AnswerValue, type WeekRecord } from "../domain/schemas";
import { assertNever } from "../domain/assert";
import { formatFrenchDate, formatFrenchNumeric, parisWeekday } from "../domain/time";
import { enteredTimeCopy, entryKindLabel, sameDayName } from "./atelier";
import { followAnchor, readScrollTarget, scrollToId } from "./anchor";
import { SessionForm } from "./JournalPage";
import { MarkdownText } from "./markdown";
import { TimeMeter } from "./Meter";
import { labelForHref } from "./present";
import { SlotList } from "./slots";
import { useVault } from "./vault";

const TOC = [
  ["plan", "Plan"],
  ["je-sais", "Je sais"],
  ["exercices", "Exercices"],
  ["notes", "Notes"],
  ["bilan", "Bilan"],
  ["preuves", "Preuves"],
  ["seance", "Séance"],
] as const;

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
  const scrolledTo = useRef<string | null>(null);
  const scrollTo = readScrollTarget(location.state);

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
  const authoredQuestions = questions.filter((item) => item.origin === "authored");
  const verificationQuestions = questions.filter((item) => item.origin === "canvas");
  const minutes = minutesEntered(snap.journal, weekId);
  const hours = snap.curriculum.context.hoursPerWeek;
  const weekday = parisWeekday(new Date()).toLocaleLowerCase("fr-FR");
  const sunday = sameDayName(weekday, "dimanche");
  const slots = plan.detailLevel === "source-detailed" && "slots" in plan.scheduleNotes ? plan.scheduleNotes.slots : null;
  const todaySlot = slots?.some((slot) => sameDayName(slot.c, weekday)) ?? false;
  const currentWeek = snap.manifest?.activeWeekId === weekId;
  const declared = record.objectives.filter((item) => item.selfAssessment === "declared").length;
  const entries = snap.journal.entries.filter((entry) => entry.weekId === weekId);

  return (
    <article className="week">
      <header className="week-head">
        <h1>
          S{plan.weekNumber} — {plan.title}
        </h1>
        {plan.proofs.length > 0 ? (
          <p className="due">
            <strong>À rendre : </strong>
            {plan.proofs.join(" · ")}
          </p>
        ) : null}
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
        <p className="progress-copy">{enteredTimeCopy(minutes, hours)}</p>
        <TimeMeter minutes={minutes} hours={hours} label="Temps saisi cette semaine" />
        {plan.detailLevel === "source-detailed" ? <p>Semaine détaillée du programme.</p> : null}
      </header>
      <Conflicts />
      <nav className="week-toc" aria-label="Sommaire de la semaine">
        {TOC.map(([id, label]) => (
          <a key={id} href={`#${id}`} onClick={(event) => followAnchor(event, id)}>
            {label}
          </a>
        ))}
      </nav>
      <section id="plan" tabIndex={-1}>
        <h2>Plan</h2>
        {sunday && currentWeek ? (
          <p className="today-note">
            Aujourd’hui, le bilan du write-up.{" "}
            <a href="#bilan" onClick={(event) => followAnchor(event, "bilan")}>
              Ouvrir le bilan
            </a>
          </p>
        ) : null}
        {slots ? (
          <>
            {!todaySlot && !sunday ? <p>Pas de créneau ce {weekday}. Le livrable et le plan de la semaine restent le repère.</p> : null}
            <SlotList slots={slots} weekday={weekday} />
          </>
        ) : (
          <p className="callout">Bloc indicatif, à détailler. Les objectifs ci-dessous sont ceux de la phase, pas un programme de semaine inventé.</p>
        )}
      </section>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void session.saveWeek(weekId);
        }}
      >
        <section id="je-sais" tabIndex={-1}>
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
        <section id="exercices" tabIndex={-1}>
          <h2>Exercices</h2>
          {verificationQuestions.map((question) => (
            <QuestionField
              key={question.id}
              legend="Exercice de vérification"
              question={question}
              record={record}
              disabled={locked}
              weekId={weekId}
            />
          ))}
          {authoredQuestions.length > 0 ? (
            <>
              <h3>Questions</h3>
              {authoredQuestions.map((question) => (
                <QuestionField key={question.id} legend="Questions" question={question} record={record} disabled={locked} weekId={weekId} />
              ))}
            </>
          ) : null}
          {verificationQuestions.length === 0 && authoredQuestions.length === 0 ? (
            <>
              <h3>Exercices de phase</h3>
              <PhaseList phaseId={plan.phase} part="exercises" />
            </>
          ) : null}
        </section>
        <section id="notes" tabIndex={-1}>
          <div className="notes-head">
            <h2>
              <label htmlFor="notes">Notes</label>
            </h2>
            <button type="button" className="quiet" aria-pressed={preview} disabled={locked} onClick={() => setPreview((value) => !value)}>
              {preview ? "Masquer l’aperçu" : "Aperçu"}
            </button>
          </div>
          <div className={preview ? "notes-stage is-preview" : "notes-stage"}>
            <textarea
              id="notes"
              className="writing"
              value={record.notes}
              disabled={locked}
              onChange={(event) => session.updateWeek(weekId, (week) => ({ ...week, notes: event.target.value }))}
            />
            {preview ? (
              <div className="markdown-preview">
                {record.notes ? <MarkdownText text={record.notes} /> : <p>Rien à prévisualiser.</p>}
              </div>
            ) : null}
          </div>
        </section>
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
        </section>
        <button type="submit">Enregistrer</button>
      </form>
      <section id="preuves" className="panel" tabIndex={-1}>
        <h2>Preuves</h2>
        <p>10 Mio maximum. Le nom du fichier reste dans le coffre chiffré.</p>
        <input
          aria-label="Ajouter une preuve"
          type="file"
          disabled={locked}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
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
      <section id="seance" className="ritual" tabIndex={-1}>
        <p>La séance se note ici, à la fin, pendant que c’est encore frais.</p>
        {noted ? (
          <p className="session-note" role="status">
            Séance notée.
          </p>
        ) : null}
        {entries.length === 0 ? (
          <p>Rien n’est encore noté pour cette semaine.</p>
        ) : (
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
        )}
        <SessionForm
          weekId={weekId}
          weeks={[weekId]}
          onAdd={(entry) => {
            void session.addJournalEntry(entry);
          }}
          onNoted={() => setNoted(true)}
        />
      </section>
    </article>
  );
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
}: {
  question: StudyQuestion;
  record: WeekRecord;
  weekId: string;
  disabled: boolean;
  legend: string;
}) {
  const { session } = useVault();
  const [hints, setHints] = useState(0);
  return (
    <fieldset className="exercise-card" disabled={disabled}>
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
        <button type="button" onClick={() => setHints((count) => count + 1)}>
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
          <label key={option.id}>
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
