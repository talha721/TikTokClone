import { useTheme } from "@/hooks/use-theme";
import { fetchMessages, markMessagesRead, sendMessage, subscribeToMessages } from "@/services/messages";
import { useAuthStore } from "@/stores/useAuthStore";
import { Message } from "@/types/types";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ChatScreen() {
  const { conversationId, username, avatar } = useLocalSearchParams<{
    conversationId: string;
    username: string;
    avatar?: string;
  }>();
  const { colors, isDark } = useTheme();
  const user = useAuthStore((s) => s.user);
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!conversationId || !user) return;

    // Load initial messages
    fetchMessages(conversationId)
      .then((msgs) => {
        setMessages(msgs);
        setLoading(false);
        // Mark received messages as read
        markMessagesRead(conversationId, user.id);
      })
      .catch(() => setLoading(false));

    // Subscribe to real-time new messages from the other user
    const unsubscribe = subscribeToMessages(conversationId, (newMsg) => {
      setMessages((prev) => {
        // Avoid duplicates (our own sent messages are added optimistically)
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
      if (newMsg.sender_id !== user.id) {
        markMessagesRead(conversationId, user.id);
      }
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80);
    });

    return unsubscribe;
  }, [conversationId, user]);

  const handleSend = async () => {
    if (!input.trim() || !user || !conversationId || sending) return;
    const content = input.trim();
    setInput("");
    setSending(true);

    // Optimistic update
    const tempMsg: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: conversationId,
      sender_id: user.id,
      content,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80);

    try {
      const sent = await sendMessage(conversationId, user.id, content);
      // Replace temp message with real one
      setMessages((prev) => prev.map((m) => (m.id === tempMsg.id ? sent : m)));
    } catch {
      // Remove temp message on failure
      setMessages((prev) => prev.filter((m) => m.id !== tempMsg.id));
      setInput(content);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isMe = item.sender_id === user?.id;
    const isTemp = item.id.startsWith("temp-");
    const prevMsg = messages[index - 1];
    const showTimestamp = !prevMsg || new Date(item.created_at).getTime() - new Date(prevMsg.created_at).getTime() > 5 * 60 * 1000;

    return (
      <>
        {showTimestamp && (
          <Text style={[styles.timestamp, { color: colors.icon }]}>
            {new Date(item.created_at).toLocaleDateString([], {
              weekday: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        )}
        <View style={[styles.bubbleWrapper, isMe ? styles.myBubbleWrapper : styles.theirBubbleWrapper]}>
          <View
            style={[
              styles.bubble,
              isMe ? [styles.myBubble, isTemp && { opacity: 0.6 }] : [styles.theirBubble, { backgroundColor: isDark ? "#2a2a2a" : "#f0f0f0" }],
            ]}
          >
            <Text style={[styles.bubbleText, { color: isMe ? "#fff" : colors.text }]}>{item.content}</Text>
          </View>
          <Text style={[styles.bubbleTime, { color: colors.icon }]}>{formatTime(item.created_at)}</Text>
        </View>
      </>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top"]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.icon + "33" }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        {avatar ? (
          <Image source={{ uri: avatar }} style={styles.headerAvatar} />
        ) : (
          <View style={[styles.headerAvatarPlaceholder, { backgroundColor: colors.icon + "44" }]}>
            <Ionicons name="person" size={20} color={colors.icon} />
          </View>
        )}

        <View style={styles.headerInfo}>
          <Text style={[styles.headerName, { color: colors.text }]} numberOfLines={1}>
            {username}
          </Text>
          <Text style={[styles.headerSub, { color: colors.icon }]}>tap to view profile</Text>
        </View>

        <TouchableOpacity>
          <Feather name="video" size={22} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity style={{ marginLeft: 14 }}>
          <Feather name="phone" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color="#fe2c55" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={
              <View style={styles.center}>
                <Text style={[styles.emptyText, { color: colors.icon }]}>No messages yet. Say hi! 👋</Text>
              </View>
            }
          />
        )}

        {/* Input bar */}
        <View style={[styles.inputBar, { borderTopColor: colors.icon + "33", backgroundColor: colors.background }]}>
          <TouchableOpacity>
            <Feather name="camera" size={24} color={colors.icon} />
          </TouchableOpacity>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: isDark ? "#2a2a2a" : "#f5f5f5",
                color: colors.text,
              },
            ]}
            placeholder="Message..."
            placeholderTextColor={colors.icon}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={handleSend}
          />
          {input.trim() ? (
            <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
              <Ionicons name="send" size={18} color="#fff" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity>
              <Feather name="image" size={24} color={colors.icon} />
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 2 },
  headerAvatar: { width: 38, height: 38, borderRadius: 19 },
  headerAvatarPlaceholder: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  headerInfo: { flex: 1 },
  headerName: { fontSize: 15, fontWeight: "700" },
  headerSub: { fontSize: 11 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60 },
  emptyText: { fontSize: 14 },
  messagesList: { paddingHorizontal: 14, paddingVertical: 12 },
  timestamp: { textAlign: "center", fontSize: 11, marginVertical: 10 },
  bubbleWrapper: { marginBottom: 4 },
  myBubbleWrapper: { alignItems: "flex-end" },
  theirBubbleWrapper: { alignItems: "flex-start" },
  bubble: { maxWidth: "75%", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  myBubble: { backgroundColor: "#fe2c55", borderBottomRightRadius: 4 },
  theirBubble: { borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 15, lineHeight: 20 },
  bubbleTime: { fontSize: 10, marginTop: 2, marginHorizontal: 4 },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 9,
    fontSize: 15,
    maxHeight: 100,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#fe2c55",
    alignItems: "center",
    justifyContent: "center",
  },
});
