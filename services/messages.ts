import { supabase } from "@/lib/supabase";
import { Conversation, Message } from "@/types/types";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ─── Conversations ────────────────────────────────────────────────────────────

export const getOrCreateConversation = async (currentUserId: string, otherUserId: string): Promise<Conversation> => {
  const { data: existing } = await supabase
    .from("conversations")
    .select("*")
    .or(`and(user1_id.eq.${currentUserId},user2_id.eq.${otherUserId}),and(user1_id.eq.${otherUserId},user2_id.eq.${currentUserId})`)
    .maybeSingle();

  if (existing) return existing as Conversation;

  const { data, error } = await supabase
    .from("conversations")
    .insert({ user1_id: currentUserId, user2_id: otherUserId, last_message: "", last_message_at: new Date().toISOString() })
    .select()
    .single();

  if (error) throw error;
  return data as Conversation;
};

export const fetchConversations = async (userId: string): Promise<Conversation[]> => {
  const { data, error } = await supabase
    .from("conversations")
    .select("*, user1:profiles!user1_id(id, username, avatar_url), user2:profiles!user2_id(id, username, avatar_url)")
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
    .order("last_message_at", { ascending: false });

  if (error) throw error;

  const conversations = (data || []).map((conv: any) => ({
    ...conv,
    otherUser: conv.user1_id === userId ? conv.user2 : conv.user1,
  })) as Conversation[];

  // Fetch unread counts for all conversations in a single query
  const convIds = conversations.map((c) => c.id);
  if (convIds.length > 0) {
    const { data: unreadData } = await supabase
      .from("messages")
      .select("conversation_id")
      .in("conversation_id", convIds)
      .neq("sender_id", userId)
      .is("read_at", null);

    if (unreadData) {
      const unreadMap: Record<string, number> = {};
      unreadData.forEach((msg: any) => {
        unreadMap[msg.conversation_id] = (unreadMap[msg.conversation_id] || 0) + 1;
      });
      return conversations.map((c) => ({ ...c, unread_count: unreadMap[c.id] || 0 }));
    }
  }

  return conversations;
};

// ─── Messages ─────────────────────────────────────────────────────────────────

export const fetchMessages = async (conversationId: string): Promise<Message[]> => {
  const { data, error } = await supabase.from("messages").select("*").eq("conversation_id", conversationId).order("created_at", { ascending: true });

  if (error) throw error;
  return (data || []) as Message[];
};

export const sendMessage = async (conversationId: string, senderId: string, content: string): Promise<Message> => {
  const { data, error } = await supabase.from("messages").insert({ conversation_id: conversationId, sender_id: senderId, content }).select().single();

  if (error) throw error;

  // Store a human-readable preview instead of raw media URLs
  let preview = content;
  if (content.startsWith("__IMAGE__:")) preview = "📷 Photo";
  else if (content.startsWith("__VIDEO__:")) preview = "🎥 Video";

  const { error: convError } = await supabase
    .from("conversations")
    .update({ last_message: preview, last_message_at: new Date().toISOString() })
    .eq("id", conversationId);

  if (convError) {
    console.error("[sendMessage] Failed to update last_message:", convError.message, convError.details);
  }

  return data as Message;
};

export const markMessagesRead = async (conversationId: string, userId: string) => {
  const { error } = await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .neq("sender_id", userId)
    .is("read_at", null);

  if (error) {
    console.error("[markMessagesRead] Failed:", error.message, error.details);
  }
};

// ─── Realtime ─────────────────────────────────────────────────────────────────

export const subscribeToMessages = (conversationId: string, onNewMessage: (message: Message) => void, onMessageUpdated?: (message: Message) => void) => {
  // Use a unique channel name per call to prevent cross-client collisions
  const channelName = `messages:${conversationId}:${Date.now()}`;
  const channel = supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => onNewMessage(payload.new as Message),
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => onMessageUpdated?.(payload.new as Message),
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
};

// ─── User Search ──────────────────────────────────────────────────────────────

export const searchUsers = async (query: string, currentUserId: string) => {
  if (!query.trim()) return [];
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, avatar_url")
    .ilike("username", `%${query.trim()}%`)
    .neq("id", currentUserId)
    .limit(20);

  if (error) throw error;
  return (data || []) as { id: string; username: string; avatar_url?: string }[];
};

// Subscribe to any new message in the user's conversations (for inbox live updates)
export const subscribeToInboxMessages = (conversationIds: string[], onNewMessage: () => void) => {
  if (conversationIds.length === 0) return () => {};
  // Supabase realtime only supports single-column eq filters, so we open one
  // channel per conversation. Cap at 10 to avoid too many channels.
  const ids = conversationIds.slice(0, 10);
  const channels = ids.map((convId) =>
    supabase
      .channel(`inbox-msg:${convId}:${Date.now()}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${convId}` }, () => onNewMessage())
      .subscribe(),
  );
  return () => channels.forEach((ch) => supabase.removeChannel(ch));
};

export const subscribeToConversations = (userId: string, onUpdate: (payload?: any) => void) => {
  const channel = supabase
    .channel(`conversations:${userId}:${Date.now()}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "conversations",
        filter: `user1_id=eq.${userId}`,
      },
      (payload) => onUpdate(payload),
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "conversations",
        filter: `user2_id=eq.${userId}`,
      },
      (payload) => onUpdate(payload),
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
};

// ─── Delete Messages / Conversations ─────────────────────────────────────────

export const deleteMessageForEveryone = async (messageId: string): Promise<void> => {
  const { error } = await supabase.from("messages").update({ content: "__DELETED__" }).eq("id", messageId);
  if (error) throw error;
};

const LOCAL_DELETE_KEY = (conversationId: string) => `deleted_msgs:${conversationId}`;

export const getLocallyDeletedMessages = async (conversationId: string): Promise<Set<string>> => {
  try {
    const json = await AsyncStorage.getItem(LOCAL_DELETE_KEY(conversationId));
    if (!json) return new Set();
    return new Set(JSON.parse(json) as string[]);
  } catch {
    return new Set();
  }
};

export const addLocallyDeletedMessage = async (conversationId: string, messageId: string): Promise<void> => {
  try {
    const key = LOCAL_DELETE_KEY(conversationId);
    const json = await AsyncStorage.getItem(key);
    const ids: string[] = json ? JSON.parse(json) : [];
    if (!ids.includes(messageId)) {
      ids.push(messageId);
      await AsyncStorage.setItem(key, JSON.stringify(ids));
    }
  } catch {}
};

export const fetchUnreadInboxCount = async (userId: string): Promise<number> => {
  // Get all conversation IDs this user is part of
  const { data: convs } = await supabase.from("conversations").select("id").or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

  if (!convs || convs.length === 0) return 0;
  const convIds = convs.map((c: any) => c.id);

  const { count, error } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .in("conversation_id", convIds)
    .neq("sender_id", userId)
    .is("read_at", null);

  if (error) return 0;
  return count ?? 0;
};

export const deleteConversation = async (conversationId: string): Promise<void> => {
  // Delete messages first, then the conversation
  await supabase.from("messages").delete().eq("conversation_id", conversationId);
  const { error } = await supabase.from("conversations").delete().eq("id", conversationId);
  if (error) throw error;
};

// ─── Typing Indicator (Broadcast) ─────────────────────────────────────────────

export const subscribeToTyping = (conversationId: string, currentUserId: string, onTyping: () => void): { sendTyping: () => void; unsubscribe: () => void } => {
  const channel = supabase
    .channel(`typing:${conversationId}`)
    .on("broadcast", { event: "typing" }, (payload) => {
      if (payload.payload?.userId !== currentUserId) {
        onTyping();
      }
    })
    .subscribe();

  const sendTyping = () => {
    channel.send({ type: "broadcast", event: "typing", payload: { userId: currentUserId } });
  };

  return { sendTyping, unsubscribe: () => supabase.removeChannel(channel) };
};
