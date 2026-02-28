'use client';

import { useEffect, useRef } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  fullScreen?: boolean;
}

export default function Modal({ isOpen, onClose, title, children, fullScreen = false }: ModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      {/* Backdrop */}
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      {/* Content */}
      <div
        className={`relative z-10 bg-white w-full slide-up ${
          fullScreen ? 'h-full rounded-none' : 'rounded-t-2xl max-h-[85vh]'
        } flex flex-col`}
      >
        {title && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
            <button onClick={onClose} className="text-wechat-green text-sm px-1">
              取消
            </button>
            <h2 className="text-base font-semibold text-gray-800">{title}</h2>
            <div className="w-12" />
          </div>
        )}
        <div className="overflow-y-auto flex-1 pb-safe">{children}</div>
      </div>
    </div>
  );
}
