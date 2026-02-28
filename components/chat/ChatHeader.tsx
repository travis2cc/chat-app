'use client';

import { useRouter } from 'next/navigation';

interface ChatHeaderProps {
  groupName: string;
  memberCount: number;
  onMembersClick: () => void;
}

export default function ChatHeader({ groupName, memberCount, onMembersClick }: ChatHeaderProps) {
  const router = useRouter();

  return (
    <div className="flex items-center h-11 px-2 bg-wechat-header border-b border-wechat-nav-border pt-safe shrink-0">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-wechat-green px-2 py-2 -ml-2 active:opacity-70"
      >
        <svg width="9" height="15" viewBox="0 0 9 15" fill="none">
          <path
            d="M8 1L2 7.5L8 14"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Title */}
      <div className="flex-1 text-center">
        <h1 className="text-base font-semibold text-gray-800 leading-tight">
          {groupName}
        </h1>
        {memberCount > 0 && (
          <p className="text-[11px] text-wechat-text-secondary leading-tight">
            {memberCount}人
          </p>
        )}
      </div>

      {/* Members button */}
      <button
        onClick={onMembersClick}
        className="p-2 -mr-2 active:opacity-70"
      >
        <svg width="22" height="16" viewBox="0 0 22 16" fill="none">
          <rect x="0" y="0" width="22" height="2.5" rx="1.25" fill="#666"/>
          <rect x="0" y="6.75" width="22" height="2.5" rx="1.25" fill="#666"/>
          <rect x="0" y="13.5" width="22" height="2.5" rx="1.25" fill="#666"/>
        </svg>
      </button>
    </div>
  );
}
