import { supabase } from "@/lib/supabase";
import { likePostService } from "@/services/posts";
import { useAuthStore } from "@/stores/useAuthStore";
import { Post } from "@/types/types";
import { AntDesign, Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { useCallback, useEffect, useRef, useState } from "react";
import { Share, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import CommentsModal from "./CommentsModal";

type PostListItemsProps = {
  postItem: Post;
  isActive: boolean;
  videoHeight: number;
  refetch: () => void;
};

export default function PostListItems({ postItem, isActive, videoHeight, refetch }: PostListItemsProps) {
  const { description, user, video_url, isLikedByMe, likesCount, commentsCount } = postItem;

  const currentUser = useAuthStore((state) => state.user);

  const [showComments, setShowComments] = useState<boolean>(false);
  const [liked, setLiked] = useState<boolean>(isLikedByMe);
  const [likeCount, setLikeCount] = useState<number>(likesCount);
  const [commentCount, setCommentCount] = useState<number>(commentsCount);

  // Sync when parent re-fetches and passes fresh props
  useEffect(() => {
    setLiked(isLikedByMe);
    setLikeCount(likesCount);
    setCommentCount(commentsCount);
  }, [isLikedByMe, likesCount, commentsCount]);

  // Ref to the live broadcast channel so handlers can send on it without
  // needing to be inside the useEffect.
  const broadcastRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Real-time: Broadcast is the PRIMARY cross-device mechanism — no Supabase
  // publication config required. postgres_changes is kept as a bonus fallback
  // (works automatically once those tables are added to the publication).
  useEffect(() => {
    if (!postItem.id) return;

    const channel = supabase
      .channel(`post-live:${postItem.id}`)
      // ── Broadcast (works on every device immediately) ──────────────────
      // Only sync counts — liked/heart state is per-account and stays local.
      .on("broadcast", { event: "counts" }, ({ payload }) => {
        if (typeof payload.likes_count === "number") setLikeCount(payload.likes_count);
        if (typeof payload.comments_count === "number") setCommentCount(payload.comments_count);
      })
      // ── postgres_changes fallback (requires tables in Supabase publication) ──
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "posts", filter: `id=eq.${postItem.id}` }, (payload) => {
        const u = payload.new as any;
        if (typeof u.likes_count === "number") setLikeCount(u.likes_count);
        if (typeof u.comments_count === "number") setCommentCount(u.comments_count);
      })
      .subscribe();

    broadcastRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      broadcastRef.current = null;
    };
  }, [postItem.id, currentUser?.id]);

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
    if (!currentUser) return;
    const wasLiked = liked;
    const prevCount = likeCount;
    const newCount = wasLiked ? prevCount - 1 : prevCount + 1;
    // Optimistic update on this device
    setLiked(!wasLiked);
    setLikeCount(newCount);
    try {
      await likePostService(postId, currentUser.id);
      // Broadcast authoritative value to every other device on this channel
      broadcastRef.current?.send({
        type: "broadcast",
        event: "counts",
        payload: { likes_count: newCount, liked: !wasLiked, actor_id: currentUser.id },
      });
      refetch();
    } catch (error) {
      // Revert on error
      setLiked(wasLiked);
      setLikeCount(prevCount);
      console.log("🚀 ~ handlePostLike ~ error:", error);
    }
  };

  // Called by CommentsModal when a comment is added or deleted.
  // Uses the current commentCount directly from the closure — never put
  // side-effects (broadcasts) inside a setState updater.
  const handleCommentCountChange = (delta: 1 | -1) => {
    const newCount = Math.max(0, commentCount + delta);
    setCommentCount(newCount);
    broadcastRef.current?.send({
      type: "broadcast",
      event: "counts",
      payload: { comments_count: newCount },
    });
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out this video by @${user.username}! ${video_url}`,
        url: video_url,
      });
    } catch (error) {
      console.log("🚀 ~ handleShare ~ error:", error);
    }
  };

  const handleOpenProfile = () => {
    router.push({
      pathname: "/(protected)/userProfile",
      params: { userId: user.id, username: user.username, avatar: user.avatar_url ?? "" },
    });
  };

  return (
    <View style={[styles.container, { height: videoHeight }]}>
      <VideoView style={styles.video} player={player} contentFit="cover" nativeControls={false} />

      <View style={styles.interactionBar}>
        <TouchableOpacity style={styles.interactionButton} onPress={() => handlePostLike(postItem.id)}>
          <AntDesign name="heart" size={24} color={liked ? "red" : "white"} />
          <Text style={styles.interactionText}>{likeCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.interactionButton} onPress={() => setShowComments(true)}>
          <Ionicons name="chatbubble" size={24} color="white" />
          <Text style={styles.interactionText}>{commentCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.interactionButton} onPress={handleShare}>
          <Ionicons name="arrow-redo" size={24} color="white" />
          <Text style={styles.interactionText}>Share</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.avatar} onPress={handleOpenProfile}>
          <Text style={styles.avatarText}>{user.username.charAt(0).toUpperCase()}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.videoInfo}>
        <TouchableOpacity onPress={handleOpenProfile}>
          <Text style={styles.username}>@{user.username}</Text>
        </TouchableOpacity>
        <Text style={styles.description}>{description}</Text>
      </View>

      <CommentsModal
        visible={showComments}
        onClose={() => setShowComments(false)}
        postId={postItem.id}
        commentCount={commentCount}
        refetch={refetch}
        onCountChange={handleCommentCountChange}
      />
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
