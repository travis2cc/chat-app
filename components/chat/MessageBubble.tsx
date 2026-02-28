import Avatar from '@/components/ui/Avatar';
import type { Message, Profile, Bot } from '@/types';

interface MessageBubbleProps {
  message: Message;
  isSelf: boolean;
  showSenderInfo: boolean; // Show avatar + name for group chat
}

function getSenderInfo(message: Message): { name: string; avatarUrl: string | null } {
  if (!message.sender) return { name: '用户', avatarUrl: null };

  if (message.sender_type === 'user') {
    const profile = message.sender as Profile;
    return { name: profile.display_name || profile.username, avatarUrl: profile.avatar_url };
  } else {
    const bot = message.sender as Bot;
    return { name: bot.name, avatarUrl: bot.avatar_url };
  }
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export default function MessageBubble({ message, isSelf, showSenderInfo }: MessageBubbleProps) {
  const { name, avatarUrl } = getSenderInfo(message);

  if (isSelf) {
    return (
      <div className="flex justify-end px-3 mb-2">
        <div className="flex items-end gap-2 max-w-[75%]">
          <div className="flex flex-col items-end gap-1">
            <span className="text-[11px] text-wechat-text-secondary">{formatTime(message.created_at)}</span>
            <div className="bubble-self px-3 py-2 text-sm text-gray-800 break-words whitespace-pre-wrap">
              {message.content}
            </div>
          </div>
          <Avatar name={name} src={avatarUrl} size={36} className="mb-0.5" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start px-3 mb-2">
      <div className="flex items-start gap-2 max-w-[75%]">
        <Avatar name={name} src={avatarUrl} size={36} className="mt-5" />
        <div className="flex flex-col items-start gap-1">
          {showSenderInfo && (
            <span className="text-[12px] text-wechat-text-secondary ml-1">{name}</span>
          )}
          <div className="flex items-end gap-1">
            <div className="bubble-other px-3 py-2 text-sm text-gray-800 break-words whitespace-pre-wrap">
              {message.content}
            </div>
            <span className="text-[11px] text-wechat-text-secondary shrink-0">{formatTime(message.created_at)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
