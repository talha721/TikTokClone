import { useTheme } from "@/hooks/use-theme";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Dimensions, FlatList, Image, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");
const GRID_GAP = 1;
const ITEM_SIZE = (width - GRID_GAP * 2) / 3;

type ProfileData = {
  id: string;
  username: string;
  avatar_url?: string;
  bio?: string;
};

type PostItem = {
  id: string;
  thumbnail: string;
  description: string;
};

export default function UserProfileScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();

  const params = useLocalSearchParams<{ userId: string; username: string; avatar?: string }>();

  const userId = Array.isArray(params.userId) ? params.userId[0] : params.userId;
  const paramUsername = Array.isArray(params.username) ? params.username[0] : params.username;
  const paramAvatar = Array.isArray(params.avatar) ? params.avatar[0] : params.avatar;

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const load = async () => {
      try {
        // Fetch profile
        const { data: profileData } = await supabase.from("profiles").select("id, username, avatar_url, bio").eq("id", userId).maybeSingle();

        setProfile(
          profileData ?? {
            id: userId,
            username: paramUsername ?? "Unknown",
            avatar_url: paramAvatar ?? undefined,
          },
        );

        // Fetch posts
        const { data: postsData } = await supabase
          .from("posts")
          .select("id, thumbnail_url, description")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(60);

        if (postsData) {
          setPosts(
            postsData.map((p: any) => ({
              id: p.id,
              thumbnail: p.thumbnail_url ?? "",
              description: p.description ?? "",
            })),
          );
        }
      } catch (err) {
        console.error("Failed to load user profile", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [userId, paramAvatar, paramUsername]);

  const displayProfile = profile ?? { id: userId, username: paramUsername ?? "Unknown", avatar_url: paramAvatar };

  return (
    <>
      <Stack.Screen options={{ headerShown: false, animation: "slide_from_right" }} />
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top"]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.icon + "22" }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {displayProfile.username}
          </Text>
          <View style={{ width: 32 }} />
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color="#fe2c55" />
          </View>
        ) : (
          <FlatList
            data={posts}
            numColumns={3}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            columnWrapperStyle={styles.columnWrapper}
            ListHeaderComponent={
              <View style={styles.profileSection}>
                {/* Avatar */}
                {displayProfile.avatar_url ? (
                  <Image source={{ uri: displayProfile.avatar_url }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatarPlaceholder, { backgroundColor: colors.icon + "33" }]}>
                    <Ionicons name="person" size={40} color={colors.icon} />
                  </View>
                )}

                <Text style={[styles.username, { color: colors.text }]}>@{displayProfile.username}</Text>

                {(displayProfile as any).bio ? <Text style={[styles.bio, { color: colors.icon }]}>{(displayProfile as any).bio}</Text> : null}

                {/* Stats row */}
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: colors.text }]}>{posts.length}</Text>
                    <Text style={[styles.statLabel, { color: colors.icon }]}>Videos</Text>
                  </View>
                </View>

                {posts.length > 0 && <View style={[styles.divider, { backgroundColor: colors.icon + "22" }]} />}
              </View>
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="videocam-outline" size={48} color={colors.icon + "66"} />
                <Text style={[styles.emptyText, { color: colors.icon }]}>No videos yet</Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.gridItem}>
                {item.thumbnail ? (
                  <Image source={{ uri: item.thumbnail }} style={styles.gridThumb} resizeMode="cover" />
                ) : (
                  <View style={[styles.gridThumb, styles.gridPlaceholder, { backgroundColor: isDark ? "#1a1a1a" : "#e5e5e5" }]}>
                    <Ionicons name="play-circle-outline" size={28} color={colors.icon} />
                  </View>
                )}
              </View>
            )}
          />
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 16, fontWeight: "700", flex: 1, textAlign: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  profileSection: { alignItems: "center", paddingTop: 24, paddingBottom: 12 },
  avatar: { width: 90, height: 90, borderRadius: 45 },
  avatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: "center",
    justifyContent: "center",
  },
  username: { marginTop: 12, fontSize: 18, fontWeight: "700" },
  bio: { marginTop: 6, fontSize: 14, textAlign: "center", paddingHorizontal: 32 },
  statsRow: { flexDirection: "row", marginTop: 16, gap: 32 },
  statItem: { alignItems: "center" },
  statValue: { fontSize: 18, fontWeight: "700" },
  statLabel: { fontSize: 12, marginTop: 2 },
  divider: { width: "100%", height: StyleSheet.hairlineWidth, marginTop: 16 },
  columnWrapper: { gap: GRID_GAP },
  gridItem: { width: ITEM_SIZE, height: ITEM_SIZE, marginBottom: GRID_GAP },
  gridThumb: { width: "100%", height: "100%" },
  gridPlaceholder: { alignItems: "center", justifyContent: "center" },
  emptyContainer: { alignItems: "center", justifyContent: "center", paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 14 },
});
