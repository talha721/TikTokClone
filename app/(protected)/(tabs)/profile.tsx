import { fetchPosts } from "@/services/posts";
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { useInfiniteQuery } from "@tanstack/react-query";
import React, { FC, useMemo, useState } from "react";
import { Alert, Dimensions, FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "../../../stores/useAuthStore";

const windowWidth = Dimensions.get("window").width;
const GRID_GAP = 2;
const ITEM_SIZE = (windowWidth - GRID_GAP * 2) / 3;

const TABS = [
  { key: "videos", icon: (active: boolean) => <MaterialCommunityIcons name="tune-variant" size={22} color={active ? "#fff" : "#888"} /> },
  { key: "private", icon: (active: boolean) => <Ionicons name="lock-closed" size={20} color={active ? "#fff" : "#888"} /> },
  { key: "reposts", icon: (active: boolean) => <MaterialCommunityIcons name="repeat" size={22} color={active ? "#fff" : "#888"} /> },
  { key: "saved", icon: (active: boolean) => <Ionicons name="bookmark-outline" size={20} color={active ? "#fff" : "#888"} /> },
  { key: "liked", icon: (active: boolean) => <Ionicons name="heart-outline" size={20} color={active ? "#fff" : "#888"} /> },
];

const Profile: FC = () => {
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const [activeTab, setActiveTab] = useState("videos");

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

  const handleLogout = async () => {
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
  };

  const renderPost = ({ item, index }: { item: { id: string; thumbnail_url?: string; video_url?: string; likesCount?: number }; index: number }) => (
    <Pressable style={styles.postItem}>
      <Image source={{ uri: item.thumbnail_url || item.video_url }} style={styles.postImage} resizeMode="cover" />
      {/* {index === 0 && (
        <View style={styles.draftBadge}>
          <Text style={styles.draftText}>Drafts: 2</Text>
        </View>
      )} */}
      <View style={styles.postOverlay}>
        <Ionicons name="play" size={10} color="#fff" />
        <Text style={styles.playCount}>{item.likesCount ?? 0}</Text>
      </View>
    </Pressable>
  );

  const ListHeader = () => (
    <View>
      {/* Top Nav */}
      <View style={styles.topNav}>
        <Pressable style={styles.navIcon}>
          <Ionicons name="person-add-outline" size={24} color="#fff" />
        </Pressable>
        {/* <Pressable style={styles.profileViewsPill}>
          <Text style={styles.profileViewsText}>3 profile views</Text>
        </Pressable> */}
        <View style={styles.navRight}>
          <Pressable style={styles.navIcon}>
            <Ionicons name="arrow-redo-outline" size={24} color="#fff" />
          </Pressable>
          <Pressable
            style={styles.navIcon}
            // onPress={handleLogout}
          >
            <Ionicons name="menu" size={26} color="#fff" />
          </Pressable>
        </View>
      </View>

      {/* Avatar */}
      <View style={styles.avatarWrapper}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarLetter}>{(user?.username?.[0] ?? "U").toUpperCase()}</Text>
        </View>
        <Pressable style={styles.addAvatarBtn}>
          <Ionicons name="add" size={16} color="#fff" />
        </Pressable>
      </View>

      {/* Username + Edit */}
      <View style={styles.usernameRow}>
        <Text style={styles.username}>{user?.username ?? "Username"}</Text>
        <MaterialIcons name="keyboard-arrow-down" size={20} color="#fff" />
        <Pressable style={styles.editButton}>
          <Text style={styles.editText}>Edit</Text>
        </Pressable>
      </View>

      {/* Handle */}
      <Text style={styles.handle}>@{user?.username?.toLowerCase() ?? "username"}</Text>

      {/* Stats */}
      <View style={styles.statsRow}>
        <Pressable style={styles.statItem}>
          <Text style={styles.statNumber}>0</Text>
          <Text style={styles.statLabel}>Following</Text>
        </Pressable>
        <View style={styles.statDivider} />
        <Pressable style={styles.statItem}>
          <Text style={styles.statNumber}>0</Text>
          <Text style={styles.statLabel}>Followers</Text>
        </Pressable>
        <View style={styles.statDivider} />
        <Pressable style={styles.statItem}>
          <Text style={styles.statNumber}>0</Text>
          <Text style={styles.statLabel}>Likes</Text>
        </Pressable>
      </View>

      {/* Bio */}
      {/* <Text style={styles.bio}>Dil ma basa ka Dil Tor diya</Text> */}

      {/* Content Tabs */}
      <View style={styles.tabsRow}>
        {TABS.map((tab) => (
          <Pressable key={tab.key} style={styles.tabItem} onPress={() => setActiveTab(tab.key)}>
            {tab.icon(activeTab === tab.key)}
            {activeTab === tab.key && <View style={styles.tabUnderline} />}
          </Pressable>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
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
    </SafeAreaView>
  );
};

export default Profile;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#000",
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
  profileViewsPill: {
    backgroundColor: "#1a1a1a",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  profileViewsText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
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
    borderColor: "#000",
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
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },
  editButton: {
    marginLeft: 8,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#444",
  },
  editText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  handle: {
    color: "#aaa",
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
    backgroundColor: "#333",
  },
  statNumber: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  statLabel: {
    color: "#aaa",
    fontSize: 12,
    marginTop: 2,
  },

  // Bio
  bio: {
    color: "#fff",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 16,
    paddingHorizontal: 24,
  },

  // Tabs
  tabsRow: {
    flexDirection: "row",
    borderTopWidth: 0.5,
    borderTopColor: "#222",
    borderBottomWidth: 0.5,
    borderBottomColor: "#222",
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
    backgroundColor: "#fff",
    borderRadius: 1,
  },

  // Grid
  postItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE * 1.4,
    backgroundColor: "#1a1a1a",
    marginBottom: GRID_GAP,
  },
  postImage: {
    width: "100%",
    height: "100%",
  },
  draftBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  draftText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
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
});
