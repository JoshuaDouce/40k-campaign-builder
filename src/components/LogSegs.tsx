import type { LogSeg } from "../game/index.ts";

/** A log line's text: bold segments as <b>. Plain text only, never HTML. */
export function LogSegs({ segs }: { segs: LogSeg[] }) {
  return <>{segs.map((g, i) => (g.b ? <b key={i}>{g.t}</b> : <span key={i}>{g.t}</span>))}</>;
}
