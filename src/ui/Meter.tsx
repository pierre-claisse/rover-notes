export function TimeMeter({ minutes, hours, label }: { minutes: number; hours: number; label: string }) {
  const max = Math.max(0, Math.round(hours * 60));
  if (max <= 0) return null;
  const shown = Math.min(Math.max(0, minutes), max);
  const ratio = shown / max;
  return (
    <div
      className="meter"
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={shown}
      aria-valuetext={`${minutes} min saisies, rythme ${hours} h`}
    >
      <span style={{ width: ratio === 0 ? "16px" : `${Math.max(ratio * 100, 2)}%` }} />
    </div>
  );
}
