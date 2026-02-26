import { supabase } from "@/lib/supabase";

// ─── Broadcast helper ─────────────────────────────────────────────────────────

/**
 * Fire-and-forget: broadcasts a follower-change event directly to the target
 * user's named channel. This is cross-device reliable unlike postgres_changes
 * which can be silently dropped by per-session RLS evaluation.
 */
const broadcastFollowChange = (followingId: string, followerId: string, delta: 1 | -1): void => {
  // Must use the SAME channel name the receiver subscribes to: follows-rt:${followingId}
  // Wait for SUBSCRIBED before sending to avoid the REST fallback warning.
  const ch = supabase.channel(`follows-rt:${followingId}`);
  ch.subscribe((status) => {
    if (status === "SUBSCRIBED") {
      ch.send({
        type: "broadcast",
        event: "follow_change",
        payload: { followerId, delta },
      }).finally(() => supabase.removeChannel(ch));
    }
    if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
      supabase.removeChannel(ch);
    }
  });
};

// ─── Follow / Unfollow ────────────────────────────────────────────────────────

export const followUser = async (followerId: string, followingId: string): Promise<void> => {
  const { error } = await supabase.from("follows").insert({ follower_id: followerId, following_id: followingId });
  if (error) throw error;
  // Broadcast so all devices watching followingId update immediately
  broadcastFollowChange(followingId, followerId, 1);
};

export const unfollowUser = async (followerId: string, followingId: string): Promise<void> => {
  const { error } = await supabase.from("follows").delete().eq("follower_id", followerId).eq("following_id", followingId);
  if (error) throw error;
  // Broadcast so all devices watching followingId update immediately
  broadcastFollowChange(followingId, followerId, -1);
};

export const isFollowing = async (followerId: string, followingId: string): Promise<boolean> => {
  const { data } = await supabase.from("follows").select("follower_id").eq("follower_id", followerId).eq("following_id", followingId).maybeSingle();
  return !!data;
};

// ─── Counts ───────────────────────────────────────────────────────────────────

export type FollowCounts = { followers: number; following: number };

export const fetchFollowCounts = async (userId: string): Promise<FollowCounts> => {
  const [{ count: followers }, { count: following }] = await Promise.all([
    supabase.from("follows").select("follower_id", { count: "exact", head: true }).eq("following_id", userId),
    supabase.from("follows").select("following_id", { count: "exact", head: true }).eq("follower_id", userId),
  ]);
  return { followers: followers ?? 0, following: following ?? 0 };
};

// ─── Realtime ─────────────────────────────────────────────────────────────────

/**
 * Subscribe to follow-count changes for `userId`.
 *
 * Uses BOTH Supabase Broadcast (cross-device, no RLS) AND postgres_changes
 * (same-device fallback) on a single channel. Whichever fires, the callback
 * receives a fresh count re-fetched from the DB so numbers are always accurate.
 *
 * `onUpdate(counts, actorId?, delta?)` — actorId/delta only available when
 *   the broadcast path fires; useful to sync a follow-button state.
 *
 * Returns an unsubscribe function.
 */
export const subscribeToFollowCounts = (userId: string, onUpdate: (counts: FollowCounts, actorId?: string, delta?: 1 | -1) => void): (() => void) => {
  let debounce: ReturnType<typeof setTimeout> | null = null;

  const trigger = (actorId?: string, delta?: 1 | -1) => {
    // Debounce 200ms so broadcast + postgres_changes don't double-fire
    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(async () => {
      try {
        const counts = await fetchFollowCounts(userId);
        onUpdate(counts, actorId, delta);
      } catch {}
    }, 200);
  };

  const ch = supabase
    .channel(`follows-rt:${userId}`)
    // Cross-device: explicit broadcast sent by followUser / unfollowUser
    .on("broadcast", { event: "follow_change" }, ({ payload }) => {
      trigger(payload?.followerId as string | undefined, payload?.delta as 1 | -1 | undefined);
    })
    // Same-session fallback: postgres_changes for any INSERT/DELETE on follows
    .on("postgres_changes", { event: "*", schema: "public", table: "follows" }, () => {
      trigger();
    })
    .subscribe();

  return () => {
    if (debounce) clearTimeout(debounce);
    supabase.removeChannel(ch);
  };
};
