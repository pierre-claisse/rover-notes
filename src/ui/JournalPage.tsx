import { useState, type FormEvent } from "react";
import { minutesEntered, type JournalEntry } from "../domain/schemas";
import { formatFrenchDate, formatFrenchNumeric, parisTimestamp, parisToday, parseFrenchNumeric } from "../domain/time";
import { useVault } from "./vault";

export function JournalPage() {
  const { session, snap } = useVault();
  if (snap.phase !== "ready" || !snap.journal || !snap.curriculum || !snap.manifest) {
    return <p>{snap.phase === "error" ? snap.errorMessage : "Ouverture du coffre…"}</p>;
  }
  const total = minutesEntered(snap.journal);
  return (
    <article>
      <h1>Journal</h1>
      <p>Temps saisi : {total} min. Une séance n’est enregistrée que lorsque vous l’ajoutez.</p>
      {snap.journal.entries.length === 0 ? <p>Aucune entrée sauvegardée.</p> : null}
      <ul>
        {snap.journal.entries.map((entry) => (
          <li key={entry.id}>
            {formatFrenchDate(entry.localDate)} · {entry.weekId} · {entry.minutes} min · {entry.kind === "study_session" ? "séance" : "bilan"} — {entry.summary}
          </li>
        ))}
      </ul>
      <SessionForm
        weekId={snap.manifest.activeWeekId}
        weeks={snap.curriculum.weeks.map((week) => week.id)}
        onAdd={(entry) => void session.addJournalEntry(entry)}
      />
    </article>
  );
}

export function SessionForm({
  weekId,
  weeks,
  onAdd,
}: {
  weekId: string;
  weeks: string[];
  onAdd: (entry: JournalEntry) => void;
}) {
  const [currentWeek, setCurrentWeek] = useState(weekId);
  const [dateText, setDateText] = useState(() => formatFrenchNumeric(parisToday(new Date())));
  const [minutes, setMinutes] = useState("");
  const [summary, setSummary] = useState("");
  const [error, setError] = useState<string | null>(null);
  const localDate = parseFrenchNumeric(dateText);

  function onSubmit(event?: FormEvent) {
    event?.preventDefault();
    const parsedDate = parseFrenchNumeric(dateText);
    if (!parsedDate) {
      setError("Indiquez la date au format JJ/MM/AAAA.");
      return;
    }
    const value = Number(minutes);
    if (!Number.isInteger(value) || value < 0 || value > 1440) {
      setError("Indiquez un nombre entier de minutes entre 0 et 1440.");
      return;
    }
    setError(null);
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
  }

  return (
    <form noValidate onSubmit={onSubmit}>
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
        aria-describedby="journal-date-readout"
        onChange={(event) => setDateText(event.target.value)}
        required
      />
      <p id="journal-date-readout">{localDate ? formatFrenchDate(localDate) : "Format JJ/MM/AAAA."}</p>
      <label htmlFor="journal-minutes">Minutes</label>
      <div className="suffix-field">
        <input
          id="journal-minutes"
          inputMode="numeric"
          placeholder="90"
          aria-describedby="journal-minutes-unit"
          value={minutes}
          onChange={(event) => setMinutes(event.target.value)}
          required
        />
        <span id="journal-minutes-unit">min</span>
      </div>
      <label htmlFor="journal-summary">Résumé</label>
      <textarea id="journal-summary" value={summary} onChange={(event) => setSummary(event.target.value)} />
      {error ? <p role="alert">{error}</p> : null}
      <button type="submit">Ajouter la séance</button>
    </form>
  );
}
