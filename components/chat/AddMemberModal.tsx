'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import Avatar from '@/components/ui/Avatar';
import type { Profile, Bot } from '@/types';

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  type: 'user' | 'bot';
  onAdded: () => void;
}

export default function AddMemberModal({
  isOpen,
  onClose,
  groupId,
  type,
  onAdded,
}: AddMemberModalProps) {
  const [items, setItems] = useState<(Profile | Bot)[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError('');

    const endpoint = type === 'user' ? '/api/friends' : '/api/bots';
    fetch(endpoint)
      .then((r) => r.json())
      .then((data) => {
        setItems(type === 'user' ? (data.friends ?? []) : (data.bots ?? []));
      })
      .catch(() => setError('加载失败'))
      .finally(() => setLoading(false));
  }, [isOpen, type]);

  async function handleAdd(id: string) {
    setAdding(id);
    setError('');
    try {
      const endpoint =
        type === 'user'
          ? `/api/groups/${groupId}/members`
          : `/api/groups/${groupId}/bots`;

      const body = type === 'user' ? { userId: id } : { botId: id };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? '添加失败');
        return;
      }

      onAdded();
      onClose();
    } catch {
      setError('添加失败');
    } finally {
      setAdding(null);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={type === 'user' ? '添加群成员' : '添加Bot到群'}
    >
      <div className="px-4 py-2">
        {loading && (
          <div className="py-8 text-center text-gray-400 text-sm">加载中...</div>
        )}
        {error && <p className="text-red-500 text-sm text-center py-2">{error}</p>}
        {!loading && items.length === 0 && (
          <div className="py-8 text-center text-gray-400 text-sm">
            {type === 'user' ? '暂无好友可添加' : '你还没有创建Bot，请先在通讯录中创建'}
          </div>
        )}
        {items.map((item) => {
          const isUser = type === 'user';
          const id = item.id;
          const name = isUser
            ? (item as Profile).display_name || (item as Profile).username
            : (item as Bot).name;
          const avatarUrl = isUser
            ? (item as Profile).avatar_url
            : (item as Bot).avatar_url;

          return (
            <div
              key={id}
              className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0"
            >
              <Avatar name={name} src={avatarUrl} size={44} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{name}</p>
                {isUser && (item as Profile).username && (
                  <p className="text-xs text-gray-400">@{(item as Profile).username}</p>
                )}
              </div>
              <button
                onClick={() => handleAdd(id)}
                disabled={adding === id}
                className="px-4 py-1.5 text-sm text-wechat-green border border-wechat-green rounded-full disabled:opacity-50 active:bg-wechat-green/10"
              >
                {adding === id ? '添加中' : '添加'}
              </button>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
