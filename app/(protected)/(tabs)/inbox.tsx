import { useTheme } from "@/hooks/use-theme";
import {
  deleteConversation,
  fetchConversations,
  getOrCreateConversation,
  searchUsers,
  subscribeToConversations,
  subscribeToInboxMessages,
} from "@/services/messages";
import { useAuthStore } from "@/stores/useAuthStore";
import { Conversation } from "@/types/types";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Keyboard,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type SearchTab = "chats" | "people";
type UserResult = { id: string; username: string; avatar_url?: string };

// ─── Conversation Row ─────────────────────────────────────────────────────────

const ConversationRow = ({ item, onLongPress }: { item: Conversation; onLongPress: (conv: Conversation) => void }) => {
  const { colors } = useTheme();
  const other = item.otherUser;
  const unread = (item.unread_count ?? 0) > 0;

  const formatTime = (iso: string) => {
    const date = new Date(iso);
    const now = new Date();
    const diffHours = (now.getTime() - date.getTime()) / 1000 / 60 / 60;
    if (diffHours < 24) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (diffHours < 168) return date.toLocaleDateString([], { weekday: "short" });
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const formatLastMessage = (msg?: string) => {
    if (!msg) return "Start a conversation";
    if (msg.startsWith("__IMAGE__:")) return "📷 Photo";
    if (msg.startsWith("__VIDEO__:")) return "🎥 Video";
    return msg;
  };

  const handlePress = () => {
    router.push({
      pathname: "/(protected)/chat/[conversationId]",
      params: {
        conversationId: item.id,
        username: other?.username ?? "Unknown",
        avatar: (other as any)?.avatar_url ?? "",
        userId: (other as any)?.id ?? "",
      },
    });
  };

  return (
    <TouchableOpacity style={styles.row} onPress={handlePress} onLongPress={() => onLongPress(item)} delayLongPress={400} activeOpacity={0.7}>
      {(other as any)?.avatar_url ? (
        <Image source={{ uri: (other as any).avatar_url }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatarPlaceholder, { backgroundColor: colors.icon + "33" }]}>
          <Ionicons name="person" size={22} color={colors.icon} />
        </View>
      )}

      <View style={styles.rowText}>
        <Text style={[styles.rowName, { color: colors.text, fontWeight: unread ? "700" : "600" }]} numberOfLines={1}>
          {other?.username ?? "Unknown"}
        </Text>
        <Text style={[styles.rowSub, { color: unread ? colors.text : colors.icon, fontWeight: unread ? "600" : "400" }]} numberOfLines={1}>
          {formatLastMessage(item.last_message)}
        </Text>
      </View>

      <View style={styles.rowMeta}>
        <Text style={[styles.rowTime, { color: unread ? "#fe2c55" : colors.icon }]}>{formatTime(item.last_message_at)}</Text>
        {unread && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadCount}>{(item.unread_count ?? 0) > 99 ? "99+" : item.unread_count}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

// ─── User Result Row ──────────────────────────────────────────────────────────

const UserRow = ({ item, onPress, loading }: { item: UserResult; onPress: (u: UserResult) => void; loading: boolean }) => {
  const { colors } = useTheme();
  return (
    <TouchableOpacity style={styles.row} onPress={() => onPress(item)} activeOpacity={0.7} disabled={loading}>
      {item.avatar_url ? (
        <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatarPlaceholder, { backgroundColor: colors.icon + "33" }]}>
          <Ionicons name="person" size={22} color={colors.icon} />
        </View>
      )}
      <View style={styles.rowText}>
        <Text style={[styles.rowName, { color: colors.text }]} numberOfLines={1}>
          {item.username}
        </Text>
        <Text style={[styles.rowSub, { color: colors.icon }]}>Tap to message</Text>
      </View>
      {loading ? <ActivityIndicator size="small" color="#fe2c55" /> : <Feather name="send" size={18} color={colors.icon} />}
    </TouchableOpacity>
  );
};

// ─── Inbox Screen ─────────────────────────────────────────────────────────────

const Inbox = () => {
  const { colors, isDark } = useTheme();
  const user = useAuthStore((s) => s.user);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search state
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTab, setSearchTab] = useState<SearchTab>("chats");
  const [query, setQuery] = useState("");
  const [userResults, setUserResults] = useState<UserResult[]>([]);
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const [startingChat, setStartingChat] = useState<string | null>(null); // userId being navigated to
  const inputRef = useRef<TextInput>(null);

  const loadConversations = useCallback(async () => {
    if (!user) return;
    try {
      const data = await fetchConversations(user.id);
      setConversations(data);
      return data;
    } catch (err) {
      console.error("Failed to load conversations", err);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    let unsubMsgs: (() => void) | undefined;

    const init = async () => {
      const data = await loadConversations();
      setLoading(false);
      // Subscribe to new messages in all loaded conversations for instant updates
      if (data && data.length > 0) {
        unsubMsgs = subscribeToInboxMessages(
          data.map((c) => c.id),
          () => loadConversations(),
        );
      }
    };
    init();

    // Subscribe to changes on the conversations table itself
    const unsubConvs = subscribeToConversations(user.id, () => {
      loadConversations();
    });

    // Polling fallback every 6 s — catches any missed realtime events
    const poll = setInterval(() => loadConversations(), 6000);

    return () => {
      unsubMsgs?.();
      unsubConvs();
      clearInterval(poll);
    };
  }, [user, loadConversations]);

  // Reload when navigating back from chat (so unread badges clear after read)
  useFocusEffect(
    useCallback(() => {
      if (user) loadConversations();
    }, [user, loadConversations]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadConversations();
    setRefreshing(false);
  };

  // ── Search logic ────────────────────────────────────────────────────────────

  const openSearch = () => {
    setSearchOpen(true);
    setQuery("");
    setUserResults([]);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const closeSearch = () => {
    Keyboard.dismiss();
    setSearchOpen(false);
    setQuery("");
    setUserResults([]);
    setSearchTab("chats");
  };

  // Debounced people search
  useEffect(() => {
    if (searchTab !== "people" || !query.trim()) {
      setUserResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setUserSearchLoading(true);
      try {
        const results = await searchUsers(query, user?.id ?? "");
        setUserResults(results);
      } catch (err) {
        console.error("User search failed", err);
      } finally {
        setUserSearchLoading(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [query, searchTab, user?.id]);

  // Filter conversations by query (chat tab)
  const filteredConversations =
    searchOpen && searchTab === "chats" && query.trim()
      ? conversations.filter((c) => c.otherUser?.username?.toLowerCase().includes(query.trim().toLowerCase()))
      : conversations;

  // Long-press conversation → delete
  const handleLongPressConversation = (conv: Conversation) => {
    Alert.alert("Delete Conversation", `Delete your conversation with ${conv.otherUser?.username ?? "this user"}? This cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteConversation(conv.id);
            setConversations((prev) => prev.filter((c) => c.id !== conv.id));
          } catch {
            Alert.alert("Error", "Could not delete conversation. Please try again.");
          }
        },
      },
    ]);
  };

  // Navigate to user's chat (create if needed)
  const handleStartChat = async (targetUser: UserResult) => {
    if (!user) return;
    setStartingChat(targetUser.id);
    try {
      const conv = await getOrCreateConversation(user.id, targetUser.id);
      closeSearch();
      router.push({
        pathname: "/(protected)/chat/[conversationId]",
        params: {
          conversationId: conv.id,
          username: targetUser.username,
          avatar: targetUser.avatar_url ?? "",
          userId: targetUser.id,
        },
      });
    } catch (err) {
      console.error("Failed to start chat", err);
    } finally {
      setStartingChat(null);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header */}
      {!searchOpen ? (
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              openSearch();
              setSearchTab("people");
            }}
          >
            <MaterialCommunityIcons name="account-multiple-plus-outline" size={26} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTitleRow}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Inbox</Text>
            <View style={styles.onlineDot} />
          </View>
          <TouchableOpacity onPress={openSearch}>
            <Ionicons name="search" size={26} color={colors.text} />
          </TouchableOpacity>
        </View>
      ) : (
        /* Search header */
        <View style={[styles.searchHeader, { borderBottomColor: colors.icon + "22" }]}>
          <View style={[styles.searchInputWrap, { backgroundColor: colors.icon + "18" }]}>
            <Ionicons name="search" size={18} color={colors.icon} style={{ marginRight: 6 }} />
            <TextInput
              ref={inputRef}
              value={query}
              onChangeText={setQuery}
              placeholder={searchTab === "chats" ? "Search conversations…" : "Find people…"}
              placeholderTextColor={colors.icon}
              style={[styles.searchInput, { color: colors.text }]}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery("")}>
                <Ionicons name="close-circle" size={18} color={colors.icon} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity onPress={closeSearch} style={styles.cancelBtn}>
            <Text style={{ color: "#fe2c55", fontWeight: "600", fontSize: 15 }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Search Tabs */}
      {searchOpen && (
        <View style={[styles.tabs, { borderBottomColor: colors.icon + "22" }]}>
          {(["chats", "people"] as SearchTab[]).map((tab, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.tab, searchTab === tab && styles.tabActive]}
              onPress={() => {
                setSearchTab(tab);
                setQuery("");
                setUserResults([]);
              }}
            >
              <Text style={[styles.tabText, { color: searchTab === tab ? "#fe2c55" : colors.icon }]}>{tab === "chats" ? "Chats" : "People"}</Text>
              {searchTab === tab && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Body */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#fe2c55" />
        </View>
      ) : searchOpen && searchTab === "people" ? (
        /* People search results */
        userSearchLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color="#fe2c55" />
          </View>
        ) : (
          <FlatList
            data={userResults}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => <UserRow item={item} onPress={handleStartChat} loading={startingChat === item.id} />}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.center}>
                {query.trim() ? (
                  <>
                    <Feather name="user-x" size={42} color={colors.icon + "66"} />
                    <Text style={[styles.emptyTitle, { color: colors.text }]}>No users found</Text>
                    <Text style={[styles.emptySub, { color: colors.icon }]}>Try a different username</Text>
                  </>
                ) : (
                  <>
                    <Feather name="users" size={42} color={colors.icon + "66"} />
                    <Text style={[styles.emptyTitle, { color: colors.text }]}>Find someone</Text>
                    <Text style={[styles.emptySub, { color: colors.icon }]}>Type a username to search</Text>
                  </>
                )}
              </View>
            }
          />
        )
      ) : (
        /* Conversations list (with optional chat filter) */
        <FlatList
          data={filteredConversations}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => <ConversationRow item={item} onLongPress={handleLongPressConversation} />}
          showsVerticalScrollIndicator={false}
          refreshControl={!searchOpen ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fe2c55" colors={["#fe2c55"]} /> : undefined}
          ListEmptyComponent={
            <View style={styles.center}>
              <Feather name="message-circle" size={48} color={colors.icon + "66"} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>{searchOpen && query.trim() ? "No matching chats" : "No conversations yet"}</Text>
              <Text style={[styles.emptySub, { color: colors.icon }]}>
                {searchOpen && query.trim() ? "Try a different name" : "Follow people and start chatting!"}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#22c55e",
  },
  searchHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  searchInput: { flex: 1, fontSize: 15, padding: 0 },
  cancelBtn: { paddingLeft: 4 },
  tabs: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    position: "relative",
  },
  tabActive: {},
  tabText: { fontSize: 14, fontWeight: "600" },
  tabIndicator: {
    position: "absolute",
    bottom: 0,
    left: "20%",
    right: "20%",
    height: 2,
    backgroundColor: "#fe2c55",
    borderRadius: 1,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 8,
  },
  emptyTitle: { fontSize: 16, fontWeight: "600", marginTop: 12 },
  emptySub: { fontSize: 13 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  avatar: { width: 52, height: 52, borderRadius: 26, flexShrink: 0 },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  rowText: { flex: 1, gap: 3 },
  rowName: { fontSize: 15, fontWeight: "600" },
  rowSub: { fontSize: 13 },
  rowTime: { fontSize: 11 },
  rowMeta: { alignItems: "flex-end", gap: 4 },
  unreadBadge: {
    backgroundColor: "#fe2c55",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  unreadCount: { color: "#fff", fontSize: 11, fontWeight: "700" },
});

export default Inbox;
