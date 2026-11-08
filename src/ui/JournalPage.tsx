import { useState, type FormEvent } from "react";
import { minutesEntered, type JournalEntry } from "../domain/schemas";
import { parisTimestamp, parisToday } from "../domain/time";
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
            {entry.localDate} · {entry.weekId} · {entry.minutes} min · {entry.kind === "study_session" ? "séance" : "bilan"} — {entry.summary}
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
  const [localDate, setLocalDate] = useState(() => parisToday(new Date()));
  const [minutes, setMinutes] = useState("");
  const [summary, setSummary] = useState("");
  const [error, setError] = useState<string | null>(null);

  function onSubmit(event?: FormEvent) {
    event?.preventDefault();
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
      localDate,
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
    <form onSubmit={onSubmit}>
      <h2>Ajouter des minutes</h2>
      <label htmlFor="journal-week">Semaine</label>
      <select id="journal-week" value={currentWeek} onChange={(event) => setCurrentWeek(event.target.value)}>
        {weeks.map((id) => (
          <option key={id} value={id}>
            {id}
          </option>
        ))}
      </select>
      <label htmlFor="journal-date">Date</label>
      <input id="journal-date" type="date" value={localDate} onChange={(event) => setLocalDate(event.target.value)} required />
      <label htmlFor="journal-minutes">Minutes</label>
      <input id="journal-minutes" inputMode="numeric" value={minutes} onChange={(event) => setMinutes(event.target.value)} required />
      <label htmlFor="journal-summary">Résumé</label>
      <textarea id="journal-summary" value={summary} onChange={(event) => setSummary(event.target.value)} />
      {error ? <p role="alert">{error}</p> : null}
      <button type="button" onClick={() => onSubmit()}>
        Ajouter la séance
      </button>
    </form>
  );
}
