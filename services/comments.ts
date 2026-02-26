import { supabase } from "@/lib/supabase";
import { createNotification } from "./notifications";

export const fetchCommentsService = async (postId: string, currentUserId: string | null) => {
  // Fetch ALL comments (top-level + replies) ordered oldest-first so replies sort correctly
  const { data: allComments, error: commentErr } = await supabase
    .from("comments")
    .select("*, user:profiles(username)")
    .eq("post_id", postId)
    .order("created_at", { ascending: true })
    .throwOnError();
  if (commentErr) throw commentErr;
  if (!allComments || allComments.length === 0) return [];

  // fetch likes for all comments
  const commentIds = allComments.map((c: any) => c.id);
  const counts: Record<string, number> = {};
  const likedSet = new Set<string>();

  if (currentUserId) {
    const { data: likes, error: likesErr } = await supabase.from("comment_likes").select("comment_id, user_id").in("comment_id", commentIds).throwOnError();
    if (likesErr) throw likesErr;
    likes.forEach((l: any) => {
      counts[l.comment_id] = (counts[l.comment_id] || 0) + 1;
      if (l.user_id === currentUserId) likedSet.add(l.comment_id);
    });
  }

  // Attach likes data and initialise replies array
  const byId: Record<string, any> = {};
  allComments.forEach((c: any) => {
    byId[c.id] = {
      ...c,
      likes_count: counts[c.id] || 0,
      liked_by_current_user: likedSet.has(c.id),
      replies: [],
    };
  });

  // Group replies under their parent; collect top-level (oldest-first → reverse for newest-first)
  const topLevel: any[] = [];
  allComments.forEach((c: any) => {
    if (!c.parent_id) {
      topLevel.push(byId[c.id]);
    } else if (byId[c.parent_id]) {
      byId[c.parent_id].replies.push(byId[c.id]);
    }
  });

  // Show newest top-level comments first
  return topLevel.reverse();
};

export const createComment = async (postId: string, comment: string, userId: string, parentId?: number | null) => {
  const insertData: Record<string, any> = { post_id: postId, comment, user_id: userId };
  if (parentId) insertData.parent_id = parentId;

  const { data: comment_data, error: commentErr } = await supabase.from("comments").insert(insertData).throwOnError();
  if (commentErr) throw commentErr;

  // Update comment count and send notification only for top-level comments
  if (!parentId) {
    const { data: post_data } = await supabase.from("posts").select("comments_count, user_id").eq("id", postId).single();
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
  } else {
    // Notify the parent comment's author about the reply
    const { data: parentComment } = await supabase.from("comments").select("user_id").eq("id", parentId).single();
    if (parentComment?.user_id) {
      await createNotification({
        userId: parentComment.user_id,
        actorId: userId,
        type: "reply",
        postId,
        comment,
      });
    }
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
