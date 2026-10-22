/** Signed-out app bar. `onSignIn` is absent while the session is still being checked. */
export function PublicHeader({ onSignIn }: { onSignIn?: () => void }) {
  return (
    <div className="ac-top">
      <div className="ac-title">
        The Varkesh <span>Reach</span>
      </div>
      {onSignIn ? (
        <button className="btn sm primary" onClick={onSignIn}>
          Sign in
        </button>
      ) : null}
    </div>
  );
}
