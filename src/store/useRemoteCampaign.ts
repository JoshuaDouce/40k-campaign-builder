// The Amplify-backed campaign store: one live, shared campaign.
//
// Saving: every action is applied to the last saved state, written with the condition
// `version = expected` and version + 1, and only then shown. A lost race refetches, re-applies once
// and retries; if that fails too the player sees "Updated, please try again". Rolls (battles, card
// draws) happen inside `apply`, so they are never visible unless the save succeeded.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apply, mulberry } from "../game/index.ts";
import type { Action, CampaignState } from "../game/index.ts";
import { getCampaign, saveState, setMembers, VersionConflict, watchCampaign } from "./campaigns.ts";
import type { CampaignRecord } from "./campaigns.ts";
import type { AuthUser } from "./useAuth.ts";
import type { CampaignStore, SyncNotice } from "./useCampaign.ts";

export type RemoteCampaign =
  | { status: "loading" }
  | { status: "gone" }
  | { status: "error"; retry(): void }
  | { status: "ready"; store: CampaignStore };

// A safety net only: live updates arrive by subscription.
const POLL_MS = 60000;
const RESUBSCRIBE_MS = 5000;

const newRng = () => mulberry(Math.floor(Math.random() * 2 ** 31));

export function useRemoteCampaign(campaignId: string, user: AuthUser): RemoteCampaign {
  const [record, setRecord] = useState<CampaignRecord | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "gone" | "error">("loading");
  const [saving, setSaving] = useState(0);
  const [offline, setOffline] = useState(() => !navigator.onLine);
  const [notice, setNotice] = useState<SyncNotice>(null);
  const [attempt, setAttempt] = useState(0);
  // Bumped to re-create a subscription that died (Amplify ends the stream on error).
  const [subGen, setSubGen] = useState(0);

  // The newest record we know of. Updated synchronously so back-to-back presses build on each other.
  const latest = useRef<CampaignRecord | null>(null);
  const queue = useRef<Promise<void>>(Promise.resolve());

  const put = useCallback((rec: CampaignRecord) => {
    latest.current = rec;
    setRecord(rec);
  }, []);

  /** Accept a record from the server. Older versions are ignored; same-version member edits are kept. */
  const take = useCallback(
    (rec: CampaignRecord) => {
      const cur = latest.current;
      if (cur && cur.id === rec.id && rec.version < cur.version) return;
      if (cur && cur.id === rec.id && rec.version === cur.version) {
        if (rec.name !== cur.name || rec.members.join() !== cur.members.join()) put({ ...cur, name: rec.name, members: rec.members });
        return;
      }
      put(rec);
    },
    [put],
  );

  const refetch = useCallback(async () => {
    try {
      const rec = await getCampaign(campaignId);
      if (!rec) {
        setStatus("gone");
        return null;
      }
      take(rec);
      return rec;
    } catch {
      return null;
    }
  }, [campaignId, take]);

  // First load.
  useEffect(() => {
    let live = true;
    latest.current = null;
    getCampaign(campaignId)
      .then((rec) => {
        if (!live) return;
        if (!rec) {
          setStatus("gone");
          return;
        }
        put(rec);
        setStatus("ready");
      })
      .catch(() => {
        if (live) setStatus("error");
      });
    return () => {
      live = false;
    };
  }, [campaignId, put, attempt]);

  // Live updates, plus a slow poll and a refetch on reconnect/return as a safety net.
  useEffect(() => {
    if (status !== "ready") return;
    let retry: number | undefined;
    const stop = watchCampaign(
      campaignId,
      take,
      () => setStatus("gone"),
      () => {
        void refetch();
        retry ??= window.setTimeout(() => setSubGen((n) => n + 1), RESUBSCRIBE_MS);
      },
    );
    const poll = window.setInterval(() => {
      if (document.visibilityState === "visible" && navigator.onLine) void refetch();
    }, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refetch();
    };
    const onOnline = () => {
      setOffline(false);
      void refetch();
    };
    const onOffline = () => setOffline(true);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stop();
      window.clearTimeout(retry);
      window.clearInterval(poll);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [campaignId, status, take, refetch, subGen]);

  const runAction = useCallback(
    async (action: Action) => {
      const attemptSave = async (base: CampaignRecord): Promise<"saved" | "conflict" | "noop"> => {
        const next: CampaignState = apply(base.state, action, { rng: newRng() });
        if (next === base.state) return "noop";
        try {
          take(await saveState(campaignId, next, base.version));
          return "saved";
        } catch (e) {
          if (e instanceof VersionConflict) return "conflict";
          throw e;
        }
      };
      try {
        const base = latest.current;
        if (!base) return;
        if ((await attemptSave(base)) !== "conflict") return;
        const newer = await getCampaign(campaignId);
        if (!newer) {
          setStatus("gone");
          return;
        }
        take(newer);
        const second = await attemptSave(newer);
        if (second === "conflict") {
          await refetch();
          setNotice("conflict");
        } else if (second === "noop") {
          // The action no longer applies to the newer campaign. Nothing was lost: say it changed.
          setNotice("conflict");
        }
      } catch {
        await refetch();
        setNotice("error");
      }
    },
    [campaignId, take, refetch],
  );

  const dispatch = useCallback(
    (action: Action) => {
      if (!navigator.onLine) return;
      setNotice(null);
      setSaving((n) => n + 1);
      queue.current = queue.current.then(() => runAction(action)).finally(() => setSaving((n) => n - 1));
    },
    [runAction],
  );

  const updateMembers = useCallback(
    async (members: string[]) => {
      await setMembers(campaignId, members);
      const cur = latest.current;
      if (cur) put({ ...cur, members });
    },
    [campaignId, put],
  );

  return useMemo<RemoteCampaign>(() => {
    if (status === "error") return { status, retry: () => setAttempt((n) => n + 1) };
    if (status === "gone") return { status };
    if (status !== "ready" || !record) return { status: "loading" };
    return {
      status: "ready",
      store: {
        campaignId,
        name: record.name,
        members: record.members,
        state: record.state,
        dispatch,
        viewer: { userId: user.userId, email: user.email, isOwner: user.isOrganiser },
        sync: { saving: saving > 0, offline, notice, dismissNotice: () => setNotice(null) },
        updateMembers,
      },
    };
  }, [status, record, campaignId, dispatch, user.userId, user.email, user.isOrganiser, saving, offline, notice, updateMembers]);
}
