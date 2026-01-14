import React, { FC, useState } from "react";
import { Alert, Dimensions, FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemedText } from "../../../components/themed-text";
import { ThemedView } from "../../../components/themed-view";
import { useAuthStore } from "../../../stores/useAuthStore";

const windowWidth = Dimensions.get("window").width;

const samplePosts = [
  {
    id: "1",
    thumbnail: "https://picsum.photos/id/1015/400/400",
    videoUri: "https://d23dyxeqlo5psv.cloudfront.net/big_buck_bunny.mp4",
  },
  {
    id: "2",
    thumbnail: "https://picsum.photos/id/1025/400/400",
    videoUri: "https://www.w3schools.com/html/mov_bbb.mp4",
  },
  {
    id: "3",
    thumbnail: "https://picsum.photos/id/1027/400/400",
    videoUri: "https://samplelib.com/lib/preview/mp4/sample-5s.mp4",
  },
  {
    id: "4",
    thumbnail: "https://picsum.photos/id/1035/400/400",
    videoUri: "https://samplelib.com/lib/preview/mp4/sample-10s.mp4",
  },
  {
    id: "5",
    thumbnail: "https://picsum.photos/id/1050/400/400",
    videoUri: "https://download.samplelib.com/mp4/sample-20s.mp4",
  },
  {
    id: "6",
    thumbnail: "https://picsum.photos/id/1069/400/400",
    videoUri: "https://download.samplelib.com/mp4/sample-15s.mp4",
  },
];

const Profile: FC = () => {
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);

  const [following, setFollowing] = useState<boolean>(false);
  // const [modalVisible, setModalVisible] = useState(false);
  // const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  // const videoRef = useRef<any>(null);

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

  const renderPost = ({ item }: { item: { id: string; thumbnail?: string; videoUri?: string } }) => (
    <Pressable
      onPress={() => {
        // if (item.videoUri) {
        //   setSelectedVideo(item.videoUri);
        //   setModalVisible(true);
        // }
      }}
    >
      <Image source={{ uri: item.thumbnail || item.videoUri }} style={styles.postImage} />
    </Pressable>
  );

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ThemedView style={styles.container}>
        <View style={styles.topRow}>
          <ThemedText style={styles.title} type="title">
            Profile
          </ThemedText>
          <Pressable onPress={handleLogout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Logout</Text>
          </Pressable>
        </View>

        <View style={styles.header}>
          <View style={styles.avatarPlaceholder}>
            <ThemedText style={styles.avatarLetter} type="title">
              {(user?.username?.[0] ?? "U").toUpperCase()}
            </ThemedText>
          </View>
          <View style={styles.headerInfo}>
            <View style={styles.rowBetween}>
              <ThemedText style={styles.username} type="defaultSemiBold">
                {user?.username ?? "Cat Lover"}
              </ThemedText>
              <Pressable
                onPress={() => setFollowing((s) => !s)}
                style={({ pressed }) => [styles.followButton, following ? styles.following : null, pressed ? { opacity: 0.8 } : null]}
              >
                <Text style={[styles.followText, following ? { color: "#111" } : null]}>{following ? "Following" : "Follow"}</Text>
              </Pressable>
            </View>

            <Text style={styles.bio} numberOfLines={2}>
              {user?.username ? `Hey, I'm ${user.username}. Sharing fun short videos.` : "Passionate about cats and short videos."}
            </Text>

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <ThemedText style={styles.statNumber}>128</ThemedText>
                <Text style={styles.statLabel}>Posts</Text>
              </View>
              <View style={styles.statItem}>
                <ThemedText style={styles.statNumber}>12.3K</ThemedText>
                <Text style={styles.statLabel}>Followers</Text>
              </View>
              <View style={styles.statItem}>
                <ThemedText style={styles.statNumber}>480</ThemedText>
                <Text style={styles.statLabel}>Following</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        <FlatList
          data={samplePosts}
          keyExtractor={(i) => i.id}
          renderItem={renderPost}
          numColumns={3}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.postsList}
        />
        {/* <Modal
          visible={modalVisible}
          animationType="slide"
          onRequestClose={() => {
            setModalVisible(false);
            setSelectedVideo(null);
          }}
        >
          <View style={styles.modalContainer}>
            <Pressable
              style={styles.closeButton}
              onPress={() => {
                setModalVisible(false);
                setSelectedVideo(null);
              }}
            >
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
            {selectedVideo ? (
              VideoComp ? (
                <VideoComp ref={videoRef} source={{ uri: selectedVideo }} style={styles.modalVideo} useNativeControls resizeMode="contain" shouldPlay />
              ) : (
                <Text style={styles.fallbackText}>Video component not available. Install expo-video (recommended) or expo-av.</Text>
              )
            ) : null}
          </View>
        </Modal> */}
      </ThemedView>
    </SafeAreaView>
  );
};

export default Profile;

const avatarSize = 96;
const gap = 6;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
  },
  logoutButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#eee",
  },
  logoutText: {
    color: "#111",
    fontWeight: "600",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  avatar: {
    width: avatarSize,
    height: avatarSize,
    borderRadius: avatarSize / 2,
    marginRight: 12,
    backgroundColor: "#ddd",
  },
  avatarPlaceholder: {
    width: avatarSize,
    height: avatarSize,
    borderRadius: avatarSize / 2,
    marginRight: 12,
    backgroundColor: "#888",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 36,
  },
  headerInfo: {
    flex: 1,
  },
  username: {
    fontSize: 18,
    marginRight: 12,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  followButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: "#ff2d55",
  },
  following: {
    backgroundColor: "#e5e5ea",
  },
  followText: {
    color: "white",
    fontWeight: "600",
  },
  bio: {
    marginTop: 8,
    color: "#666",
  },
  statsRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  statItem: {
    marginRight: 20,
  },
  statNumber: {
    fontWeight: "700",
  },
  statLabel: {
    color: "#666",
    fontSize: 12,
  },
  divider: {
    height: 1,
    backgroundColor: "#eee",
    marginVertical: 12,
  },
  postsList: {
    paddingBottom: 80,
  },
  postImage: {
    width: (windowWidth - 16 * 2 - gap * 2) / 3,
    height: (windowWidth - 16 * 2 - gap * 2) / 3,
    marginBottom: gap,
    marginRight: gap,
    backgroundColor: "#ccc",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  modalVideo: {
    width: "100%",
    height: "70%",
    backgroundColor: "#000",
  },
  closeButton: {
    position: "absolute",
    top: 40,
    right: 20,
    zIndex: 10,
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  closeText: {
    color: "#fff",
    fontWeight: "600",
  },
  fallbackText: {
    color: "#fff",
    paddingHorizontal: 20,
    textAlign: "center",
  },
});
