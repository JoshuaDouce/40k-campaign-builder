/** Shown to everyone while a member has not picked a faction yet. They are not in the turn order. */
export function WaitingNote({ emails }: { emails: string[] }) {
  return (
    <>
      {emails.map((e) => (
        <div className="ac-wait" key={e}>
          <b>{e} is choosing a faction</b>
        </div>
      ))}
    </>
  );
}
