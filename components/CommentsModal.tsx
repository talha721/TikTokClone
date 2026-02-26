import { supabase } from "@/lib/supabase";
import { createComment, deleteComment, fetchCommentsService, likeComment } from "@/services/comments";
import { useAuthStore } from "@/stores/useAuthStore";
import { Comment } from "@/types/types";
import { FontAwesome, Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type CommentsModalProps = {
  visible: boolean;
  onClose: () => void;
  postId: string;
  commentCount: number;
  refetch: () => void;
  onCountChange?: (delta: 1 | -1) => void;
};

const CommentsModal = ({ visible, onClose, postId, commentCount, refetch, onCountChange }: CommentsModalProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  // const [loading, setLoading] = useState(false);
  const slideAnim = useRef(new Animated.Value(Dimensions.get("window").height)).current;
  const broadcastRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const user = useAuthStore((state) => state.user);
  const currentUserId = user?.id || "";

  useEffect(() => {
    if (visible) {
      // Animate modal up
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();

      // Fetch comments from API
      fetchComments();
    } else {
      // Animate modal down
      Animated.timing(slideAnim, {
        toValue: Dimensions.get("window").height,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const fetchComments = async () => {
    // setLoading(true);
    try {
      const data = await fetchCommentsService(postId, currentUserId);
      setComments(data);
    } catch (error) {
      console.error("Error fetching comments:", error);
    } finally {
      // setLoading(false);
    }
  };

  // Real-time subscription: auto-add/remove comments as they come in.
  // postgres_changes handles it when the table is in the Supabase publication.
  // The 'comment-list-updated' broadcast handles it on every other device regardless.
  useEffect(() => {
    if (!visible || !postId) return;

    const channel = supabase
      .channel(`comments-modal:${postId}`)
      .on("broadcast", { event: "comment-list-updated" }, () => {
        fetchComments();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "comments", filter: `post_id=eq.${postId}` }, async (payload) => {
        const { data } = await supabase
          .from("comments")
          .select("*, user:profiles(username)")
          .eq("id", (payload.new as any).id)
          .single();
        if (data) {
          setComments((prev) => {
            if (prev.some((c) => c.id === data.id)) return prev;
            return [data as Comment, ...prev];
          });
        }
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "comments", filter: `post_id=eq.${postId}` }, (payload) => {
        setComments((prev) => prev.filter((c) => c.id !== (payload.old as any).id));
      })
      .subscribe();

    // Store ref so add/delete handlers can broadcast on this channel
    broadcastRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      broadcastRef.current = null;
    };
  }, [visible, postId]);

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      await createComment(postId, newComment, currentUserId);
      fetchComments();
      refetch();
      setNewComment("");
      onCountChange?.(1);
      // Tell other devices' open comment modals to refresh their list
      broadcastRef.current?.send({ type: "broadcast", event: "comment-list-updated", payload: {} });
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  };
  // console.log("🚀 ~ CommentsModal ~ comments:", comments);

  const handleCommentLike = async (commentId: string) => {
    if (!currentUserId) return;

    try {
      await likeComment(commentId, currentUserId);
    } catch (error) {
      console.log("🚀 ~ handleCommentLike ~ error:", error);
    } finally {
      fetchComments();
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await deleteComment(commentId);
      fetchComments();
      onCountChange?.(-1);
      broadcastRef.current?.send({ type: "broadcast", event: "comment-list-updated", payload: {} });
    } catch (error) {
      console.log("🚀 ~ handleDeleteComment ~ error:", error);
    }
  };

  const renderComment = ({ item }: { item: Comment }) => (
    <View style={styles.commentItem}>
      <View style={styles.commentAvatar}>
        <Text style={styles.commentAvatarText}>U</Text>
      </View>
      <View style={styles.commentContent}>
        <Text style={styles.commentUsername}>{item.user?.username}</Text>
        <Text style={styles.commentText}>{item.comment}</Text>
        <View style={styles.commentFooter}>
          <Text style={styles.commentTime}>{new Date(item.created_at).toLocaleDateString()}</Text>
          <TouchableOpacity style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={styles.replyText}>Reply</Text>
            {item.user_id === currentUserId && (
              <Text style={styles.deleteText} onPress={() => handleDeleteComment(item.id)}>
                Delete
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
      <TouchableOpacity style={styles.likeButton} onPress={() => handleCommentLike(item.id)}>
        <FontAwesome
          name={item.liked_by_current_user && item.likes_count! > 0 ? "heart" : "heart-o"}
          size={20}
          color={item.liked_by_current_user && item.likes_count! > 0 ? "red" : "black"}
        />
        <Text style={{ marginTop: 4, fontSize: 12, textAlign: "center" }}>{item.likes_count || 0}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <Animated.View
          style={[
            styles.modalContainer,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardView} keyboardVerticalOffset={0}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.dragHandle} />
              <Text style={styles.headerTitle}>
                {commentCount} {commentCount === 1 ? "Comment" : "Comments"}
              </Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            {/* Comments List */}
            <View style={styles.commentsContainer}>
              {comments.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="chatbubble-outline" size={48} color="#ccc" />
                  <Text style={styles.emptyText}>No comments yet</Text>
                  <Text style={styles.emptySubtext}>Be the first to comment!</Text>
                </View>
              ) : (
                <FlatList
                  data={comments}
                  renderItem={renderComment}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={styles.listContent}
                  showsVerticalScrollIndicator={false}
                />
              )}

              {/* COMMENTS WITH LOADING INDICATOR */}
              {/* {loading ? (
                <ActivityIndicator size="large" color="#000" style={styles.loader} />
              ) : comments.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="chatbubble-outline" size={48} color="#ccc" />
                  <Text style={styles.emptyText}>No comments yet</Text>
                  <Text style={styles.emptySubtext}>Be the first to comment!</Text>
                </View>
              ) : (
                <FlatList
                  data={comments}
                  renderItem={renderComment}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={styles.listContent}
                  showsVerticalScrollIndicator={false}
                />
              )} */}
            </View>

            {/* Input Section */}
            <View style={styles.inputContainer}>
              <View style={styles.inputAvatar}>
                <Text style={styles.inputAvatarText}>M</Text>
              </View>
              <TextInput
                style={styles.input}
                placeholder="Add comment..."
                placeholderTextColor="#999"
                value={newComment}
                onChangeText={setNewComment}
                multiline
                maxLength={150}
              />
              <TouchableOpacity
                style={[styles.sendButton, !newComment.trim() && styles.sendButtonDisabled]}
                onPress={handleAddComment}
                disabled={!newComment.trim()}
              >
                <Ionicons name="send" size={20} color={newComment.trim() ? "#FF0050" : "#ccc"} />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContainer: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: Dimensions.get("window").height * 0.75,
    minHeight: Dimensions.get("window").height * 0.5,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  dragHandle: {
    position: "absolute",
    top: 8,
    width: 40,
    height: 4,
    backgroundColor: "#ddd",
    borderRadius: 2,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },
  closeButton: {
    position: "absolute",
    right: 16,
    padding: 4,
  },
  commentsContainer: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 8,
  },
  loader: {
    marginTop: 40,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    marginTop: 4,
  },
  commentItem: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FF0050",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  commentAvatarText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  commentContent: {
    flex: 1,
  },
  commentUsername: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
    marginBottom: 4,
  },
  commentText: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
  },
  commentFooter: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 16,
  },
  commentTime: {
    fontSize: 12,
    color: "#999",
  },
  replyText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "600",
  },
  deleteText: {
    fontSize: 12,
    color: "red",
    fontWeight: "600",
    marginLeft: 12,
  },
  likeButton: {
    padding: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    backgroundColor: "white",
  },
  inputAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FF0050",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  inputAvatarText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  input: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    maxHeight: 100,
  },
  sendButton: {
    marginLeft: 8,
    padding: 8,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});

export default CommentsModal;
