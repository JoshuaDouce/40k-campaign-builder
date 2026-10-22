// Who is signed in. The organiser is anyone in the Cognito `admins` group (read from the ID token).
import { fetchAuthSession, getCurrentUser, signOut as amplifySignOut } from "aws-amplify/auth";
import { Hub } from "aws-amplify/utils";
import { useCallback, useEffect, useState } from "react";
import { backendConfigured } from "./backend.ts";

export interface AuthUser {
  /** Cognito user id (sub). Links to players[].userId. */
  userId: string;
  /** Lowercase login email. Matches the campaign's members list. */
  email: string;
  isOrganiser: boolean;
}

export type AuthState =
  | { status: "unconfigured" }
  | { status: "loading" }
  | { status: "signedOut" }
  | { status: "signedIn"; user: AuthUser };

async function readUser(): Promise<AuthUser | null> {
  try {
    const { userId } = await getCurrentUser();
    const session = await fetchAuthSession();
    const claims = session.tokens?.idToken?.payload;
    if (!claims) return null;
    const groups = claims["cognito:groups"];
    const email = typeof claims.email === "string" ? claims.email : "";
    return {
      userId,
      email: email.trim().toLowerCase(),
      isOrganiser: Array.isArray(groups) && groups.includes("admins"),
    };
  } catch {
    return null;
  }
}

export function useAuth(): AuthState & { signOut(): Promise<void> } {
  const [state, setState] = useState<AuthState>(backendConfigured ? { status: "loading" } : { status: "unconfigured" });

  useEffect(() => {
    if (!backendConfigured) return;
    let live = true;
    const refresh = () => {
      void readUser().then((user) => {
        if (live) setState(user ? { status: "signedIn", user } : { status: "signedOut" });
      });
    };
    refresh();
    const stop = Hub.listen("auth", ({ payload }) => {
      if (payload.event === "signedIn" || payload.event === "signedOut" || payload.event === "tokenRefresh_failure") refresh();
    });
    return () => {
      live = false;
      stop();
    };
  }, []);

  const signOut = useCallback(async () => {
    await amplifySignOut();
  }, []);

  return { ...state, signOut };
}
