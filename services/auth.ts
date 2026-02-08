import { supabase } from "@/lib/supabase";

export const getAllUserPosts = async (userId: string) => {
  const { data, error } = await supabase
    .from("posts")
    .select(
      `*, 
      user: users (
        id, username, avatar_url
        ),
        nrOfLikes: post_likes ( count ),
        nrOfComments: comments ( count )
        `,
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .throwOnError();
  if (error) {
    throw error;
  }
  return data;
};
