import { useEffect, useState } from "react";
import { playerColors } from "../../game/index.ts";
import { listCampaigns } from "../../store/campaigns.ts";
import type { CampaignRecord } from "../../store/campaigns.ts";
import type { AuthUser } from "../../store/useAuth.ts";
import { formatUpdated } from "./formatUpdated.ts";

interface Props {
  user: AuthUser;
  onOpen: (id: string) => void;
  onNew: () => void;
  onPublic: () => void;
}

type Load = { status: "loading" } | { status: "error" } | { status: "ready"; items: CampaignRecord[] };

export function CampaignsScreen({ user, onOpen, onNew, onPublic }: Props) {
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    listCampaigns().then(
      (items) => {
        if (live) setLoad({ status: "ready", items });
      },
      () => {
        if (live) setLoad({ status: "error" });
      },
    );
    return () => {
      live = false;
    };
  }, [attempt]);

  return (
    <div className="ac-screen">
      <div className="ac-pagehead">
        <h2>Campaigns</h2>
        {user.isOrganiser ? (
          <button className="btn primary" onClick={onNew}>
            New campaign
          </button>
        ) : null}
      </div>
      {load.status === "loading" ? <p className="dim">Loading…</p> : null}
      {load.status === "error" ? (
        <div className="ac-panel ac-empty">
          <div className="t">Something went wrong. Please try again.</div>
          <button className="btn" onClick={() => {
              setLoad({ status: "loading" });
              setAttempt((n) => n + 1);
            }}>
            Try again
          </button>
        </div>
      ) : null}
      {load.status === "ready" && load.items.length === 0 ? (
        <div className="ac-panel ac-empty">
          <div className="t">You haven't been added to a campaign yet.</div>
        </div>
      ) : null}
      {load.status === "ready" && load.items.length > 0 ? (
        <div className="ac-list">
          {load.items.map((c) => (
            <CampaignRow key={c.id} rec={c} user={user} onOpen={() => onOpen(c.id)} />
          ))}
        </div>
      ) : null}
      <div>
        <button className="ac-lnk" onClick={onPublic}>
          Rules &amp; factions
        </button>
      </div>
    </div>
  );
}

function CampaignRow({ rec, user, onOpen }: { rec: CampaignRecord; user: AuthUser; onOpen: () => void }) {
  const n = rec.state.players.length;
  const mine = rec.state.players.find((p) => p.userId === user.userId);
  const color = mine ? playerColors(rec.state)[mine.id] : undefined;
  const updated = formatUpdated(rec.updatedAt);
  return (
    <button className="card ac-camp" onClick={onOpen}>
      <div className="k">
        <span>{n === 1 ? "1 player" : `${n} players`}</span>
        {updated ? <span>Updated {updated}</span> : null}
      </div>
      <div className="t">{rec.name}</div>
      <div className="ac-line">
        {mine ? (
          <>
            <span className="dot" style={{ background: color }}></span>
            <b>{mine.name}</b>
            <span>{mine.faction}</span>
          </>
        ) : user.isOrganiser ? (
          <span>Organiser is not playing</span>
        ) : (
          <>
            <span className="badge warn">No faction yet</span>
            <span>Open it to pick one</span>
          </>
        )}
      </div>
    </button>
  );
}
