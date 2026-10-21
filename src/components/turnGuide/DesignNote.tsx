import { CAT_LABEL } from "./guideTypes.ts";
import type { DesignNoteData, NoteCat } from "./guideTypes.ts";
import { NOTE_COUNTS } from "./walk.ts";

export function Paras({ text }: { text: string }) {
  return (
    <>
      {text.split("\n").map((line, i) => (
        <p key={i}>
          {line}
        </p>
      ))}
    </>
  );
}

/** Quiet side comments on the written rules at this step. */
export function DesignNotes({ notes }: { notes: DesignNoteData[] }) {
  if (!notes.length) return null;
  return (
    <div className="tg-notes" role="group" aria-label="Design notes">
      {notes.map((n) => (
        <div key={n.text} className={`tg-note ${n.cat}`}>
          <span className="tg-cat">Design note · {CAT_LABEL[n.cat]}</span>
          <p>{n.text}</p>
        </div>
      ))}
    </div>
  );
}

export function NoteBadge({ notes }: { notes: DesignNoteData[] }) {
  if (!notes.length) return null;
  const cats = [...new Set(notes.map((n) => n.cat))];
  return (
    <span className="tg-badge" title={cats.map((c) => CAT_LABEL[c]).join(", ")}>
      {notes.length} note{notes.length > 1 ? "s" : ""}
    </span>
  );
}

const CATS: NoteCat[] = ["dead", "nochoice", "nodown", "judged", "quirk"];

export function NoteSummary() {
  const { total, byCat } = NOTE_COUNTS;
  return (
    <p className="tg-summary dim">
      <b>{total} design notes</b> on the written rules:{" "}
      {CATS.map((c, i) => (
        <span key={c}>
          {i ? " · " : ""}
          {byCat[c]} {CAT_LABEL[c].toLowerCase()}
        </span>
      ))}
      .
    </p>
  );
}
