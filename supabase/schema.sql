-- ====================================================
-- Chat App - Supabase Database Schema
-- Run this in Supabase SQL Editor
-- ====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ====================================================
-- TABLES
-- ====================================================

-- User profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Bots
CREATE TABLE IF NOT EXISTS public.bots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  system_prompt TEXT NOT NULL DEFAULT '',
  is_public BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Groups (chat rooms)
CREATE TABLE IF NOT EXISTS public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  avatar_url TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Group members (human users)
CREATE TABLE IF NOT EXISTS public.group_members (
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  added_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  joined_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  PRIMARY KEY (group_id, user_id)
);

-- Group bots
CREATE TABLE IF NOT EXISTS public.group_bots (
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  bot_id UUID REFERENCES public.bots(id) ON DELETE CASCADE NOT NULL,
  added_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  joined_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  PRIMARY KEY (group_id, bot_id)
);

-- Messages
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'bot')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Index for fast message retrieval
CREATE INDEX IF NOT EXISTS messages_group_created_idx ON public.messages (group_id, created_at DESC);

-- Friendships
CREATE TABLE IF NOT EXISTS public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  addressee_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (requester_id, addressee_id)
);

-- Bot share requests
CREATE TABLE IF NOT EXISTS public.bot_share_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id UUID REFERENCES public.bots(id) ON DELETE CASCADE NOT NULL,
  requester_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ====================================================
-- ROW LEVEL SECURITY (RLS)
-- ====================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_share_requests ENABLE ROW LEVEL SECURITY;

-- Helper function: check if user is a group member
CREATE OR REPLACE FUNCTION public.is_group_member(p_group_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = p_group_id AND user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ---- profiles ----
CREATE POLICY "Profiles are viewable by everyone authenticated"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ---- bots ----
CREATE POLICY "Public bots are viewable by authenticated users"
  ON public.bots FOR SELECT
  TO authenticated
  USING (is_public = true OR owner_id = auth.uid());

CREATE POLICY "Users can create their own bots"
  ON public.bots FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update their own bots"
  ON public.bots FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can delete their own bots"
  ON public.bots FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- ---- groups ----
CREATE POLICY "Group members can view their groups"
  ON public.groups FOR SELECT
  TO authenticated
  USING (is_group_member(id, auth.uid()));

CREATE POLICY "Authenticated users can create groups"
  ON public.groups FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- ---- group_members ----
CREATE POLICY "Group members can view group membership"
  ON public.group_members FOR SELECT
  TO authenticated
  USING (is_group_member(group_id, auth.uid()));

CREATE POLICY "Group members can add new members"
  ON public.group_members FOR INSERT
  TO authenticated
  WITH CHECK (is_group_member(group_id, auth.uid()));

-- ---- group_bots ----
CREATE POLICY "Group members can view group bots"
  ON public.group_bots FOR SELECT
  TO authenticated
  USING (is_group_member(group_id, auth.uid()));

CREATE POLICY "Group members can add bots"
  ON public.group_bots FOR INSERT
  TO authenticated
  WITH CHECK (is_group_member(group_id, auth.uid()));

CREATE POLICY "Bot owners can remove their bots from groups"
  ON public.group_bots FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bots
      WHERE id = bot_id AND owner_id = auth.uid()
    )
  );

-- ---- messages ----
CREATE POLICY "Group members can view messages"
  ON public.messages FOR SELECT
  TO authenticated
  USING (is_group_member(group_id, auth.uid()));

CREATE POLICY "Group members can send messages"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (
    is_group_member(group_id, auth.uid()) AND
    sender_id = auth.uid() AND
    sender_type = 'user'
  );

-- Bot messages are inserted by service role (bypasses RLS)

-- ---- friendships ----
CREATE POLICY "Users can view their own friendships"
  ON public.friendships FOR SELECT
  TO authenticated
  USING (requester_id = auth.uid() OR addressee_id = auth.uid());

CREATE POLICY "Users can create friendship requests"
  ON public.friendships FOR INSERT
  TO authenticated
  WITH CHECK (requester_id = auth.uid());

CREATE POLICY "Addressees can update friendship status"
  ON public.friendships FOR UPDATE
  TO authenticated
  USING (addressee_id = auth.uid());

-- ---- bot_share_requests ----
CREATE POLICY "Users can view their own share requests"
  ON public.bot_share_requests FOR SELECT
  TO authenticated
  USING (requester_id = auth.uid() OR owner_id = auth.uid());

CREATE POLICY "Users can create share requests"
  ON public.bot_share_requests FOR INSERT
  TO authenticated
  WITH CHECK (requester_id = auth.uid());

CREATE POLICY "Bot owners can respond to share requests"
  ON public.bot_share_requests FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid());

-- ====================================================
-- REALTIME
-- Enable realtime for messages table
-- ====================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- ====================================================
-- STORAGE
-- Run this AFTER creating the 'avatars' bucket in Storage UI
-- OR run in SQL Editor:
-- ====================================================

-- Storage policy (run after creating 'avatars' bucket as Public)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

CREATE POLICY "Anyone can view avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can upload avatars"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Users can update their own avatars"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[2]);

-- ====================================================
-- NOTES
-- ====================================================
-- 1. The service role key (SUPABASE_SERVICE_ROLE_KEY) bypasses RLS
--    Used for: bot message insertion, user registration
-- 2. The anon key (NEXT_PUBLIC_SUPABASE_ANON_KEY) respects RLS
--    Used for: all client-side operations
-- 3. After running this SQL, create the 'avatars' storage bucket
--    in Supabase Dashboard > Storage > New Bucket
--    Name: avatars, Public: YES
