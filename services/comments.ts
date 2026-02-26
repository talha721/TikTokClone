import { supabase } from "@/lib/supabase";
import { createNotification } from "./notifications";

export const fetchCommentsService = async (postId: string, currentUserId: string | null) => {
  const { data: comments, error: commentErr } = await supabase
    .from("comments")
    .select("*, user:profiles(username)")
    .eq("post_id", postId)
    .order("created_at", { ascending: false })
    .throwOnError();
  if (commentErr) throw commentErr;
  if (!comments || comments.length === 0) return [];

  if (!currentUserId) return comments;

  // fetch likes only for these comments
  const commentIds = comments.map((c: any) => c.id);
  const { data: likes, error: likesErr } = await supabase.from("comment_likes").select("comment_id, user_id").in("comment_id", commentIds).throwOnError();

  if (likesErr) throw likesErr;

  const counts: Record<string, number> = {};
  const likedSet = new Set<string>();

  likes.forEach((l: any) => {
    counts[l.comment_id] = (counts[l.comment_id] || 0) + 1;
    if (l.user_id === currentUserId) likedSet.add(l.comment_id);
  });

  // attach likes_count and liked_by_current_user flags
  return comments.map((c: any) => ({
    ...c,
    likes_count: counts[c.id] || 0,
    liked_by_current_user: likedSet.has(c.id),
  }));
};

export const createComment = async (postId: string, comment: string, userId: string) => {
  const { data: comment_data, error: commentErr } = await supabase.from("comments").insert({ post_id: postId, comment, user_id: userId }).throwOnError();
  const { data: post_data } = await supabase.from("posts").select("comments_count, user_id").eq("id", postId).single();

  if (commentErr) throw commentErr;

  let currentCount = post_data?.comments_count || 0;
  await supabase
    .from("posts")
    .update({ comments_count: currentCount + 1 })
    .eq("id", postId);

  // Notify the post owner (skip self-comments — handled inside createNotification)
  if (post_data?.user_id) {
    await createNotification({
      userId: post_data.user_id,
      actorId: userId,
      type: "comment",
      postId,
      comment,
    });
  }

  return comment_data;
};

export const deleteComment = async (commentId: string) => {
  const { error } = await supabase.from("comments").delete().eq("id", commentId).throwOnError();
  if (error) {
    throw error;
  }
  return true;
};

// ** Like Comment Service ** //

export const likeComment = async (commentId: string, userId: string) => {
  const { data: existing } = await supabase.from("comment_likes").select("id").eq("comment_id", commentId).eq("user_id", userId).single();

  if (existing && existing.id) {
    await supabase.from("comment_likes").delete().eq("id", existing.id).throwOnError();
    return { action: "unliked" };
  } else {
    const { data, error } = await supabase.from("comment_likes").insert({ comment_id: commentId, user_id: userId }).throwOnError();
    if (error) throw error;
    return { action: "liked", data };
  }
};
