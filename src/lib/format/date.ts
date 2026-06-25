export function formatDateSafe(iso: string | Date | null | undefined): string {
  if (!iso) return "-";
  const d = iso instanceof Date ? iso : new Date(iso);
  return Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "UTC",
  }).format(d);
}

export function formatDateTimeSafe(iso: string | Date | null | undefined): string {
  if (!iso) return "-";
  const d = iso instanceof Date ? iso : new Date(iso);
  return Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(d);
}
