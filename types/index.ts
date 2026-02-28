export interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
}

export interface Bot {
  id: string;
  owner_id: string;
  name: string;
  avatar_url: string | null;
  system_prompt: string;
  is_public: boolean;
  created_at: string;
  owner?: Profile;
}

export interface Group {
  id: string;
  name: string;
  avatar_url: string | null;
  created_by: string;
  created_at: string;
  member_count?: number;
  last_message?: Message | null;
}

export interface GroupMember {
  group_id: string;
  user_id: string;
  added_by: string;
  joined_at: string;
  profile?: Profile;
}

export interface GroupBot {
  group_id: string;
  bot_id: string;
  added_by: string;
  joined_at: string;
  bot?: Bot;
}

export interface Message {
  id: string;
  group_id: string;
  sender_id: string;
  sender_type: 'user' | 'bot';
  content: string;
  created_at: string;
  sender?: Profile | Bot;
}

export interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  requester?: Profile;
  addressee?: Profile;
}

export interface BotShareRequest {
  id: string;
  bot_id: string;
  requester_id: string;
  owner_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  bot?: Bot;
  requester?: Profile;
}

// Combined member type for group member display
export type GroupParticipant =
  | { type: 'user'; data: Profile; added_by: string }
  | { type: 'bot'; data: Bot; added_by: string };
