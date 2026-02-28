'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  {
    href: '/chats',
    label: '微信',
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path
          d="M8.5 4C5.46 4 3 6.19 3 8.9c0 1.48.7 2.81 1.81 3.75L4 15l2.65-.97c.56.18 1.14.28 1.76.28h.09A4.54 4.54 0 018.5 14c0-2.76 2.68-5 6-5 .28 0 .56.02.83.05C14.7 6.5 11.87 4 8.5 4z"
          fill={active ? '#07C160' : '#999'}
        />
        <path
          d="M14.5 10c-2.76 0-5 1.79-5 4s2.24 4 5 4c.62 0 1.2-.1 1.73-.28L19 18.8l-.82-2.35A3.93 3.93 0 0019.5 14c0-2.21-2.24-4-5-4z"
          fill={active ? '#07C160' : '#bbb'}
        />
      </svg>
    ),
  },
  {
    href: '/contacts',
    label: '通讯录',
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="8" r="3.5" fill={active ? '#07C160' : '#999'} />
        <path
          d="M5 19c0-3.87 3.13-7 7-7s7 3.13 7 7"
          stroke={active ? '#07C160' : '#999'}
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M18 3v2m0 2v2M20 5h-2m-2 0h2"
          stroke={active ? '#07C160' : '#bbb'}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-wechat-nav border-t border-wechat-nav-border pb-safe">
      <div className="flex">
        {tabs.map((tab) => {
          const isActive = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex-1 flex flex-col items-center justify-center py-1.5 gap-0.5 active:opacity-70 transition-opacity"
            >
              {tab.icon(isActive)}
              <span
                className="text-[10px] font-medium"
                style={{ color: isActive ? '#07C160' : '#999' }}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
