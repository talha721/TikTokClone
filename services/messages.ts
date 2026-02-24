import { supabase } from "@/lib/supabase";
import { Conversation, Message } from "@/types/types";

// ─── Conversations ────────────────────────────────────────────────────────────

export const getOrCreateConversation = async (currentUserId: string, otherUserId: string): Promise<Conversation> => {
  const { data: existing } = await supabase
    .from("conversations")
    .select("*")
    .or(`and(user1_id.eq.${currentUserId},user2_id.eq.${otherUserId}),and(user1_id.eq.${otherUserId},user2_id.eq.${currentUserId})`)
    .maybeSingle();

  if (existing) return existing as Conversation;

  const { data, error } = await supabase.from("conversations").insert({ user1_id: currentUserId, user2_id: otherUserId }).select().single();

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

  return (data || []).map((conv: any) => ({
    ...conv,
    otherUser: conv.user1_id === userId ? conv.user2 : conv.user1,
  })) as Conversation[];
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

  // Update last_message preview on conversation
  await supabase.from("conversations").update({ last_message: content, last_message_at: new Date().toISOString() }).eq("id", conversationId);

  return data as Message;
};

export const markMessagesRead = async (conversationId: string, userId: string) => {
  await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .neq("sender_id", userId)
    .is("read_at", null);
};

// ─── Realtime ─────────────────────────────────────────────────────────────────

export const subscribeToMessages = (conversationId: string, onNewMessage: (message: Message) => void) => {
  const channel = supabase
    .channel(`messages:${conversationId}`)
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
    .subscribe();

  return () => supabase.removeChannel(channel);
};

export const subscribeToConversations = (userId: string, onUpdate: () => void) => {
  const channel = supabase
    .channel(`conversations:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "conversations",
        filter: `user1_id=eq.${userId}`,
      },
      onUpdate,
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "conversations",
        filter: `user2_id=eq.${userId}`,
      },
      onUpdate,
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
};
