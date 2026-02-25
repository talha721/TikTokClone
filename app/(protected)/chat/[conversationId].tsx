import { useTheme } from "@/hooks/use-theme";
import { supabase, supabaseUrl } from "@/lib/supabase";
import { fetchMessages, markMessagesRead, sendMessage, subscribeToMessages, subscribeToTyping } from "@/services/messages";
import { useAuthStore } from "@/stores/useAuthStore";
import { Message } from "@/types/types";
import { Feather, Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  AppState,
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
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

export default function ChatScreen() {
  const params = useLocalSearchParams<{
    conversationId: string;
    username: string;
    avatar?: string;
    userId?: string;
  }>();
  const conversationId = Array.isArray(params.conversationId) ? params.conversationId[0] : params.conversationId;
  const username = Array.isArray(params.username) ? params.username[0] : params.username;
  const avatar = Array.isArray(params.avatar) ? params.avatar[0] : params.avatar;
  const userId = Array.isArray(params.userId) ? params.userId[0] : params.userId;
  const { colors, isDark } = useTheme();
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const messagesRef = useRef<Message[]>([]);
  const typingHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sendTypingRef = useRef<(() => void) | null>(null);
  const lastTypingBroadcast = useRef(0);
  // Animated dots for typing indicator
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!otherTyping) return;
    const anim = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: -5, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay(600),
        ]),
      );
    const a1 = anim(dot1, 0);
    const a2 = anim(dot2, 150);
    const a3 = anim(dot3, 300);
    a1.start();
    a2.start();
    a3.start();
    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
      dot1.setValue(0);
      dot2.setValue(0);
      dot3.setValue(0);
    };
  }, [otherTyping]);

  // Keep ref in sync so realtime callback never has a stale closure
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (!conversationId || !user) return;

    // Load initial messages
    fetchMessages(conversationId)
      .then((msgs) => {
        setMessages(msgs);
        setLoading(false);
        markMessagesRead(conversationId, user.id);
      })
      .catch(() => setLoading(false));

    // Subscribe to ALL inserts in this conversation (both sides)
    const unsubscribe = subscribeToMessages(conversationId, (newMsg) => {
      setMessages((prev) => {
        if (newMsg.id && prev.some((m) => m.id === newMsg.id)) return prev;
        const withoutTemp = prev.filter((m) => !(String(m.id ?? "").startsWith("temp-") && m.sender_id === newMsg.sender_id && m.content === newMsg.content));
        return [...withoutTemp, newMsg];
      });
      if (newMsg.sender_id !== user.id) {
        // Clear typing indicator when a real message arrives
        setOtherTyping(false);
        markMessagesRead(conversationId, user.id);
      }
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80);
    });

    // Subscribe to typing indicator
    const { sendTyping, unsubscribe: unsubTyping } = subscribeToTyping(conversationId, user.id, () => {
      setOtherTyping(true);
      // Auto-hide after 3 s of no new typing events
      if (typingHideTimer.current) clearTimeout(typingHideTimer.current);
      typingHideTimer.current = setTimeout(() => setOtherTyping(false), 3000);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80);
    });
    sendTypingRef.current = sendTyping;

    // Polling fallback — fires every 3 s to catch any missed realtime events
    const pollInterval = setInterval(async () => {
      const last = messagesRef.current[messagesRef.current.length - 1];
      // Only poll for messages newer than what we have
      const since = last?.created_at ?? new Date(0).toISOString();
      try {
        const { data } = await supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", conversationId)
          .gt("created_at", since)
          .order("created_at", { ascending: true });
        if (data && data.length > 0) {
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const fresh = (data as Message[]).filter((m) => m.id && !existingIds.has(m.id));
            if (fresh.length === 0) return prev;
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80);
            return [...prev, ...fresh];
          });
        }
      } catch (_) {}
    }, 3000);

    // Also re-fetch when app returns to foreground — merge, don't replace
    const appStateSub = AppState.addEventListener("change", (state) => {
      if (state === "active")
        fetchMessages(conversationId)
          .then((msgs) => {
            setMessages((prev) => {
              const existingIds = new Set(prev.map((m) => m.id));
              const fresh = msgs.filter((m) => !existingIds.has(m.id));
              if (fresh.length === 0) return prev;
              return [...prev, ...fresh].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            });
          })
          .catch(() => {});
    });

    return () => {
      unsubscribe();
      unsubTyping();
      clearInterval(pollInterval);
      appStateSub.remove();
    };
  }, [conversationId, user]);

  // ─── Media helpers ────────────────────────────────────────────────────────
  const uploadMedia = async (uri: string, mediaType: "image" | "video"): Promise<string> => {
    const ext = mediaType === "image" ? "jpg" : "mp4";
    // Path: <userId>/<conversationId>/<timestamp>.<ext>
    // The first segment MUST be the user's ID so the INSERT RLS policy resolves correctly.
    const fileName = `${user!.id}/${conversationId}/${Date.now()}.${ext}`;
    const mimeType = mediaType === "image" ? "image/jpeg" : "video/mp4";

    // React Native: use FormData with the local file URI — blob() doesn't work here
    const formData = new FormData();
    formData.append("file", { uri, name: fileName, type: mimeType } as any);

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    const uploadUrl = `${supabaseUrl}/storage/v1/object/chat-media/${fileName}`;
    const res = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "x-upsert": "true",
      },
      body: formData,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Upload failed (${res.status}): ${text}`);
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("chat-media").getPublicUrl(fileName);
    return publicUrl;
  };

  const handlePickMedia = async (source: "gallery" | "camera") => {
    if (!user || !conversationId || sending) return;

    let result: ImagePicker.ImagePickerResult;
    if (source === "camera") {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Camera access is required to take photos/videos.");
        return;
      }
      result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images", "videos"],
        quality: 0.8,
        videoMaxDuration: 60,
      });
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Photo library access is required to share media.");
        return;
      }
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images", "videos"],
        quality: 0.8,
        videoMaxDuration: 60,
      });
    }

    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const mediaType = asset.type === "video" ? "video" : "image";

    setSending(true);
    try {
      const url = await uploadMedia(asset.uri, mediaType);
      const prefix = mediaType === "image" ? "__IMAGE__:" : "__VIDEO__:";
      const sent = await sendMessage(conversationId, user.id, prefix + url);
      setMessages((prev) => [...prev, sent]);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80);
    } catch (err) {
      console.error("Failed to send media:", err);
      Alert.alert("Error", "Failed to send media. Please try again.");
    } finally {
      setSending(false);
    }
  };

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
    } catch (err) {
      console.error("Failed to send message:", err);
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
    const isTemp = String(item.id ?? "").startsWith("temp-");
    const prevMsg = messages[index - 1];
    const showTimestamp = !prevMsg || new Date(item.created_at).getTime() - new Date(prevMsg.created_at).getTime() > 5 * 60 * 1000;
    const isImage = item.content.startsWith("__IMAGE__:");
    const isVideo = item.content.startsWith("__VIDEO__:");
    const mediaUrl = isImage || isVideo ? item.content.replace(/^__(IMAGE|VIDEO)__:/, "") : null;

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
          {mediaUrl ? (
            <View style={[styles.mediaBubble, isTemp && { opacity: 0.6 }]}>
              {isImage ? (
                <Image source={{ uri: mediaUrl }} style={styles.mediaImage} resizeMode="cover" />
              ) : (
                <View style={[styles.mediaImage, styles.videoPlaceholder, { backgroundColor: isDark ? "#1a1a1a" : "#ddd" }]}>
                  <Ionicons name="play-circle" size={48} color="#fff" />
                </View>
              )}
            </View>
          ) : (
            <View
              style={[
                styles.bubble,
                isMe ? [styles.myBubble, isTemp && { opacity: 0.6 }] : [styles.theirBubble, { backgroundColor: isDark ? "#2a2a2a" : "#f0f0f0" }],
              ]}
            >
              <Text style={[styles.bubbleText, { color: isMe ? "#fff" : colors.text }]}>{item.content}</Text>
            </View>
          )}
          <Text style={[styles.bubbleTime, { color: colors.icon }]}>{formatTime(item.created_at)}</Text>
        </View>
      </>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top"]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) : insets.top}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.icon + "33" }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerProfile}
            activeOpacity={0.7}
            onPress={() => {
              if (userId) {
                router.push({ pathname: "/(protected)/userProfile", params: { userId, username, avatar: avatar ?? "" } });
              }
            }}
          >
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
          </TouchableOpacity>

          {/* <TouchableOpacity>
            <Feather name="video" size={22} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={{ marginLeft: 14 }}>
            <Feather name="phone" size={22} color={colors.text} />
          </TouchableOpacity> */}
        </View>

        {/* Messages */}
        <View style={{ flex: 1 }}>
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator color="#fe2c55" />
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item, index) => String(item.id ?? `${item.created_at}-${index}`)}
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

          {/* Typing indicator */}
          {otherTyping && (
            <View style={styles.typingRow}>
              <View style={[styles.typingBubble, { backgroundColor: isDark ? "#2a2a2a" : "#f0f0f0" }]}>
                <Animated.View style={[styles.typingDot, { backgroundColor: colors.icon, transform: [{ translateY: dot1 }] }]} />
                <Animated.View style={[styles.typingDot, { backgroundColor: colors.icon, transform: [{ translateY: dot2 }] }]} />
                <Animated.View style={[styles.typingDot, { backgroundColor: colors.icon, transform: [{ translateY: dot3 }] }]} />
              </View>
            </View>
          )}

          {/* Input bar */}
          <View
            style={[
              styles.inputBar,
              { borderTopColor: colors.icon + "33", backgroundColor: colors.background, paddingBottom: insets.bottom > 0 ? insets.bottom : 10 },
            ]}
          >
            <TouchableOpacity onPress={() => handlePickMedia("camera")} disabled={sending}>
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
              onChangeText={(text) => {
                setInput(text);
                // Broadcast typing at most once per 2 s
                const now = Date.now();
                if (text.length > 0 && now - lastTypingBroadcast.current > 2000) {
                  lastTypingBroadcast.current = now;
                  sendTypingRef.current?.();
                }
              }}
              multiline
              maxLength={500}
              returnKeyType="send"
              onSubmitEditing={handleSend}
            />
            {input.trim() ? (
              <TouchableOpacity style={styles.sendBtn} onPress={handleSend} disabled={sending}>
                {sending ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={18} color="#fff" />}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={() => handlePickMedia("gallery")} disabled={sending}>
                <Feather name="image" size={24} color={colors.icon} />
              </TouchableOpacity>
            )}
          </View>
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
  headerProfile: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
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
    paddingTop: 10,
    gap: 10,
    borderTopWidth: 1,
  },
  mediaBubble: {
    maxWidth: "75%",
    borderRadius: 14,
    overflow: "hidden",
  },
  mediaImage: {
    width: 220,
    height: 220,
    borderRadius: 14,
  },
  videoPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
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
  typingRow: {
    paddingHorizontal: 14,
    paddingBottom: 6,
    alignItems: "flex-start",
  },
  typingBubble: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
  },
  typingDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
});
