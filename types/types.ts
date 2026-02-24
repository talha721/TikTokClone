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

export type Conversation = {
  id: string;
  user1_id: string;
  user2_id: string;
  last_message?: string;
  last_message_at: string;
  created_at: string;
  otherUser?: User;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_at?: string;
};
