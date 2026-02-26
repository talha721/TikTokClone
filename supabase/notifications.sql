-- ═══════════════════════════════════════════════════════════════════════════
-- Notifications System – run this in your Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. notifications table ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES public.profiles(id)  ON DELETE CASCADE,
  actor_id   UUID        NOT NULL REFERENCES public.profiles(id)  ON DELETE CASCADE,
  type       TEXT        NOT NULL CHECK (type IN ('like','comment','follow','mention','post')),
  post_id    BIGINT      REFERENCES public.posts(id) ON DELETE CASCADE,
  comment    TEXT,
  read       BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id    ON public.notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications (created_at DESC);

-- ── 2. Row-Level Security ─────────────────────────────────────────────────────

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Recipients can read their own notifications
CREATE POLICY "notifications_select"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Recipients can mark their notifications as read
CREATE POLICY "notifications_update"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Recipients can delete their own notifications
CREATE POLICY "notifications_delete"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);

-- Authenticated users / triggers can insert notifications
CREATE POLICY "notifications_insert"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- ── 3. Enable Realtime ────────────────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- ── 4. follows table (skip if you already have one) ───────────────────────────

CREATE TABLE IF NOT EXISTS public.follows (
  follower_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id)
);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "follows_select"
  ON public.follows FOR SELECT
  USING (true);

CREATE POLICY "follows_insert"
  ON public.follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "follows_delete"
  ON public.follows FOR DELETE
  USING (auth.uid() = follower_id);

-- Enable realtime on follows + full replica identity so DELETE payloads carry old row data
ALTER PUBLICATION supabase_realtime ADD TABLE public.follows;
ALTER TABLE public.follows REPLICA IDENTITY FULL;

-- ── 5. Trigger: notify on post like ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.notify_on_post_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  post_owner UUID;
BEGIN
  SELECT user_id INTO post_owner FROM public.posts WHERE id = NEW.post_id::bigint;
  IF post_owner IS NOT NULL AND post_owner <> NEW.user_id THEN
    INSERT INTO public.notifications (user_id, actor_id, type, post_id)
    VALUES (post_owner, NEW.user_id, 'like', NEW.post_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_post_like ON public.post_likes;
CREATE TRIGGER trg_notify_post_like
  AFTER INSERT ON public.post_likes
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_post_like();

-- ── 6. Trigger: notify on comment ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.notify_on_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  post_owner UUID;
BEGIN
  SELECT user_id INTO post_owner FROM public.posts WHERE id = NEW.post_id::bigint;
  IF post_owner IS NOT NULL AND post_owner <> NEW.user_id THEN
    INSERT INTO public.notifications (user_id, actor_id, type, post_id, comment)
    VALUES (post_owner, NEW.user_id, 'comment', NEW.post_id, LEFT(NEW.comment, 200));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_comment ON public.comments;
CREATE TRIGGER trg_notify_comment
  AFTER INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_comment();

-- ── 7. Trigger: notify on follow ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.notify_on_follow()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.following_id <> NEW.follower_id THEN
    INSERT INTO public.notifications (user_id, actor_id, type)
    VALUES (NEW.following_id, NEW.follower_id, 'follow');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_follow ON public.follows;
CREATE TRIGGER trg_notify_follow
  AFTER INSERT ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_follow();
