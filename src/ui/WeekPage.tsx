import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { copyBytes } from "../crypto/bytes";
import { newObjectId } from "../domain/limits";
import { parseWeekRecord, type AnswerValue, type WeekRecord } from "../domain/schemas";
import type { StudyQuestion } from "../domain/curriculumDocument";
import { assertNever } from "../domain/assert";
import { SessionForm } from "./JournalPage";
import { MarkdownText } from "./markdown";
import { useVault } from "./vault";

export function WeekPage() {
  const { weekId = "" } = useParams();
  const { session, snap } = useVault();
  const [localError, setLocalError] = useState<string | null>(null);
  const [href, setHref] = useState("");
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [consented, setConsented] = useState(false);

  useEffect(() => {
    if (snap.phase === "ready") void session.ensureWeek(weekId);
  }, [session, snap.phase, weekId]);

  if (snap.phase !== "ready" || !snap.curriculum) return <p>{snap.errorMessage ?? "Ouverture du coffre…"}</p>;
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

  return (
    <article>
      <h1>
        S{plan.weekNumber} — {plan.title}
      </h1>
      {plan.detailLevel === "indicative-block-only" ? (
        <p className="callout">Bloc indicatif, à détailler. Les objectifs ci-dessous sont ceux de la phase, pas un programme de semaine inventé.</p>
      ) : (
        <p>Semaine détaillée du programme.</p>
      )}
      {plan.detailLevel === "source-detailed" && "slots" in plan.scheduleNotes ? (
        <ul>
          {plan.scheduleNotes.slots.map((slot) => (
            <li key={slot.c}>
              {slot.c} · {slot.d} — {slot.contenu}
            </li>
          ))}
        </ul>
      ) : null}
      <PhaseContext phaseId={plan.phase} />
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void session.saveWeek(weekId);
        }}
      >
        <fieldset disabled={locked}>
          <legend>Je sais…</legend>
          <p>Auto-évaluation. Cocher une case ne valide pas la compétence.</p>
          {record.objectives.map((objective) => {
            const text = plan.objectives.find((item) => item.id === objective.id)?.text ?? objective.id;
            return (
              <div key={objective.id}>
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
              </div>
            );
          })}
        </fieldset>
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
          <section>
            <h2>Questions</h2>
            {authoredQuestions.map((question) => (
              <QuestionField key={question.id} legend="Questions" question={question} record={record} disabled={locked} weekId={weekId} />
            ))}
          </section>
        ) : null}
        <label htmlFor="notes">Notes</label>
        <textarea
          id="notes"
          value={record.notes}
          disabled={locked}
          onChange={(event) => session.updateWeek(weekId, (week) => ({ ...week, notes: event.target.value }))}
        />
        {record.notes ? <MarkdownText text={record.notes} /> : null}
        <h2>Bilan du dimanche</h2>
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
        <button type="submit">Enregistrer</button>
      </form>
      <section>
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
              session.uploadEvidence(weekId, {
                filename: file.name,
                mimeType: file.type || "application/octet-stream",
                bytes: new Uint8Array(buffer),
              }).then(() => setLocalError(null)).catch((error: unknown) => {
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
        <ul>
          {record.evidence.map((item) =>
            item.kind === "file" ? (
              <li key={item.id}>
                {item.filename} · {item.byteLength} octets
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
                Lien ({item.visibility}) : {item.href}
              </li>
            ),
          )}
        </ul>
      </section>
      <Conflicts />
      <ul>
        {snap.journal?.entries
          .filter((entry) => entry.weekId === weekId)
          .map((entry) => (
            <li key={entry.id}>
              {entry.localDate} · {entry.minutes} min · {entry.summary}
            </li>
          ))}
      </ul>
      <SessionForm
        weekId={weekId}
        weeks={[weekId]}
        onAdd={(entry) => {
          void session.addJournalEntry(entry);
        }}
      />
    </article>
  );
}

function PhaseContext({ phaseId }: { phaseId: string }) {
  const { snap } = useVault();
  const phase = snap.curriculum?.phases.find((item) => item.id === phaseId);
  const week = snap.curriculum?.weeks.find((item) => item.phase === phaseId && item.detailLevel === "indicative-block-only");
  if (!phase || !week || week.detailLevel === "source-detailed") return null;
  return (
    <section>
      <h2>Objectifs de phase</h2>
      <ul>
        {phase.objectives.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <h2>Exercices de phase</h2>
      <ul>
        {phase.exercices.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
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
    <fieldset disabled={disabled}>
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
    <section>
      <h2>Conflit</h2>
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
