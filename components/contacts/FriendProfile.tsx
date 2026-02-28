'use client';

import { useState, useEffect } from 'react';
import Avatar from '@/components/ui/Avatar';
import type { Profile, Bot } from '@/types';

interface FriendProfileProps {
  friend: Profile;
  onClose: () => void;
}

interface BotWithShareStatus extends Bot {
  shareRequest: { id: string; status: string } | null;
}

export default function FriendProfile({ friend, onClose }: FriendProfileProps) {
  const [bots, setBots] = useState<BotWithShareStatus[]>([]);
  const [loadingBots, setLoadingBots] = useState(true);
  const [requesting, setRequesting] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/friends/${friend.id}/bots`)
      .then((r) => r.json())
      .then((data) => setBots(data.bots ?? []))
      .catch(() => {})
      .finally(() => setLoadingBots(false));
  }, [friend.id]);

  async function handleRequestCopy(botId: string) {
    setRequesting(botId);
    setError('');
    try {
      const res = await fetch('/api/bots/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? '申请失败');
        return;
      }
      // Update local state
      setBots((prev) =>
        prev.map((b) =>
          b.id === botId
            ? { ...b, shareRequest: { id: data.shareRequest.id, status: 'pending' } }
            : b
        )
      );
    } catch {
      setError('申请失败');
    } finally {
      setRequesting(null);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center px-4 py-3 border-b border-gray-100 shrink-0">
        <button onClick={onClose} className="text-wechat-green text-sm px-1">
          ‹ 返回
        </button>
        <h2 className="flex-1 text-center text-base font-semibold text-gray-800 -mr-12">
          好友资料
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Profile card */}
        <div className="flex items-center gap-4 px-5 py-6 bg-white">
          <Avatar name={friend.display_name || friend.username} src={friend.avatar_url} size={64} />
          <div>
            <h3 className="text-lg font-semibold text-gray-800">
              {friend.display_name || friend.username}
            </h3>
            <p className="text-sm text-gray-400">@{friend.username}</p>
            {friend.bio && (
              <p className="text-sm text-gray-500 mt-1">{friend.bio}</p>
            )}
          </div>
        </div>

        {/* Public bots */}
        <div className="mt-2">
          <div className="px-4 py-2 bg-gray-50">
            <p className="text-xs text-gray-400 font-medium">TA 的公开 Bot</p>
          </div>

          {loadingBots && (
            <div className="py-8 text-center text-gray-400 text-sm">加载中...</div>
          )}

          {!loadingBots && bots.length === 0 && (
            <div className="py-8 text-center text-gray-400 text-sm">暂无公开Bot</div>
          )}

          {error && <p className="px-4 py-2 text-red-500 text-sm">{error}</p>}

          {bots.map((bot) => {
            const shareStatus = bot.shareRequest?.status;
            const isPending = shareStatus === 'pending';
            const isAccepted = shareStatus === 'accepted';

            return (
              <div
                key={bot.id}
                className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-50 last:border-0 bg-white"
              >
                <Avatar name={bot.name} src={bot.avatar_url} size={44} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{bot.name}</p>
                  <p className="text-xs text-gray-400">Bot</p>
                </div>
                <button
                  onClick={() => !isPending && !isAccepted && handleRequestCopy(bot.id)}
                  disabled={requesting === bot.id || isPending || isAccepted}
                  className={`text-xs px-3 py-1.5 rounded-full shrink-0 ${
                    isAccepted
                      ? 'bg-gray-100 text-gray-400'
                      : isPending
                      ? 'bg-gray-100 text-gray-400'
                      : 'border border-wechat-green text-wechat-green active:bg-wechat-green/10'
                  } disabled:opacity-70`}
                >
                  {isAccepted
                    ? '已复制'
                    : isPending
                    ? '待确认'
                    : requesting === bot.id
                    ? '申请中'
                    : '申请复制'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
