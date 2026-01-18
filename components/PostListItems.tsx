// import { useEvent } from "expo";
import { Post } from "@/types/types";
import { AntDesign, Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { useCallback, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import CommentsModal from "./CommentsModal";

type PostListItemsProps = {
  postItem: Post;
  isActive: boolean;
  videoHeight: number;
};

export default function PostListItems({ postItem, isActive, videoHeight }: PostListItemsProps) {
  const { nrOfComments, description, user, video_url } = postItem;
  const [showComments, setShowComments] = useState<boolean>(false);

  const player = useVideoPlayer(video_url, (player) => {
    player.loop = true;
    // player.play();
  });

  useFocusEffect(
    useCallback(() => {
      if (!player) return;

      try {
        if (isActive) {
          player.play();
        }
      } catch (error) {
        console.log("🚀 ~ PostListItems ~ error:", error);
      }

      return () => {
        try {
          if (player && isActive) {
            player.pause();
          }
        } catch (error) {
          console.log("🚀 ~ PostListItems ~ error:", error);
        }
      };
    }, [isActive, player]),
  );

  return (
    <View style={[styles.container, { height: videoHeight }]}>
      <VideoView style={styles.video} player={player} contentFit="cover" nativeControls={false} />

      <View style={styles.interactionBar}>
        <TouchableOpacity style={styles.interactionButton} onPress={() => console.log("Pressed")}>
          <AntDesign name="heart" size={24} color="white" />
          <Text style={styles.interactionText}>{0}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.interactionButton} onPress={() => setShowComments(true)}>
          <Ionicons name="chatbubble" size={24} color="white" />
          <Text style={styles.interactionText}>{nrOfComments[0].count || 0}</Text>
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

      <CommentsModal visible={showComments} onClose={() => setShowComments(false)} postId={postItem.id} commentCount={nrOfComments[0].count || 0} />
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
