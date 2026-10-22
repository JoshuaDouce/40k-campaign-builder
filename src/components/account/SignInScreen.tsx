import { Authenticator } from "@aws-amplify/ui-react";
import { I18n } from "aws-amplify/utils";
import "@aws-amplify/ui-react/styles.css";

// Sign-in only: no sign-up tab, and no "Forgot your password?" link (the organiser resets passwords).
I18n.putVocabulariesForLanguage("en", {
  "Sign In": "Sign in",
  "Change Password": "Change password",
  "Confirm Password": "Confirm password",
});

const components = {
  Header: () => (
    <h1 className="ac-brand">
      The Varkesh <span>Reach</span>
    </h1>
  ),
  SignIn: { Footer: () => null },
  ForceNewPassword: { Header: () => <div className="lbl ac-lbl">Choose a new password</div> },
};

/** Rendered only while signed out. When sign-in completes, useAuth flips to signedIn and the shell moves on. */
export function SignInScreen({ onBack }: { onBack: () => void }) {
  return (
    <div className="ac-screen">
      <button className="ac-back" onClick={onBack}>
        ← Rules &amp; factions
      </button>
      <Authenticator hideSignUp loginMechanisms={["email"]} components={components}>
        {() => <p className="ac-sub">Signed in.</p>}
      </Authenticator>
    </div>
  );
}
