import { supabase } from "@/lib/supabase";
import { AppNotification, NotificationType } from "@/types/types";

// ─── Fetch ────────────────────────────────────────────────────────────────────

export const fetchNotifications = async (userId: string): Promise<AppNotification[]> => {
  const { data, error } = await supabase
    .from("notifications")
    .select(
      `
      *,
      actor:profiles!actor_id(id, username, avatar_url),
      post:posts!post_id(id, thumbnail_url)
    `,
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(60);

  if (error) throw error;
  return (data || []) as AppNotification[];
};

// ─── Mark Read ────────────────────────────────────────────────────────────────

export const markNotificationRead = async (id: string): Promise<void> => {
  const { error } = await supabase.from("notifications").update({ read: true }).eq("id", id);
  if (error) throw error;
};

export const markAllNotificationsRead = async (userId: string): Promise<void> => {
  const { error } = await supabase.from("notifications").update({ read: true }).eq("user_id", userId).eq("read", false);
  if (error) throw error;
};

// ─── Delete ───────────────────────────────────────────────────────────────────

export const deleteNotification = async (id: string): Promise<void> => {
  const { error } = await supabase.from("notifications").delete().eq("id", id);
  if (error) throw error;
};

// ─── Create (called by other services) ───────────────────────────────────────

export const createNotification = async (opts: {
  userId: string;
  actorId: string;
  type: NotificationType;
  postId?: string;
  comment?: string;
}): Promise<void> => {
  if (opts.userId === opts.actorId) return; // no self-notifications
  const { error } = await supabase.from("notifications").insert({
    user_id: opts.userId,
    actor_id: opts.actorId,
    type: opts.type,
    post_id: opts.postId ?? null,
    comment: opts.comment ?? null,
  });
  if (error) console.error("[createNotification]", error.message);
};

// ─── Unread Count ─────────────────────────────────────────────────────────────

export const fetchUnreadNotificationCount = async (userId: string): Promise<number> => {
  const { count, error } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("read", false);

  if (error) return 0;
  return count ?? 0;
};

// ─── Realtime ─────────────────────────────────────────────────────────────────

export const subscribeToNotifications = (userId: string, onNew: (notification: AppNotification) => void): (() => void) => {
  const channel = supabase
    .channel(`notifications:${userId}:${Date.now()}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      async (payload) => {
        // Enrich the new record with the actor profile
        const raw = payload.new as AppNotification;
        const { data } = await supabase
          .from("notifications")
          .select(
            `
            *,
            actor:profiles!actor_id(id, username, avatar_url),
            post:posts!post_id(id, thumbnail_url)
          `,
          )
          .eq("id", raw.id)
          .single();
        if (data) onNew(data as AppNotification);
      },
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
};
