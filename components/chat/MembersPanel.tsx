'use client';

import { useEffect, useRef } from 'react';
import Avatar from '@/components/ui/Avatar';
import type { Profile, Bot } from '@/types';

interface Member {
  type: 'user' | 'bot';
  id: string;
  name: string;
  avatarUrl: string | null;
  addedBy?: string;
}

interface MembersPanelProps {
  isOpen: boolean;
  onClose: () => void;
  members: Member[];
  currentUserId: string;
  groupId: string;
  onAddMember: () => void;
  onAddBot: () => void;
}

export default function MembersPanel({
  isOpen,
  onClose,
  members,
  onAddMember,
  onAddBot,
}: MembersPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClick);
    }
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />
      <div
        ref={panelRef}
        className="fixed top-0 right-0 bottom-0 z-50 w-[72%] max-w-72 bg-white shadow-xl slide-in-right flex flex-col"
      >
        <div className="pt-safe" />
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">群成员</h2>
          <p className="text-xs text-gray-400 mt-0.5">{members.length}人</p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Grid of member avatars like WeChat */}
          <div className="p-4 grid grid-cols-5 gap-3">
            {members.map((member) => (
              <div key={`${member.type}-${member.id}`} className="flex flex-col items-center gap-1">
                <Avatar name={member.name} src={member.avatarUrl} size={46} />
                <span className="text-[10px] text-gray-500 text-center leading-tight line-clamp-2 w-full">
                  {member.name}
                  {member.type === 'bot' && (
                    <span className="block text-[9px] text-wechat-green">Bot</span>
                  )}
                </span>
              </div>
            ))}

            {/* Add member button */}
            <button
              onClick={onAddMember}
              className="flex flex-col items-center gap-1"
            >
              <div className="w-[46px] h-[46px] rounded-md border-2 border-dashed border-gray-300 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 4v12M4 10h12" stroke="#bbb" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <span className="text-[10px] text-gray-400">添加</span>
            </button>

            {/* Add bot button */}
            <button
              onClick={onAddBot}
              className="flex flex-col items-center gap-1"
            >
              <div className="w-[46px] h-[46px] rounded-md border-2 border-dashed border-wechat-green/40 flex items-center justify-center bg-wechat-green/5">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <circle cx="10" cy="10" r="8" stroke="#07C160" strokeWidth="1.5"/>
                  <path d="M10 6v8M6 10h8" stroke="#07C160" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <span className="text-[10px] text-wechat-green">加Bot</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// Helper to convert API response to Member type
export function toMember(
  item: { user_id?: string; bot_id?: string; profiles?: Profile; bots?: Bot },
  type: 'user' | 'bot'
): Member | null {
  if (type === 'user' && item.profiles) {
    const p = item.profiles;
    return {
      type: 'user',
      id: p.id,
      name: p.display_name || p.username,
      avatarUrl: p.avatar_url,
    };
  }
  if (type === 'bot' && item.bots) {
    const b = item.bots;
    return {
      type: 'bot',
      id: b.id,
      name: b.name,
      avatarUrl: b.avatar_url,
    };
  }
  return null;
}
