import { useTheme } from "@/hooks/use-theme";
import { fetchPosts } from "@/services/posts";
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { useInfiniteQuery } from "@tanstack/react-query";
import React, { FC, useMemo, useRef, useState } from "react";
import { Alert, Animated, Dimensions, FlatList, Image, Modal, Pressable, StyleSheet, Text, TouchableWithoutFeedback, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "../../../stores/useAuthStore";

const windowWidth = Dimensions.get("window").width;
const GRID_GAP = 2;
const ITEM_SIZE = (windowWidth - GRID_GAP * 2) / 3;

type TabKey = "videos" | "private" | "reposts" | "saved" | "liked";
const TABS: TabKey[] = ["videos", "private", "reposts", "saved", "liked"];

function TabIcon({ tabKey, active, activeColor, inactiveColor }: { tabKey: TabKey; active: boolean; activeColor: string; inactiveColor: string }) {
  const color = active ? activeColor : inactiveColor;
  switch (tabKey) {
    case "videos":
      return <MaterialCommunityIcons name="tune-variant" size={22} color={color} />;
    case "private":
      return <Ionicons name="lock-closed" size={20} color={color} />;
    case "reposts":
      return <MaterialCommunityIcons name="repeat" size={22} color={color} />;
    case "saved":
      return <Ionicons name="bookmark-outline" size={20} color={color} />;
    case "liked":
      return <Ionicons name="heart-outline" size={20} color={color} />;
  }
}

const Profile: FC = () => {
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const { isDark, colors, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState("videos");
  const [menuVisible, setMenuVisible] = useState(false);

  const DRAWER_WIDTH = windowWidth * 0.72;
  const slideAnim = useRef(new Animated.Value(DRAWER_WIDTH)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  const openMenu = () => {
    setMenuVisible(true);
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 280, useNativeDriver: true }),
      Animated.timing(backdropOpacity, { toValue: 1, duration: 280, useNativeDriver: true }),
    ]).start();
  };

  const closeMenu = () => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: DRAWER_WIDTH, duration: 240, useNativeDriver: true }),
      Animated.timing(backdropOpacity, { toValue: 0, duration: 240, useNativeDriver: true }),
    ]).start(() => setMenuVisible(false));
  };

  const handleLogout = () => {
    closeMenu();
    setTimeout(() => {
      Alert.alert("Logout", "Are you sure you want to logout?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            try {
              await logout();
            } catch (e) {
              console.error("Logout failed", e);
            }
          },
        },
      ]);
    }, 300);
  };

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["posts"],
    queryFn: ({ pageParam }) => fetchPosts(pageParam, user?.id as string),
    initialPageParam: { limit: 12, cursor: undefined },
    getNextPageParam: (lastPage) => {
      if (lastPage.length === 0) return undefined;
      return { limit: 12, cursor: lastPage[lastPage.length - 1].id };
    },
  });

  const posts = useMemo(() => data?.pages.flat() || [], [data]);

  // ─── derived theme colors ────────────────────────────────────────────────
  const textPrimary = colors.text;
  const textSecondary = colors.icon;
  const borderColor = isDark ? "#333" : "#ddd";
  const tabBorder = isDark ? "#2a2a2a" : "#e0e0e0";
  const iconColor = colors.icon;
  // ─────────────────────────────────────────────────────────────────────────

  const renderPost = ({ item, index }: { item: { id: string; thumbnail_url?: string; video_url?: string; likesCount?: number }; index: number }) => (
    <Pressable style={[styles.postItem, { backgroundColor: isDark ? "#1a1a1a" : "#e5e5e5" }]}>
      <Image source={{ uri: item.thumbnail_url || item.video_url }} style={styles.postImage} resizeMode="cover" />
      <View style={styles.postOverlay}>
        <Ionicons name="play" size={10} color="#fff" />
        <Text style={styles.playCount}>{item.likesCount ?? 0}</Text>
      </View>
    </Pressable>
  );

  const ListHeader = () => (
    <View style={{ backgroundColor: colors.background }}>
      {/* Top Nav */}
      <View style={styles.topNav}>
        <Pressable style={styles.navIcon}>
          <Ionicons name="person-add-outline" size={24} color={iconColor} />
        </Pressable>
        <View style={styles.navRight}>
          <Pressable style={styles.navIcon}>
            <Ionicons name="arrow-redo-outline" size={24} color={iconColor} />
          </Pressable>
          <Pressable style={styles.navIcon} onPress={openMenu}>
            <Ionicons name="menu" size={26} color={iconColor} />
          </Pressable>
        </View>
      </View>

      {/* Avatar */}
      <View style={styles.avatarWrapper}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarLetter}>{(user?.username?.[0] ?? "U").toUpperCase()}</Text>
        </View>
        <Pressable style={[styles.addAvatarBtn, { borderColor: colors.background }]}>
          <Ionicons name="add" size={16} color="#fff" />
        </Pressable>
      </View>

      {/* Username + Edit */}
      <View style={styles.usernameRow}>
        <Text style={[styles.username, { color: textPrimary }]}>{user?.username ?? "Username"}</Text>
        <MaterialIcons name="keyboard-arrow-down" size={20} color={textPrimary} />
        <Pressable style={[styles.editButton, { borderColor: borderColor }]}>
          <Text style={[styles.editText, { color: textPrimary }]}>Edit</Text>
        </Pressable>
      </View>

      {/* Handle */}
      <Text style={[styles.handle, { color: textSecondary }]}>@{user?.username?.toLowerCase() ?? "username"}</Text>

      {/* Stats */}
      <View style={styles.statsRow}>
        <Pressable style={styles.statItem}>
          <Text style={[styles.statNumber, { color: textPrimary }]}>0</Text>
          <Text style={[styles.statLabel, { color: textSecondary }]}>Following</Text>
        </Pressable>
        <View style={[styles.statDivider, { backgroundColor: borderColor }]} />
        <Pressable style={styles.statItem}>
          <Text style={[styles.statNumber, { color: textPrimary }]}>0</Text>
          <Text style={[styles.statLabel, { color: textSecondary }]}>Followers</Text>
        </Pressable>
        <View style={[styles.statDivider, { backgroundColor: borderColor }]} />
        <Pressable style={styles.statItem}>
          <Text style={[styles.statNumber, { color: textPrimary }]}>0</Text>
          <Text style={[styles.statLabel, { color: textSecondary }]}>Likes</Text>
        </Pressable>
      </View>

      {/* Content Tabs */}
      <View style={[styles.tabsRow, { borderTopColor: tabBorder, borderBottomColor: tabBorder }]}>
        {TABS.map((tab) => (
          <Pressable key={tab} style={styles.tabItem} onPress={() => setActiveTab(tab)}>
            <TabIcon tabKey={tab} active={activeTab === tab} activeColor={textPrimary} inactiveColor={textSecondary} />
            {activeTab === tab && <View style={[styles.tabUnderline, { backgroundColor: textPrimary }]} />}
          </Pressable>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={["top"]}>
      <FlatList
        data={posts}
        keyExtractor={(i) => i.id}
        renderItem={renderPost}
        numColumns={3}
        ListHeaderComponent={ListHeader}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        onEndReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
        onEndReachedThreshold={0.5}
        columnWrapperStyle={styles.columnWrapper}
      />

      {/* ── Off-canvas menu ── */}
      <Modal visible={menuVisible} transparent animationType="none" onRequestClose={closeMenu}>
        <View style={styles.modalRoot}>
          {/* Backdrop */}
          <TouchableWithoutFeedback onPress={closeMenu}>
            <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} />
          </TouchableWithoutFeedback>

          {/* Drawer panel */}
          <Animated.View
            style={[
              styles.drawer,
              {
                width: windowWidth * 0.72,
                backgroundColor: isDark ? "#1a1a1a" : "#fff",
                transform: [{ translateX: slideAnim }],
              },
            ]}
          >
            {/* Header */}
            <View style={[styles.drawerHeader, { borderBottomColor: isDark ? "#333" : "#e0e0e0" }]}>
              <View style={styles.drawerAvatarCircle}>
                <Text style={styles.drawerAvatarLetter}>{(user?.username?.[0] ?? "U").toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.drawerUsername, { color: colors.text }]}>{user?.username ?? "Username"}</Text>
                <Text style={[styles.drawerHandle, { color: colors.icon }]}>@{user?.username?.toLowerCase() ?? "username"}</Text>
              </View>
              <Pressable onPress={closeMenu} style={styles.drawerCloseBtn}>
                <Ionicons name="close" size={22} color={colors.icon} />
              </Pressable>
            </View>

            {/* Menu items */}
            <View style={styles.drawerBody}>
              {/* Dark / Light mode toggle */}
              <Pressable style={[styles.drawerItem, { borderBottomColor: isDark ? "#2a2a2a" : "#f0f0f0" }]} onPress={toggleTheme}>
                <View style={[styles.drawerItemIcon, { backgroundColor: isDark ? "#2d2d2d" : "#f3f3f3" }]}>
                  <Ionicons name={isDark ? "sunny-outline" : "moon-outline"} size={20} color={colors.text} />
                </View>
                <Text style={[styles.drawerItemText, { color: colors.text }]}>{isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.icon} />
              </Pressable>

              {/* Logout */}
              <Pressable style={[styles.drawerItem, { borderBottomColor: isDark ? "#2a2a2a" : "#f0f0f0" }]} onPress={handleLogout}>
                <View style={[styles.drawerItemIcon, { backgroundColor: "#ffe5e9" }]}>
                  <Ionicons name="log-out-outline" size={20} color="#fe2c55" />
                </View>
                <Text style={[styles.drawerItemText, { color: "#fe2c55" }]}>Logout</Text>
                <Ionicons name="chevron-forward" size={16} color="#fe2c55" />
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default Profile;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 90,
  },
  columnWrapper: {
    gap: GRID_GAP,
  },

  // Top Nav
  topNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  navIcon: {
    padding: 4,
  },
  navRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  // Avatar
  avatarWrapper: {
    alignItems: "center",
    marginTop: 8,
    marginBottom: 12,
  },
  avatarCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#555",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: {
    color: "#fff",
    fontSize: 38,
    fontWeight: "700",
  },
  addAvatarBtn: {
    position: "absolute",
    bottom: 0,
    right: windowWidth / 2 - 48 - 12,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#fe2c55",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },

  // Username row
  usernameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginBottom: 4,
  },
  username: {
    fontSize: 20,
    fontWeight: "700",
  },
  editButton: {
    marginLeft: 8,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 4,
    borderWidth: 1,
  },
  editText: {
    fontSize: 14,
    fontWeight: "600",
  },
  handle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 16,
  },

  // Stats
  statsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    gap: 0,
  },
  statItem: {
    alignItems: "center",
    paddingHorizontal: 20,
  },
  statDivider: {
    width: 1,
    height: 28,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },

  // Tabs
  tabsRow: {
    flexDirection: "row",
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    marginBottom: GRID_GAP,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    position: "relative",
  },
  tabUnderline: {
    position: "absolute",
    bottom: 0,
    left: "15%",
    right: "15%",
    height: 2,
    borderRadius: 1,
  },

  // Grid
  postItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE * 1.4,
    marginBottom: GRID_GAP,
  },
  postImage: {
    width: "100%",
    height: "100%",
  },
  postOverlay: {
    position: "absolute",
    bottom: 6,
    left: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  playCount: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },

  // ── Off-canvas drawer ──────────────────────────────────────────────────
  modalRoot: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  drawer: {
    height: "100%",
    shadowColor: "#000",
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 20,
  },
  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 20,
    borderBottomWidth: 0.5,
  },
  drawerAvatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#555",
    alignItems: "center",
    justifyContent: "center",
  },
  drawerAvatarLetter: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },
  drawerUsername: {
    fontSize: 15,
    fontWeight: "700",
  },
  drawerHandle: {
    fontSize: 13,
    marginTop: 2,
  },
  drawerCloseBtn: {
    padding: 4,
  },
  drawerBody: {
    paddingTop: 8,
  },
  drawerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
  },
  drawerItemIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  drawerItemText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
  },
});
