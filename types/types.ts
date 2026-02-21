export type User = {
  id: string;
  email: string;
  username: string;
};

export type Post = {
  id: string;
  video_url: string;
  description: string;
  user: User;
  // nrOfLikes: { count: number }[];
  // nrOfComments: { count: number }[];
  // nrOfShares: { count: number }[];
  // user_liked: { id: string }[]; // Array to check if current user liked the post
  isLikedByMe: boolean;
  likesCount: number;
  commentsCount: number;
  thumbnail: string;
};

export type PostInput = {
  video_url: string;
  description: string;
  user_id: string;
  thumbnail_url?: string;
};

export type Comment = {
  id: string;
  post_id: string;
  user_id: string;
  comment: string;
  created_at: string;
  user?: User;
  likes_count?: number;
  liked_by_current_user?: boolean;
};

export type NewCommentInput = {
  post_id: string;
  user_id: string;
  comment: string;
};
