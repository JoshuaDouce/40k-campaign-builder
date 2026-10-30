import type { CampaignState, LogEntry, LogSeg } from "./types.ts";

/** Bold log segment. */
export function B(t: string): LogSeg {
  return { b: true, t };
}

/** How many entries were put on top of `log` since `prevTop` was its newest (`prevTop` missing = the log was empty). */
export function addedSince(log: LogEntry[], prevTop: LogEntry | undefined): number {
  return prevTop ? Math.max(0, log.indexOf(prevTop)) : log.length;
}

/** Prepend a log entry (newest first, capped at 60). Plain strings become plain segments. */
export function log(s: CampaignState, ...parts: Array<string | LogSeg>): void {
  const segs = parts.map((p): LogSeg => (typeof p === "string" ? { t: p } : p));
  s.log.unshift({ r: s.round, segs });
  if (s.log.length > 60) s.log.length = 60;
}
