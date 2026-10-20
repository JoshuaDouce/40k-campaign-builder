import type { CampaignState, LogSeg } from "./types.ts";

/** Bold log segment. */
export function B(t: string): LogSeg {
  return { b: true, t };
}

/** Prepend a log entry (newest first, capped at 60). Plain strings become plain segments. */
export function log(s: CampaignState, ...parts: Array<string | LogSeg>): void {
  const segs = parts.map((p): LogSeg => (typeof p === "string" ? { t: p } : p));
  s.log.unshift({ r: s.round, segs });
  if (s.log.length > 60) s.log.length = 60;
}
