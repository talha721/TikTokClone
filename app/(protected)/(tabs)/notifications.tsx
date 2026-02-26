import { useTheme } from "@/hooks/use-theme";
import { deleteNotification, fetchNotifications, markAllNotificationsRead, markNotificationRead, subscribeToNotifications } from "@/services/notifications";
import { useAuthStore } from "@/stores/useAuthStore";
import { AppNotification, NotificationType } from "@/types/types";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Image, RefreshControl, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ─── Types ────────────────────────────────────────────────────────────────────

type FilterTab = "all" | "likes" | "comments" | "follows";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "likes", label: "Likes" },
  { key: "comments", label: "Comments" },
  { key: "follows", label: "Follows" },
];

const filterMap: Record<FilterTab, NotificationType[]> = {
  all: ["like", "comment", "follow", "mention", "post"],
  likes: ["like"],
  comments: ["comment", "mention"],
  follows: ["follow"],
};

function formatTimeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });
}

function buildMessage(n: AppNotification): string {
  switch (n.type) {
    case "like":
      return "liked your video";
    case "follow":
      return "started following you";
    case "comment":
      return n.comment ? `commented: "${n.comment}"` : "commented on your video";
    case "mention":
      return "mentioned you in a comment";
    case "post":
      return "posted a new video you might like";
    default:
      return "";
  }
}

function NotificationTypeIcon({ type, size = 14 }: { type: NotificationType; size?: number }) {
  switch (type) {
    case "like":
      return <Ionicons name="heart" size={size} color="#fe2c55" />;
    case "comment":
      return <Ionicons name="chatbubble" size={size} color="#4a90d9" />;
    case "follow":
      return <Ionicons name="person-add" size={size} color="#00c853" />;
    case "mention":
      return <Feather name="at-sign" size={size} color="#ff9800" />;
    case "post":
      return <Feather name="film" size={size} color="#9c27b0" />;
  }
}

function iconBg(type: NotificationType): string {
  switch (type) {
    case "like":
      return "#ffe0e6";
    case "comment":
      return "#e3f0fb";
    case "follow":
      return "#e0f7ea";
    case "mention":
      return "#fff3e0";
    case "post":
      return "#f3e5f5";
  }
}

// ─── Notification Row ─────────────────────────────────────────────────────────

const NotificationRow = ({ item, onRead, onDelete }: { item: AppNotification; onRead: (id: string) => void; onDelete: (id: string) => void }) => {
  const { colors, isDark } = useTheme();
  const unreadBg = isDark ? "#1e2022" : "#eef6ff";

  const handleLongPress = () => {
    Alert.alert("Delete notification", "Remove this notification?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => onDelete(item.id) },
    ]);
  };

  return (
    <TouchableOpacity
      style={[styles.row, { backgroundColor: item.read ? colors.background : unreadBg }]}
      activeOpacity={0.75}
      onPress={() => onRead(item.id)}
      onLongPress={handleLongPress}
      delayLongPress={400}
    >
      {/* Avatar + type badge */}
      <View style={styles.avatarWrap}>
        {item.actor?.avatar_url ? (
          <Image source={{ uri: item.actor.avatar_url }} style={styles.avatarImg} />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: colors.icon + "33" }]}>
            <Ionicons name="person" size={22} color={colors.icon} />
          </View>
        )}
        <View style={[styles.typeIconBadge, { backgroundColor: iconBg(item.type) }]}>
          <NotificationTypeIcon type={item.type} size={12} />
        </View>
      </View>

      {/* Text */}
      <View style={styles.content}>
        <Text style={[styles.bodyText, { color: colors.text }]} numberOfLines={2}>
          <Text style={{ fontWeight: "700" }}>{item.actor?.username ?? "Someone"}</Text>
          {"  "}
          <Text style={{ color: colors.icon, fontWeight: "400" }}>{buildMessage(item)}</Text>
        </Text>
        <Text style={[styles.timeText, { color: colors.icon }]}>{formatTimeAgo(item.created_at)}</Text>
      </View>

      {/* Right side: follow button or post thumbnail */}
      {item.type === "follow" ? (
        <TouchableOpacity style={styles.followBtn} activeOpacity={0.8}>
          <Text style={styles.followBtnText}>Follow</Text>
        </TouchableOpacity>
      ) : item.post?.thumbnail_url ? (
        <Image source={{ uri: item.post.thumbnail_url }} style={[styles.thumbnail, { borderColor: colors.icon + "44" }]} />
      ) : null}

      {/* Unread dot */}
      {!item.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

const Notifications = () => {
  const { colors, isDark } = useTheme();
  const user = useAuthStore((s) => s.user);

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");

  const unsubscribeRef = useRef<(() => void) | null>(null);

  // ── Fetch ────────────────────────────────────────────────────────────────

  const loadNotifications = useCallback(
    async (silent = false) => {
      if (!user) return;
      if (!silent) setLoading(true);
      try {
        const data = await fetchNotifications(user.id);
        setNotifications(data);
      } catch (err) {
        console.error("[Notifications] fetch error", err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user],
  );

  // ── Focus: fetch + subscribe ─────────────────────────────────────────────

  useFocusEffect(
    useCallback(() => {
      if (!user) return;

      loadNotifications();

      const unsub = subscribeToNotifications(user.id, (newNotif) => {
        setNotifications((prev) => [newNotif, ...prev]);
      });
      unsubscribeRef.current = unsub;

      return () => {
        unsubscribeRef.current?.();
        unsubscribeRef.current = null;
      };
    }, [user, loadNotifications]),
  );

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try {
      await markNotificationRead(id);
    } catch {}
  };

  const handleMarkAllRead = async () => {
    if (!user) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await markAllNotificationsRead(user.id);
    } catch {}
  };

  const handleDelete = async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      await deleteNotification(id);
    } catch {}
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadNotifications(true);
  };

  // ── Derived ──────────────────────────────────────────────────────────────

  const filtered = notifications.filter((n) => filterMap[activeFilter].includes(n.type));
  const unreadCount = notifications.filter((n) => !n.read).length;

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.icon + "22" }]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount > 99 ? "99+" : unreadCount}</Text>
            </View>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={handleMarkAllRead} activeOpacity={0.7}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter tabs */}
      <View style={[styles.filterRow, { borderBottomColor: colors.icon + "22" }]}>
        {FILTER_TABS.map((tab) => {
          const isActive = activeFilter === tab.key;
          return (
            <TouchableOpacity key={tab.key} style={styles.filterTab} onPress={() => setActiveFilter(tab.key)} activeOpacity={0.75}>
              <Text style={[styles.filterLabel, { color: isActive ? "#fe2c55" : colors.icon, fontWeight: isActive ? "700" : "500" }]}>{tab.label}</Text>
              {isActive && <View style={styles.filterUnderline} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Loading */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#fe2c55" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <NotificationRow item={item} onRead={handleRead} onDelete={handleDelete} />}
          ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: colors.icon + "18" }]} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#fe2c55" colors={["#fe2c55"]} />}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="notifications-off-outline" size={52} color={colors.icon} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No notifications</Text>
              <Text style={[styles.emptySubtitle, { color: colors.icon }]}>
                {activeFilter === "all" ? "You're all caught up!" : `No ${activeFilter} notifications yet`}
              </Text>
            </View>
          }
          contentContainerStyle={filtered.length === 0 && styles.emptyContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  unreadBadge: {
    backgroundColor: "#fe2c55",
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    minWidth: 22,
    alignItems: "center",
  },
  unreadBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  markAllText: {
    fontSize: 13,
    color: "#fe2c55",
    fontWeight: "600",
  },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  filterTab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    position: "relative",
  },
  filterLabel: {
    fontSize: 14,
  },
  filterUnderline: {
    position: "absolute",
    bottom: 0,
    left: "20%",
    right: "20%",
    height: 2,
    borderRadius: 2,
    backgroundColor: "#fe2c55",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  avatarWrap: {
    position: "relative",
    marginRight: 12,
  },
  avatarImg: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  typeIconBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  content: {
    flex: 1,
    marginRight: 10,
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 20,
  },
  timeText: {
    fontSize: 12,
    marginTop: 3,
  },
  thumbnail: {
    width: 46,
    height: 46,
    borderRadius: 6,
    borderWidth: 1,
  },
  followBtn: {
    backgroundColor: "#fe2c55",
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 6,
  },
  followBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
  unreadDot: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#fe2c55",
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 76,
  },
  emptyWrap: {
    alignItems: "center",
    marginTop: 80,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  emptySubtitle: {
    fontSize: 14,
  },
  emptyContainer: {
    flexGrow: 1,
  },
});

export default Notifications;
