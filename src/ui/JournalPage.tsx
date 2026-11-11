import { useState, type FormEvent } from "react";
import { minutesEntered, type JournalEntry } from "../domain/schemas";
import { formatFrenchDate, formatFrenchNumeric, parisTimestamp, parisToday, parseFrenchNumeric } from "../domain/time";
import { activePhaseMinutes, entryKindLabel, journalTimeline, minutesOnDate, weekLabel } from "./atelier";
import { useVault } from "./vault";

export function JournalPage() {
  const { session, snap } = useVault();
  const [noted, setNoted] = useState(false);
  if (snap.phase !== "ready" || !snap.journal || !snap.curriculum || !snap.manifest) {
    return <p>{snap.phase === "error" ? snap.errorMessage : "Ouverture du coffre…"}</p>;
  }
  const journal = snap.journal;
  const curriculum = snap.curriculum;
  const activeId = snap.manifest.activeWeekId;
  const today = parisToday(new Date());
  const entries = journalTimeline(journal.entries);
  return (
    <article className="page">
      <h1 className="display">Journal</h1>
      <p>Une séance n’est enregistrée que lorsque vous l’ajoutez.</p>
      <dl className="totals">
        <div>
          <dt>Aujourd’hui</dt>
          <dd>{minutesOnDate(journal, today)} min</dd>
        </div>
        <div>
          <dt>Cette semaine</dt>
          <dd>{minutesEntered(journal, activeId)} min</dd>
        </div>
        <div>
          <dt>Cette phase</dt>
          <dd>{activePhaseMinutes(journal, curriculum, activeId)} min</dd>
        </div>
        <div>
          <dt>Total</dt>
          <dd>{minutesEntered(journal)} min</dd>
        </div>
      </dl>
      {noted ? (
        <p className="session-note" role="status">
          Séance notée.
        </p>
      ) : null}
      {entries.length === 0 ? (
        <p className="empty-journal">Rien n’est encore noté. La première séance, même courte, a sa place ici.</p>
      ) : (
        <ol className="timeline">
          {entries.map((entry) => (
            <li key={entry.id}>
              <p className="timeline-date">
                <time dateTime={entry.localDate}>{formatFrenchDate(entry.localDate)}</time>
                <span className="muted"> · {formatFrenchNumeric(entry.localDate)}</span>
              </p>
              <p className="timeline-meta">
                {weekLabel(curriculum, entry.weekId)} · {entry.minutes} min · {entryKindLabel(entry.kind)}
              </p>
              <p>{entry.summary}</p>
            </li>
          ))}
        </ol>
      )}
      <SessionForm
        weekId={activeId}
        weeks={curriculum.weeks.map((week) => week.id)}
        onAdd={(entry) => void session.addJournalEntry(entry)}
        onNoted={() => setNoted(true)}
      />
    </article>
  );
}

export function SessionForm({
  weekId,
  weeks,
  onAdd,
  onNoted,
}: {
  weekId: string;
  weeks: string[];
  onAdd: (entry: JournalEntry) => void;
  onNoted?: () => void;
}) {
  const [currentWeek, setCurrentWeek] = useState(weekId);
  const [dateText, setDateText] = useState(() => formatFrenchNumeric(parisToday(new Date())));
  const [minutes, setMinutes] = useState("");
  const [summary, setSummary] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [errorField, setErrorField] = useState<"date" | "minutes" | null>(null);
  const localDate = parseFrenchNumeric(dateText);

  function onSubmit(event?: FormEvent) {
    event?.preventDefault();
    const parsedDate = parseFrenchNumeric(dateText);
    if (!parsedDate) {
      setErrorField("date");
      setError("Indiquez la date au format JJ/MM/AAAA.");
      return;
    }
    const value = Number(minutes);
    if (!Number.isInteger(value) || value < 0 || value > 1440) {
      setErrorField("minutes");
      setError("Indiquez un nombre entier de minutes entre 0 et 1440.");
      return;
    }
    setError(null);
    setErrorField(null);
    onAdd({
      id: crypto.randomUUID(),
      weekId: currentWeek,
      kind: "study_session",
      localDate: parsedDate,
      timezone: "Europe/Paris",
      minutes: value,
      summary,
      evidenceIds: [],
      recordedAt: parisTimestamp(new Date()),
    });
    setMinutes("");
    setSummary("");
    onNoted?.();
  }

  const dateDescribedBy = errorField === "date" ? "journal-date-readout journal-date-error" : "journal-date-readout";
  const minutesDescribedBy =
    errorField === "minutes"
      ? "journal-minutes-example journal-minutes-unit journal-minutes-error"
      : "journal-minutes-example journal-minutes-unit";

  return (
    <form className="session-form" noValidate onSubmit={onSubmit}>
      <h2>Ajouter une séance</h2>
      <label htmlFor="journal-week">Semaine</label>
      <select id="journal-week" value={currentWeek} onChange={(event) => setCurrentWeek(event.target.value)}>
        {weeks.map((id) => (
          <option key={id} value={id}>
            {id}
          </option>
        ))}
      </select>
      <label htmlFor="journal-date">Date</label>
      <input
        id="journal-date"
        type="text"
        inputMode="numeric"
        autoComplete="off"
        spellCheck={false}
        placeholder="JJ/MM/AAAA"
        value={dateText}
        aria-invalid={errorField === "date" || undefined}
        aria-describedby={dateDescribedBy}
        onChange={(event) => setDateText(event.target.value)}
        required
      />
      <p id="journal-date-readout" className="sr-only">
        {localDate ? formatFrenchDate(localDate) : "Format JJ/MM/AAAA."}
      </p>
      <label htmlFor="journal-minutes">Minutes</label>
      <div className="minutes-field">
        <div className="suffix-field">
          <input
            id="journal-minutes"
            inputMode="numeric"
            aria-invalid={errorField === "minutes" || undefined}
            aria-describedby={minutesDescribedBy}
            value={minutes}
            onChange={(event) => setMinutes(event.target.value)}
            required
          />
          <span id="journal-minutes-unit">min</span>
        </div>
        <p id="journal-minutes-example" className="hint">
          ex. 90
        </p>
      </div>
      <label htmlFor="journal-summary">Résumé</label>
      <textarea id="journal-summary" value={summary} onChange={(event) => setSummary(event.target.value)} />
      {error ? (
        <p id={errorField === "date" ? "journal-date-error" : "journal-minutes-error"} role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit">Ajouter la séance</button>
    </form>
  );
}
