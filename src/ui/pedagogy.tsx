import { useState } from "react";
import { Link } from "react-router-dom";
import type { GlossaryEntry, ThroughLine, WeekBriefing } from "../domain/curriculumDocument";

export function ThroughLines({ lines }: { lines: ThroughLine[] }) {
  return (
    <section>
      <h2>Fils conducteurs</h2>
      {lines.map((line) => (
        <section key={line.id}>
          <h3>{line.title}</h3>
          <p>{line.summary}</p>
          {line.steps.length > 0 ? (
            <details>
              <summary>Étapes</summary>
              <ol>
                {line.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </details>
          ) : null}
        </section>
      ))}
    </section>
  );
}

export function WeekBriefingView({ briefing }: { briefing: WeekBriefing }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={open ? "briefing is-open" : "briefing"}>
      <div className="briefing-body">
        <p>{briefing.whyThisWeek}</p>
        {paragraphs(briefing.keyIdea).map((part, index) => (
          <p key={`idee-${index}`}>{part}</p>
        ))}
        <Labeled label="Dimanche" text={briefing.sundayOutcome} />
        <Labeled label="Lien avec le rover" text={briefing.roverLink} />
        <Labeled label="De JavaScript vers la machine" text={briefing.jsToCTrap} />
        <Labeled label="La suite" text={briefing.nextUnlocks} />
        <Labeled label="Sans le robot" text={briefing.withoutRobot} />
      </div>
      <button type="button" className="text-button" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        {open ? "Replier le briefing" : "Lire le briefing"}
      </button>
    </div>
  );
}

export function WeekTerms({ weekId, entries }: { weekId: string; entries: GlossaryEntry[] }) {
  const terms = entries.filter((entry) => entry.weekIds.includes(weekId));
  if (terms.length === 0) return null;
  return (
    <ul className="term-chips">
      {terms.map((entry) => (
        <li key={entry.id}>
          <Link to={`/glossaire/${entry.id}`}>{entry.term}</Link>
        </li>
      ))}
    </ul>
  );
}

function Labeled({ label, text }: { label: string; text: string }) {
  return (
    <>
      <p className="task-kind">{label}</p>
      {paragraphs(text).map((part, index) => (
        <p key={`${label}-${index}`}>{part}</p>
      ))}
    </>
  );
}

function paragraphs(text: string): string[] {
  return text
    .split(/\n\n+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}
