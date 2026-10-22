import { useEffect, useRef } from "react";
import { useCampaign } from "../store/useCampaign.ts";

interface Props {
  playerId: string;
  name: string;
  disabled: boolean;
  label: string;
}

/** Warband name field. Edits are committed on blur, Enter, or unmount (so switching tabs never loses one). */
export function PlayerNameInput({ playerId, name, disabled, label }: Props) {
  const { dispatch } = useCampaign();
  const draft = useRef<string | null>(null);
  const commitName = () => {
    const v = draft.current;
    draft.current = null;
    if (v === null || v === name || !v.trim()) return;
    dispatch({ type: "updatePlayer", playerId, name: v });
  };
  const latestCommit = useRef(commitName);
  useEffect(() => {
    latestCommit.current = commitName;
  });
  useEffect(() => () => latestCommit.current(), []);

  return (
    <input
      type="text"
      key={name}
      defaultValue={name}
      aria-label={label}
      disabled={disabled}
      onChange={(e) => {
        draft.current = e.currentTarget.value;
      }}
      onBlur={(e) => {
        commitName();
        e.currentTarget.value = name;
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
    />
  );
}
