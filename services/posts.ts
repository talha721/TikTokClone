import { supabase } from "@/lib/supabase";
import { PostInput } from "@/types/types";
import { createNotification } from "./notifications";

type StorageInput = {
  fileName: string;
  fileExtension: string;
  fileBuffer: Uint8Array;
};

type Paginationinput = {
  cursor?: string;
  limit?: number;
};

export const fetchPosts = async (pageParams: Paginationinput, currentUserId: string, profileUserId?: string) => {
  let query = supabase
    .from("posts")
    .select("*, user:profiles(*), nrOfComments:comments(count), nrOfLikes:post_likes(count), user_liked:post_likes(user_id)")
    .eq("post_likes.user_id", currentUserId)
    .order("id", { ascending: false });

  if (profileUserId) {
    query = query.eq("user_id", profileUserId);
  }

  if (pageParams.limit) {
    query = query.limit(pageParams.limit);
  }

  if (pageParams.cursor) {
    query = query.lt("id", pageParams.cursor);
  }

  const { data } = await query.throwOnError();

  return data?.map((post: any) => ({
    ...post,
    // Convert the array to a simple boolean
    isLikedByMe: post.user_liked && post.user_liked.length > 0,
    // Extract the counts from the array objects Supabase returns
    likesCount: post.nrOfLikes?.[0]?.count || 0,
    commentsCount: post.nrOfComments?.[0]?.count || 0,
  }));
};

export const uploadVideoToStorage = async (storageProps: StorageInput) => {
  const { fileName, fileExtension, fileBuffer } = storageProps;

  const { data, error } = await supabase.storage.from("videos").upload(fileName, fileBuffer, {
    contentType: `video/${fileExtension}`,
  });

  if (error) {
    throw error;
  }

  const { data: urlData } = supabase.storage.from("videos").getPublicUrl(fileName);
  return urlData.publicUrl;
};

export const uploadImageToStorage = async (storageProps: StorageInput) => {
  const { fileName, fileExtension, fileBuffer } = storageProps;

  const { data, error } = await supabase.storage.from("thumbnails").upload(fileName, fileBuffer, {
    contentType: `image/${fileExtension}`,
  });

  if (error) {
    throw error;
  }

  const { data: urlData } = supabase.storage.from("thumbnails").getPublicUrl(fileName);
  return urlData.publicUrl;
};

export const createPost = async (postData: PostInput) => {
  const { data, error } = await supabase.from("posts").insert(postData).throwOnError();

  if (error) {
    throw error;
  }

  return data;
};

export const likePostService = async (postId: string, userId: string) => {
  const { data: existing } = await supabase.from("post_likes").select("id").eq("post_id", postId).eq("user_id", userId).maybeSingle();
  const { data: postData } = await supabase.from("posts").select("likes_count, user_id").eq("id", postId).single();

  let currentCount = postData?.likes_count || 0;

  if (existing) {
    await supabase.from("post_likes").delete().eq("id", existing.id);

    if (currentCount !== 0) {
      await supabase
        .from("posts")
        .update({ likes_count: currentCount - 1 })
        .eq("id", postId);
    }

    return { action: "unliked" };
  } else {
    await supabase.from("post_likes").insert({ post_id: postId, user_id: userId });

    await supabase
      .from("posts")
      .update({ likes_count: currentCount + 1 })
      .eq("id", postId);

    // Notify the post owner (skip self-likes — handled inside createNotification)
    if (postData?.user_id) {
      await createNotification({
        userId: postData.user_id,
        actorId: userId,
        type: "like",
        postId,
      });
    }

    return { action: "liked" };
  }
};
