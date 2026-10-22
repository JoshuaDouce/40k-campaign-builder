import { useOptionalCampaign } from "../../store/useCampaign.ts";

/** Back link, campaign name, sync pill, and the offline / conflict banners. */
export function CampaignHeader({ onBack }: { onBack: () => void }) {
  const store = useOptionalCampaign();
  if (!store) return null;
  const { name, sync } = store;
  const pill = sync.offline ? "offline" : sync.saving ? "saving" : "live";
  const text = sync.offline ? "Offline" : sync.saving ? "Saving…" : "Live";
  return (
    <>
      <div className="ac-chead">
        <button className="ac-back" onClick={onBack}>
          ← Campaigns
        </button>
        <div className="ac-crow">
          <h2 className="ac-cname">{name}</h2>
          <span className={`ac-sync ${pill}`} role="status">
            {pill === "live" ? <span className="dot" style={{ background: "var(--verd)" }}></span> : null}
            {text}
          </span>
        </div>
      </div>
      {sync.offline ? (
        <div className="ac-banner" role="alert">
          <span>You're offline. Changes are paused until you reconnect.</span>
        </div>
      ) : null}
      {!sync.offline && sync.notice ? (
        <div className="ac-banner warn" role="alert">
          <span>{sync.notice === "conflict" ? "Updated, please try again" : "Something went wrong. Please try again."}</span>
          <button className="btn sm" onClick={sync.dismissNotice}>
            Dismiss
          </button>
        </div>
      ) : null}
    </>
  );
}
