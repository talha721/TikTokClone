// import { useEvent } from "expo";
import { likePostService } from "@/services/posts";
import { Post } from "@/types/types";
import { AntDesign, Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { useCallback, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import CommentsModal from "./CommentsModal";
// import { useAuthStore } from "@/stores/useAuthStore";

type PostListItemsProps = {
  postItem: Post;
  isActive: boolean;
  videoHeight: number;
  refetch: () => void;
};

export default function PostListItems({ postItem, isActive, videoHeight, refetch }: PostListItemsProps) {
  // console.log("🚀 ~ PostListItems ~ postItem:", postItem);
  const { description, user, video_url, isLikedByMe, likesCount, commentsCount } = postItem;

  // const currentUser = useAuthStore((state) => state.user);

  const [showComments, setShowComments] = useState<boolean>(false);

  const player = useVideoPlayer(video_url, (player) => {
    player.loop = true;
    // player.play();
  });

  // Ensure the returned player is a usable object before calling play/pause
  const isValidPlayer = (p: any): p is { play: () => void; pause: () => void } =>
    p && typeof p === "object" && typeof p.play === "function" && typeof p.pause === "function";

  useFocusEffect(
    useCallback(() => {
      const curr = player;
      if (!curr || !isValidPlayer(curr)) return;

      try {
        if (isActive) {
          curr.play();
        }
      } catch (error) {
        console.log("🚀 ~ PostListItems ~ error:", error);
      }

      return () => {
        try {
          if (isValidPlayer(curr) && isActive) {
            curr.pause();
          }
        } catch (error) {
          console.log("🚀 ~ PostListItems ~ error:", error);
        }
      };
    }, [isActive, player]),
  );

  const handlePostLike = async (postId: string) => {
    // console.log("🚀 ~ handlePostLike ~ postId:", postId);
    try {
      await likePostService(postId, user.id);
      refetch();
    } catch (error) {
      console.log("🚀 ~ handlePostLike ~ error:", error);
    }
  };

  return (
    <View style={[styles.container, { height: videoHeight }]}>
      <VideoView style={styles.video} player={player} contentFit="cover" nativeControls={false} />

      <View style={styles.interactionBar}>
        <TouchableOpacity style={styles.interactionButton} onPress={() => handlePostLike(postItem.id)}>
          <AntDesign name="heart" size={24} color={isLikedByMe ? "red" : "white"} />
          <Text style={styles.interactionText}>{likesCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.interactionButton} onPress={() => setShowComments(true)}>
          <Ionicons name="chatbubble" size={24} color="white" />
          <Text style={styles.interactionText}>{commentsCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.interactionButton} onPress={() => console.log("Share Pressed")}>
          <Ionicons name="arrow-redo" size={24} color="white" />
          <Text style={styles.interactionText}>{0}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.avatar} onPress={() => console.log("Profile Pressed")}>
          <Text style={styles.avatarText}>{user.username.charAt(0).toUpperCase()}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.videoInfo}>
        <Text style={styles.username}>{user.username}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>

      <CommentsModal visible={showComments} onClose={() => setShowComments(false)} postId={postItem.id} commentCount={commentsCount} refetch={refetch} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "black",
    overflow: "hidden",
  },
  video: {
    flex: 1,
    width: "100%",
  },
  interactionBar: {
    position: "absolute",
    right: 20,
    bottom: 100,
    alignItems: "center",
    gap: 25,
  },
  interactionButton: {
    alignItems: "center",
    gap: 5,
  },
  interactionText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "white",
    textAlign: "center",
    lineHeight: 40,
    color: "black",
    fontWeight: "600",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "black",
    fontSize: 25,
    fontWeight: "600",
  },
  videoInfo: {
    position: "absolute",
    left: 20,
    bottom: 100,
    right: 100,
    gap: 5,
  },
  username: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
  description: {
    color: "white",
    fontSize: 14,
  },
});
