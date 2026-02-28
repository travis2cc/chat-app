'use client';

import { useState, useRef, useEffect } from 'react';

interface MessageInputProps {
  onSend: (content: string) => Promise<void>;
  disabled?: boolean;
}

export default function MessageInput({ onSend, disabled }: MessageInputProps) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, 120);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [text]);

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || sending || disabled) return;

    setSending(true);
    try {
      await onSend(trimmed);
      setText('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    // Desktop: Enter to send, Shift+Enter for new line
    if (e.key === 'Enter' && !e.shiftKey && !('ontouchstart' in window)) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex items-end gap-2 px-3 py-2 bg-wechat-header border-t border-wechat-nav-border pb-safe">
      <div className="flex-1 bg-white rounded-lg overflow-hidden border border-gray-200 min-h-[36px] flex items-end">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入消息..."
          rows={1}
          className="flex-1 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 bg-transparent resize-none block w-full"
          style={{ lineHeight: '1.5' }}
          disabled={disabled || sending}
        />
      </div>

      {text.trim() ? (
        <button
          onClick={handleSend}
          disabled={sending || disabled}
          className="px-4 py-2 bg-wechat-green text-white text-sm font-medium rounded-lg shrink-0 disabled:opacity-60 active:bg-wechat-green-dark transition-colors h-9"
        >
          发送
        </button>
      ) : (
        <div className="w-10 h-9 flex items-center justify-center shrink-0">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <circle cx="11" cy="11" r="10" stroke="#bbb" strokeWidth="1.5"/>
            <circle cx="7.5" cy="10" r="1.2" fill="#bbb"/>
            <circle cx="14.5" cy="10" r="1.2" fill="#bbb"/>
            <path d="M7.5 13.5s1 2 3.5 2 3.5-2 3.5-2" stroke="#bbb" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        </div>
      )}
    </div>
  );
}
