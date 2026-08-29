export type PopupFrequency = "EVERY_VISIT" | "ONCE_PER_SESSION" | "ONCE_PER_DAY" | "ONCE_PER_X_DAYS";

export function popupIsSeen(frequency: PopupFrequency, frequencyDays: number | null, storedValue: string | null, now = new Date()) {
  if (frequency === "EVERY_VISIT" || !storedValue) return false;
  if (frequency === "ONCE_PER_SESSION") return storedValue === "1";
  const seenAt = new Date(storedValue);
  if (Number.isNaN(seenAt.getTime())) return false;
  const intervalDays = frequency === "ONCE_PER_DAY" ? 1 : frequencyDays ?? 1;
  return now.getTime() < seenAt.getTime() + intervalDays * 24 * 60 * 60 * 1000;
}
