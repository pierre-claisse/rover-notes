export function parisTimestamp(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    timeZoneName: "longOffset",
  }).formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  let hour = read("hour");
  if (hour === "24") hour = "00";
  return `${read("year")}-${read("month")}-${read("day")}T${hour}:${read("minute")}:${read("second")}${normalizeOffset(read("timeZoneName"))}`;
}

export function parisToday(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function formatFrenchDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map((part) => Number(part));
  if (!year || !month || !day) return isoDate;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Paris",
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

function normalizeOffset(raw: string): string {
  const match = raw.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/);
  if (!match) throw new Error("Décalage horaire illisible");
  return `${match[1]}${match[2]!.padStart(2, "0")}:${(match[3] ?? "00").padStart(2, "0")}`;
}
