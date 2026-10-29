import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent } from "react";

export interface EffectOption {
  n: string;
  e?: string;
  /** Shown instead of being pickable, e.g. "Held". */
  note?: string;
}
export interface EffectGroup {
  label?: string;
  items: readonly EffectOption[];
}

interface Props {
  label: string;
  placeholder: string;
  groups: readonly EffectGroup[];
  /** The picked name, shown in the button; "" for none. */
  value: string;
  onPick(name: string): void;
  disabled?: boolean;
}

/**
 * A dropdown whose options show two lines, the name and what it does, so the effect is readable before picking (a
 * native select shows one line, and phones can't hover). The list opens in place, under the button.
 */
export function EffectSelect({ label, placeholder, groups, value, onPick, disabled }: Props) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const pickable = groups.flatMap((g) => g.items.filter((x) => !x.note));
  const picked = groups.flatMap((g) => g.items).find((x) => x.n === value);

  // A tap outside closes the list.
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open]);

  // Keep the keyboard-active option in view.
  useEffect(() => {
    if (open) document.getElementById(`${id}-o${active}`)?.scrollIntoView({ block: "nearest" });
  }, [open, active, id]);

  const show = () => {
    const i = pickable.findIndex((x) => x.n === value);
    setActive(i === -1 ? 0 : i);
    setOpen(true);
  };
  const choose = (n: string) => {
    onPick(n);
    setOpen(false);
    button.current?.focus();
  };
  const onKey = (e: KeyboardEvent) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        show();
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, pickable.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if ((e.key === "Enter" || e.key === " ") && pickable[active]) {
      e.preventDefault();
      choose(pickable[active].n);
    }
  };

  let k = -1;
  return (
    <div className="esel" ref={root}>
      <div className="esel-lbl" id={`${id}-l`}>
        {label}
      </div>
      <button
        ref={button}
        type="button"
        className="esel-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={`${id}-l ${id}-v`}
        aria-controls={`${id}-list`}
        aria-activedescendant={open && pickable[active] ? `${id}-o${active}` : undefined}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={onKey}
      >
        <span id={`${id}-v`} className="esel-v">
          {picked ? (
            <>
              <b>{picked.n}</b>
              {picked.e && <small>{picked.e}</small>}
            </>
          ) : (
            <span className="dim">{placeholder}</span>
          )}
        </span>
        <span className="esel-caret" aria-hidden="true">
          {open ? "▴" : "▾"}
        </span>
      </button>
      {open && (
        <ul className="esel-list" role="listbox" id={`${id}-list`} aria-labelledby={`${id}-l`}>
          {groups.map((g, gi) => (
            <li key={g.label ?? gi} role="presentation">
              {g.label && <div className="esel-group">{g.label}</div>}
              <ul role="group" aria-label={g.label}>
                {g.items.map((x) => {
                  if (x.note)
                    return (
                      <li key={x.n} role="option" aria-selected={false} aria-disabled="true" className="esel-opt off">
                        <b>
                          {x.n} <em>{x.note}</em>
                        </b>
                        {x.e && <small>{x.e}</small>}
                      </li>
                    );
                  k++;
                  const i = k;
                  return (
                    <li
                      key={x.n}
                      id={`${id}-o${i}`}
                      role="option"
                      aria-selected={x.n === value}
                      className={`esel-opt${i === active ? " on" : ""}`}
                      onPointerEnter={() => setActive(i)}
                      onClick={() => choose(x.n)}
                    >
                      <b>{x.n}</b>
                      {x.e && <small>{x.e}</small>}
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
