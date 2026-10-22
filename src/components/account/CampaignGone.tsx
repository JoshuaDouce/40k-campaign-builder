export function CampaignGone({ onBack }: { onBack: () => void }) {
  return (
    <div className="ac-screen">
      <div className="ac-panel ac-gone" role="status">
        <div className="t">This campaign was deleted, or you no longer have access to it.</div>
        <button className="btn primary" onClick={onBack}>
          Back to Campaigns
        </button>
      </div>
    </div>
  );
}
