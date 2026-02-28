'use client';

import { useState, useEffect, useRef, use } from 'react';
import { createClient } from '@/lib/supabase/client';
import ChatHeader from '@/components/chat/ChatHeader';
import MessageBubble from '@/components/chat/MessageBubble';
import MessageInput from '@/components/chat/MessageInput';
import MembersPanel, { toMember } from '@/components/chat/MembersPanel';
import AddMemberModal from '@/components/chat/AddMemberModal';
import type { Message, Profile, Bot } from '@/types';

interface GroupInfo {
  id: string;
  name: string;
  avatar_url: string | null;
}

interface MemberData {
  type: 'user' | 'bot';
  id: string;
  name: string;
  avatarUrl: string | null;
  addedBy?: string;
}

export default function GroupChatPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = use(params);
  const [messages, setMessages] = useState<Message[]>([]);
  const [group, setGroup] = useState<GroupInfo | null>(null);
  const [members, setMembers] = useState<MemberData[]>([]);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [showMembers, setShowMembers] = useState(false);
  const [addModalType, setAddModalType] = useState<'user' | 'bot' | null>(null);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isInitialLoad = useRef(true);

  // Scroll to bottom
  function scrollToBottom(behavior: ScrollBehavior = 'smooth') {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }

  // Load initial data
  useEffect(() => {
    const supabase = createClient();

    async function init() {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      setCurrentUser(profile);

      // Load group info + members
      await loadGroupData();

      // Load messages
      const res = await fetch(`/api/groups/${groupId}/messages?limit=50`);
      const data = await res.json();
      setMessages(data.messages ?? []);
      setLoading(false);

      // Scroll to bottom on initial load
      setTimeout(() => scrollToBottom('instant'), 100);
      isInitialLoad.current = false;
    }

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  async function loadGroupData() {
    const res = await fetch(`/api/groups/${groupId}`);
    const data = await res.json();
    if (data.group) setGroup(data.group);

    // Build members list
    const membersList: MemberData[] = [];

    for (const m of data.members ?? []) {
      const member = toMember(m, 'user');
      if (member) membersList.push(member);
    }
    for (const b of data.bots ?? []) {
      const member = toMember(b, 'bot');
      if (member) membersList.push(member);
    }
    setMembers(membersList);
  }

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`group-messages-${groupId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `group_id=eq.${groupId}`,
        },
        async (payload) => {
          const newMsg = payload.new as Message;

          // Enrich with sender info
          let sender: Profile | Bot | undefined;
          if (newMsg.sender_type === 'user') {
            const { data } = await supabase
              .from('profiles')
              .select('id, username, display_name, avatar_url, bio, created_at')
              .eq('id', newMsg.sender_id)
              .single();
            sender = (data as Profile) ?? undefined;
          } else {
            const { data } = await supabase
              .from('bots')
              .select('id, name, avatar_url, owner_id, system_prompt, is_public, created_at')
              .eq('id', newMsg.sender_id)
              .single();
            sender = (data as Bot) ?? undefined;
          }

          const enrichedMsg: Message = { ...newMsg, sender };

          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, enrichedMsg];
          });

          // Scroll to bottom for new messages
          setTimeout(() => scrollToBottom('smooth'), 50);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId]);

  // Scroll to bottom when messages change (only on new messages, not scroll-up)
  useEffect(() => {
    if (!isInitialLoad.current) {
      scrollToBottom('smooth');
    }
  }, [messages.length]);

  async function handleSend(content: string) {
    await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupId, content }),
    });
  }

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-wechat-bg">
        <div className="flex items-center justify-center flex-1">
          <p className="text-gray-400 text-sm">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-wechat-bg overflow-hidden">
      <ChatHeader
        groupName={group?.name ?? '群聊'}
        memberCount={members.length}
        onMembersClick={() => setShowMembers(true)}
      />

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto hide-scrollbar py-2">
        {messages.map((msg) => {
          const isSelf = msg.sender_id === currentUser?.id;
          // Show sender info for all non-self messages in group chat
          const showSenderInfo = !isSelf;

          return (
            <MessageBubble
              key={msg.id}
              message={msg}
              isSelf={isSelf}
              showSenderInfo={showSenderInfo}
            />
          );
        })}
        <div ref={messagesEndRef} className="h-2" />
      </div>

      <MessageInput onSend={handleSend} />

      {/* Members panel */}
      <MembersPanel
        isOpen={showMembers}
        onClose={() => setShowMembers(false)}
        members={members}
        currentUserId={currentUser?.id ?? ''}
        groupId={groupId}
        onAddMember={() => { setShowMembers(false); setAddModalType('user'); }}
        onAddBot={() => { setShowMembers(false); setAddModalType('bot'); }}
      />

      {/* Add member modal */}
      <AddMemberModal
        isOpen={addModalType !== null}
        onClose={() => setAddModalType(null)}
        groupId={groupId}
        type={addModalType ?? 'user'}
        onAdded={() => { loadGroupData(); setAddModalType(null); }}
      />
    </div>
  );
}
