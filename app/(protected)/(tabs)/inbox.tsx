import { useTheme } from "@/hooks/use-theme";
import { fetchConversations, subscribeToConversations } from "@/services/messages";
import { useAuthStore } from "@/stores/useAuthStore";
import { Conversation } from "@/types/types";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Image, RefreshControl, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ─── Conversation Row ─────────────────────────────────────────────────────────

const ConversationRow = ({ item, currentUserId }: { item: Conversation; currentUserId: string }) => {
  const { colors } = useTheme();
  const other = item.otherUser;

  const formatTime = (iso: string) => {
    const date = new Date(iso);
    const now = new Date();
    const diffHours = (now.getTime() - date.getTime()) / 1000 / 60 / 60;
    if (diffHours < 24) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (diffHours < 168) return date.toLocaleDateString([], { weekday: "short" });
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const handlePress = () => {
    router.push({
      pathname: "/(protected)/chat/[conversationId]",
      params: {
        conversationId: item.id,
        username: other?.username ?? "Unknown",
        avatar: (other as any)?.avatar_url ?? "",
      },
    });
  };

  return (
    <TouchableOpacity style={styles.row} onPress={handlePress} activeOpacity={0.7}>
      {(other as any)?.avatar_url ? (
        <Image source={{ uri: (other as any).avatar_url }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatarPlaceholder, { backgroundColor: colors.icon + "33" }]}>
          <Ionicons name="person" size={22} color={colors.icon} />
        </View>
      )}

      <View style={styles.rowText}>
        <Text style={[styles.rowName, { color: colors.text }]} numberOfLines={1}>
          {other?.username ?? "Unknown"}
        </Text>
        <Text style={[styles.rowSub, { color: colors.icon }]} numberOfLines={1}>
          {item.last_message ?? "Start a conversation"}
        </Text>
      </View>

      <Text style={[styles.rowTime, { color: colors.icon }]}>{formatTime(item.last_message_at)}</Text>
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

  const loadConversations = useCallback(async () => {
    if (!user) return;
    try {
      const data = await fetchConversations(user.id);
      setConversations(data);
    } catch (err) {
      console.error("Failed to load conversations", err);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    loadConversations().finally(() => setLoading(false));

    // Realtime: re-fetch list whenever any conversation changes
    const unsubscribe = subscribeToConversations(user.id, loadConversations);
    return unsubscribe;
  }, [user, loadConversations]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadConversations();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity>
          <MaterialCommunityIcons name="account-multiple-plus-outline" size={26} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleRow}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Inbox</Text>
          <View style={styles.onlineDot} />
        </View>
        <TouchableOpacity>
          <Ionicons name="search" size={26} color={colors.text} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#fe2c55" />
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ConversationRow item={item} currentUserId={user?.id ?? ""} />}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fe2c55" colors={["#fe2c55"]} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Feather name="message-circle" size={48} color={colors.icon + "66"} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No conversations yet</Text>
              <Text style={[styles.emptySub, { color: colors.icon }]}>Follow people and start chatting!</Text>
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
});

export default Inbox;
