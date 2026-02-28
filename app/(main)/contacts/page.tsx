'use client';

import { useState, useEffect } from 'react';
import Avatar from '@/components/ui/Avatar';
import Modal from '@/components/ui/Modal';
import BotEditor from '@/components/contacts/BotEditor';
import FriendProfile from '@/components/contacts/FriendProfile';
import type { Bot, Profile } from '@/types';

type Section = 'main' | 'notifications';

interface Notification {
  type: 'friend_request' | 'bot_share';
  id: string;
  created_at: string;
  requester?: Profile;
  bot?: Bot;
  friendshipId?: string;
  requestId?: string;
}

export default function ContactsPage() {
  const [bots, setBots] = useState<Bot[]>([]);
  const [friends, setFriends] = useState<Profile[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifCount, setNotifCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState<Section>('main');

  // Modals
  const [botEditorBot, setBotEditorBot] = useState<Bot | null | undefined>(undefined); // undefined = closed, null = new
  const [viewingFriend, setViewingFriend] = useState<Profile | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<(Profile & { friendshipStatus: string | null; friendshipId: string | null })[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingFriend, setAddingFriend] = useState<string | null>(null);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [botsRes, friendsRes, notifRes] = await Promise.all([
        fetch('/api/bots'),
        fetch('/api/friends'),
        fetch('/api/notifications'),
      ]);
      const [botsData, friendsData, notifData] = await Promise.all([
        botsRes.json(),
        friendsRes.json(),
        notifRes.json(),
      ]);

      setBots(botsData.bots ?? []);
      setFriends(friendsData.friends ?? []);
      setNotifCount(notifData.total ?? 0);

      // Build notifications list
      const notifs: Notification[] = [
        ...(notifData.friendRequests ?? []).map((r: { id: string; created_at: string; requester: Profile }) => ({
          type: 'friend_request' as const,
          id: r.id,
          created_at: r.created_at,
          requester: r.requester,
          friendshipId: r.id,
        })),
        ...(notifData.botShareRequests ?? []).map((r: { id: string; created_at: string; requester: Profile; bots: Bot }) => ({
          type: 'bot_share' as const,
          id: r.id,
          created_at: r.created_at,
          requester: r.requester,
          bot: r.bots,
          requestId: r.id,
        })),
      ];
      setNotifications(notifs);
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch() {
    if (!searchQuery.trim() || searching) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/friends/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setSearchResults(data.users ?? []);
    } finally {
      setSearching(false);
    }
  }

  async function handleAddFriend(userId: string) {
    setAddingFriend(userId);
    try {
      await fetch('/api/friends/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addresseeId: userId }),
      });
      // Update local state
      setSearchResults((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, friendshipStatus: 'pending' } : u))
      );
    } finally {
      setAddingFriend(null);
    }
  }

  async function respondToFriend(friendshipId: string, action: 'accept' | 'reject') {
    await fetch('/api/friends/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ friendshipId, action }),
    });
    await loadAll();
  }

  async function respondToBotShare(requestId: string, action: 'accept' | 'reject') {
    await fetch('/api/bots/share', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId, action }),
    });
    await loadAll();
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-wechat-header border-b border-wechat-nav-border pt-safe shrink-0">
        <h1 className="text-lg font-semibold text-gray-800">通讯录</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSearch(true)}
            className="w-9 h-9 flex items-center justify-center rounded-full active:bg-gray-200"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="7.5" cy="7.5" r="5.5" stroke="#666" strokeWidth="1.6"/>
              <path d="M12 12l3.5 3.5" stroke="#666" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto hide-scrollbar">
        {/* Notifications row */}
        <button
          onClick={() => setSection(section === 'notifications' ? 'main' : 'notifications')}
          className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-gray-100 active:bg-gray-50"
        >
          <div className="w-10 h-10 bg-wechat-green rounded-xl flex items-center justify-center shrink-0">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="white">
              <path d="M10 2a6 6 0 016 6v2l1.5 2.5h-15L4 10V8a6 6 0 016-6zM7.5 16a2.5 2.5 0 005 0H7.5z"/>
            </svg>
          </div>
          <span className="flex-1 text-sm font-medium text-gray-800 text-left">新的朋友</span>
          {notifCount > 0 && (
            <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
              {notifCount}
            </span>
          )}
        </button>

        {/* Notifications list */}
        {section === 'notifications' && (
          <div className="bg-gray-50 border-b border-gray-100">
            {notifications.length === 0 && (
              <p className="text-center text-gray-400 text-sm py-6">暂无新通知</p>
            )}
            {notifications.map((notif) => (
              <div key={notif.id} className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-50">
                <Avatar
                  name={notif.requester?.display_name || notif.requester?.username || '?'}
                  src={notif.requester?.avatar_url}
                  size={44}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {notif.requester?.display_name || notif.requester?.username}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {notif.type === 'friend_request'
                      ? '申请添加你为好友'
                      : `申请复制你的Bot「${notif.bot?.name}」`}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => notif.type === 'friend_request'
                      ? respondToFriend(notif.friendshipId!, 'reject')
                      : respondToBotShare(notif.requestId!, 'reject')
                    }
                    className="px-3 py-1.5 text-xs text-gray-500 bg-gray-100 rounded-full"
                  >
                    拒绝
                  </button>
                  <button
                    onClick={() => notif.type === 'friend_request'
                      ? respondToFriend(notif.friendshipId!, 'accept')
                      : respondToBotShare(notif.requestId!, 'accept')
                    }
                    className="px-3 py-1.5 text-xs text-white bg-wechat-green rounded-full"
                  >
                    同意
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* MyBot section */}
        <div>
          <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
            <p className="text-xs text-gray-500 font-medium tracking-wide">MY BOT</p>
          </div>

          {bots.map((bot) => (
            <button
              key={bot.id}
              onClick={() => setBotEditorBot(bot)}
              className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-gray-50 active:bg-gray-50 transition-colors"
            >
              <Avatar name={bot.name} src={bot.avatar_url} size={46} />
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{bot.name}</p>
                <p className="text-xs text-gray-400 truncate">
                  {bot.system_prompt ? '已配置 · ' : '未配置 · '}
                  {bot.is_public ? '公开' : '私密'}
                </p>
              </div>
              <svg width="7" height="12" viewBox="0 0 7 12" fill="none">
                <path d="M1 1l5 5-5 5" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          ))}

          {/* Create new bot */}
          <button
            onClick={() => setBotEditorBot(null)}
            className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-gray-50 active:bg-gray-50"
          >
            <div className="w-[46px] h-[46px] bg-gray-100 rounded-xl flex items-center justify-center shrink-0">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 4v12M4 10h12" stroke="#999" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="text-sm text-gray-500">创建新Bot</span>
          </button>
        </div>

        {/* MyFriends section */}
        <div>
          <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
            <p className="text-xs text-gray-500 font-medium tracking-wide">MY FRIENDS</p>
          </div>

          {loading && (
            <div className="py-6 text-center text-gray-400 text-sm">加载中...</div>
          )}

          {!loading && friends.length === 0 && (
            <div className="py-8 text-center text-gray-400 text-sm">
              <p>还没有好友</p>
              <button
                onClick={() => setShowSearch(true)}
                className="mt-2 text-wechat-green text-sm"
              >
                添加好友
              </button>
            </div>
          )}

          {friends.map((friend) => (
            <button
              key={friend.id}
              onClick={() => setViewingFriend(friend)}
              className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-gray-50 active:bg-gray-50 transition-colors"
            >
              <Avatar name={friend.display_name || friend.username} src={friend.avatar_url} size={46} />
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">
                  {friend.display_name || friend.username}
                </p>
                <p className="text-xs text-gray-400 truncate">@{friend.username}</p>
              </div>
              <svg width="7" height="12" viewBox="0 0 7 12" fill="none">
                <path d="M1 1l5 5-5 5" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          ))}
        </div>
      </div>

      {/* Bot editor modal */}
      {botEditorBot !== undefined && (
        <Modal isOpen fullScreen onClose={() => setBotEditorBot(undefined)}>
          <BotEditor
            bot={botEditorBot}
            onSave={(savedBot) => {
              setBots((prev) => {
                const exists = prev.some((b) => b.id === savedBot.id);
                return exists
                  ? prev.map((b) => (b.id === savedBot.id ? savedBot : b))
                  : [savedBot, ...prev];
              });
              setBotEditorBot(undefined);
            }}
            onClose={() => setBotEditorBot(undefined)}
          />
        </Modal>
      )}

      {/* Friend profile modal */}
      {viewingFriend && (
        <Modal isOpen fullScreen onClose={() => setViewingFriend(null)}>
          <FriendProfile
            friend={viewingFriend}
            onClose={() => setViewingFriend(null)}
          />
        </Modal>
      )}

      {/* Add friend search modal */}
      {showSearch && (
        <Modal isOpen title="添加好友" onClose={() => { setShowSearch(false); setSearchQuery(''); setSearchResults([]); }}>
          <div className="px-4 py-3">
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索用户名"
                autoFocus
                autoCapitalize="none"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1 px-3 py-2.5 bg-gray-50 rounded-xl text-sm text-gray-800 placeholder-gray-400 border border-gray-200 focus:border-wechat-green transition-colors"
              />
              <button
                onClick={handleSearch}
                disabled={searching || !searchQuery.trim()}
                className="px-4 py-2.5 bg-wechat-green text-white text-sm rounded-xl disabled:opacity-50"
              >
                搜索
              </button>
            </div>

            {searching && <p className="text-center text-gray-400 text-sm py-4">搜索中...</p>}

            {searchResults.map((user) => {
              const status = user.friendshipStatus;
              return (
                <div key={user.id} className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
                  <Avatar name={user.display_name || user.username} src={user.avatar_url} size={44} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {user.display_name || user.username}
                    </p>
                    <p className="text-xs text-gray-400">@{user.username}</p>
                  </div>
                  <button
                    onClick={() => !status && handleAddFriend(user.id)}
                    disabled={!!status || addingFriend === user.id}
                    className={`text-xs px-3 py-1.5 rounded-full shrink-0 ${
                      status === 'accepted'
                        ? 'bg-gray-100 text-gray-400'
                        : status === 'pending'
                        ? 'bg-gray-100 text-gray-400'
                        : 'border border-wechat-green text-wechat-green active:bg-wechat-green/10'
                    } disabled:opacity-70`}
                  >
                    {status === 'accepted'
                      ? '已是好友'
                      : status === 'pending'
                      ? '已申请'
                      : addingFriend === user.id
                      ? '申请中'
                      : '添加'}
                  </button>
                </div>
              );
            })}
          </div>
        </Modal>
      )}
    </div>
  );
}
