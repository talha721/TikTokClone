import { supabase } from "@/lib/supabase";

export const fetchCommentsService = async (postId: string) => {
  const { data, error } = await supabase
    .from("comments")
    .select("*, user:profiles(username)")
    .eq("post_id", postId)
    .order("created_at", { ascending: false })
    .throwOnError();
  if (error) {
    throw error;
  }
  return data;
};

export const createComment = async (postId: string, comment: string, userId: string) => {
  const { data, error } = await supabase.from("comments").insert({ post_id: postId, comment, user_id: userId }).throwOnError();

  if (error) {
    throw error;
  }
  return data;
};
