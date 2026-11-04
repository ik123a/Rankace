/**
 * Date formatting for the operational views.
 *
 * Every timestamp in Rankace comes from a crawl, and "3 minutes ago" is the
 * only form that answers the question the user actually has ("is this fresh?").
 * Absolute timestamps are kept as the accessible `title`, so the information is
 * never lost to the relative form.
 */
export function relativeTime(value: string | null | undefined): string {
  if (!value) return "never";
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return "unknown";

  const seconds = Math.round((Date.now() - then) / 1000);
  // Server clocks drift and a timestamp can legitimately be a second ahead of
  // the browser; report that as "just now" rather than "-1 minutes ago".
  if (seconds < 45) return "just now";
  if (seconds < 90) return "1 min ago";

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;

  const months = Math.round(days / 30);
  if (months < 12) return `${months}mo ago`;

  return `${Math.round(months / 12)}y ago`;
}

export function absoluteTime(value: string | null | undefined): string {
  if (!value) return "No audit recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return date.toLocaleString();
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}m ${String(rest).padStart(2, "0")}s`;
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toLocaleString();
}
