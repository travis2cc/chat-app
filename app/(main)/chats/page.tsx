'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Avatar from '@/components/ui/Avatar';
interface GroupWithMeta {
  id: string;
  name: string;
  avatar_url: string | null;
  created_by: string;
  created_at: string;
  last_message?: { content: string; created_at: string; sender_type: string } | null;
  member_count: number;
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const dayMs = 24 * 60 * 60 * 1000;

  if (diff < dayMs && date.getDate() === now.getDate()) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
  }
  if (diff < 2 * dayMs) return '昨天';
  if (diff < 7 * dayMs) {
    return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()];
  }
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function truncateMessage(content: string): string {
  return content.length > 30 ? content.slice(0, 30) + '...' : content;
}

export default function ChatsPage() {
  const [groups, setGroups] = useState<GroupWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchGroups();
  }, []);

  async function fetchGroups() {
    try {
      const res = await fetch('/api/groups');
      const data = await res.json();
      setGroups(data.groups ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function createGroup() {
    if (!newGroupName.trim() || creating) return;
    setCreating(true);
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newGroupName.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.group) {
        setGroups((prev) => [{ ...data.group, member_count: 1, last_message: null }, ...prev]);
        setNewGroupName('');
        setShowNewGroup(false);
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex flex-col h-full bg-wechat-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-wechat-header border-b border-wechat-nav-border pt-safe shrink-0">
        <h1 className="text-lg font-semibold text-gray-800">微信</h1>
        <button
          onClick={() => setShowNewGroup(true)}
          className="w-9 h-9 flex items-center justify-center rounded-full active:bg-gray-200"
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path d="M11 4v14M4 11h14" stroke="#666" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* Create group dialog */}
      {showNewGroup && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
          <div className="bg-white w-full rounded-t-2xl p-6 slide-up">
            <h3 className="text-base font-semibold text-gray-800 mb-4 text-center">发起群聊</h3>
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="输入群聊名称"
              autoFocus
              className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm text-gray-800 placeholder-gray-400 border border-gray-200 focus:border-wechat-green transition-colors mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setShowNewGroup(false); setNewGroupName(''); }}
                className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium"
              >
                取消
              </button>
              <button
                onClick={createGroup}
                disabled={!newGroupName.trim() || creating}
                className="flex-1 py-3 bg-wechat-green text-white rounded-xl text-sm font-medium disabled:opacity-50"
              >
                {creating ? '创建中' : '创建'}
              </button>
            </div>
            <div className="pb-safe" />
          </div>
        </div>
      )}

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto hide-scrollbar bg-white">
        {loading && (
          <div className="py-12 text-center text-gray-400 text-sm">加载中...</div>
        )}

        {!loading && groups.length === 0 && (
          <div className="py-16 flex flex-col items-center gap-3">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <path d="M14 6C9.03 6 5 9.69 5 14.2c0 2.42 1.13 4.59 2.95 6.12L7 23l3.11-1.14c1.19.47 2.52.74 3.89.74 4.97 0 9-3.69 9-8.2S18.97 6 14 6z" fill="#bbb"/>
              </svg>
            </div>
            <p className="text-gray-400 text-sm">还没有群聊</p>
            <button
              onClick={() => setShowNewGroup(true)}
              className="text-wechat-green text-sm border border-wechat-green rounded-full px-4 py-1.5"
            >
              发起群聊
            </button>
          </div>
        )}

        {groups.map((group) => (
          <Link
            key={group.id}
            href={`/chats/${group.id}`}
            className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 active:bg-gray-50 transition-colors"
          >
            <Avatar name={group.name} src={group.avatar_url} size={50} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-800 truncate">
                  {group.name}
                </span>
                {group.last_message && (
                  <span className="text-[11px] text-gray-400 shrink-0 ml-2">
                    {formatTime(group.last_message.created_at)}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 truncate mt-0.5">
                {group.last_message
                  ? truncateMessage(group.last_message.content)
                  : `${group.member_count}名成员`}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
