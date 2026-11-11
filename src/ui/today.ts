export function todayHeadline(weekday: string, duration: string | null): string {
  const day = weekday.trim().toLocaleLowerCase("fr-FR");
  if (!duration) return `Aujourd’hui, ${day} : pas de créneau`;
  return `Aujourd’hui, ${day} : ${duration}`;
}
