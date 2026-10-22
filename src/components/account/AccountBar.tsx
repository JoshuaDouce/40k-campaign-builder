interface Props {
  email: string;
  isOrganiser: boolean;
  onSignOut: () => void;
  /** Shown on the public tabs, to get back to the campaign list. */
  onCampaigns?: () => void;
}

/** The signed-in app bar: who is signed in, a way back to the campaigns, and Sign out. */
export function AccountBar({ email, isOrganiser, onSignOut, onCampaigns }: Props) {
  return (
    <div className="ac-top">
      <div className="ac-who">
        <span className="lbl">
          Signed in as {isOrganiser ? <span className="badge org">Organiser</span> : null}
        </span>
        <b title={email}>{email}</b>
      </div>
      <div className="row">
        {onCampaigns ? (
          <button className="ac-lnk" onClick={onCampaigns}>
            Campaigns
          </button>
        ) : null}
        <button className="ac-lnk" onClick={onSignOut}>
          Sign out
        </button>
      </div>
    </div>
  );
}
