import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";

interface Props {
  title: string;
  onClose(): void;
  children: ReactNode;
}

/** The sheet's action row: one confirm button and Cancel. */
export function SheetFooter({ label, disabled, danger, onGo, onClose }: { label: ReactNode; disabled?: boolean; danger?: boolean; onGo(): void; onClose(): void }) {
  return (
    <div className="row sub">
      <button type="button" className={danger ? "btn danger" : "btn primary"} disabled={disabled} onClick={onGo}>
        {label}
      </button>
      <button type="button" className="btn" onClick={onClose}>
        Cancel
      </button>
    </div>
  );
}

/** A modal sheet: bottom sheet on a phone, centred on wider screens. Escape or a tap on the backdrop closes it. */
export function Overlay({ title, onClose, children }: Props) {
  const sheet = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  const titleId = useId();

  useEffect(() => {
    closeRef.current = onClose;
  });
  useEffect(() => {
    sheet.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div
      className="overlay"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} ref={sheet}>
        <h4 id={titleId}>{title}</h4>
        {children}
      </div>
    </div>
  );
}
