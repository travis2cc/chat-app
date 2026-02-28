'use client';

import { useState, useEffect, useRef } from 'react';
import Avatar from '@/components/ui/Avatar';
import type { Bot } from '@/types';

interface BotEditorProps {
  bot: Bot | null; // null = create new
  onSave: (bot: Bot) => void;
  onClose: () => void;
}

export default function BotEditor({ bot, onSave, onClose }: BotEditorProps) {
  const [name, setName] = useState(bot?.name ?? '');
  const [prompt, setPrompt] = useState(bot?.system_prompt ?? '');
  const [isPublic, setIsPublic] = useState(bot?.is_public ?? false);
  const [avatarUrl, setAvatarUrl] = useState(bot?.avatar_url ?? null);
  const [optimizing, setOptimizing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [refineInstruction, setRefineInstruction] = useState('');
  const [refining, setRefining] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (bot) {
      setName(bot.name);
      setPrompt(bot.system_prompt);
      setIsPublic(bot.is_public);
      setAvatarUrl(bot.avatar_url);
    }
  }, [bot]);

  async function handleOptimize() {
    if (!prompt.trim()) {
      setError('请先输入Bot描述');
      return;
    }
    setOptimizing(true);
    setError('');
    try {
      const res = await fetch('/api/bots/optimize-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawDescription: prompt }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? '优化失败');
        return;
      }
      setPrompt(data.optimized);
    } catch {
      setError('优化失败，请重试');
    } finally {
      setOptimizing(false);
    }
  }

  async function handleRefine() {
    if (!refineInstruction.trim() || !prompt.trim()) return;
    setRefining(true);
    setError('');
    try {
      const res = await fetch('/api/bots/optimize-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPrompt: prompt, instruction: refineInstruction }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? '修改失败');
        return;
      }
      setPrompt(data.optimized);
      setRefineInstruction('');
    } catch {
      setError('修改失败，请重试');
    } finally {
      setRefining(false);
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'bot');
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok) setAvatarUrl(data.url);
      else setError(data.error ?? '上传失败');
    } catch {
      setError('上传失败');
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleSave() {
    if (!name.trim()) {
      setError('请输入Bot名称');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const method = bot ? 'PUT' : 'POST';
      const url = bot ? `/api/bots/${bot.id}` : '/api/bots';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          systemPrompt: prompt,
          isPublic,
          avatarUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? '保存失败');
        return;
      }
      onSave(data.bot);
    } catch {
      setError('保存失败');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
        <button onClick={onClose} className="text-wechat-green text-sm px-1">
          取消
        </button>
        <h2 className="text-base font-semibold text-gray-800">
          {bot ? '编辑Bot' : '创建Bot'}
        </h2>
        <button
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="text-wechat-green text-sm px-1 font-medium disabled:opacity-50"
        >
          {saving ? '保存中' : '保存'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Avatar + Name */}
        <div className="flex items-center gap-4 px-4 py-4 border-b border-gray-100">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="relative shrink-0"
            disabled={uploadingAvatar}
          >
            <Avatar name={name || 'Bot'} src={avatarUrl} size={60} />
            <div className="absolute inset-0 rounded-md bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
              <span className="text-white text-[10px]">更换</span>
            </div>
            {uploadingAvatar && (
              <div className="absolute inset-0 rounded-md bg-black/40 flex items-center justify-center">
                <span className="text-white text-[9px]">上传中</span>
              </div>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarUpload}
          />
          <div className="flex-1">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Bot名称"
              className="w-full text-base font-medium text-gray-800 placeholder-gray-400 bg-transparent border-b border-gray-200 pb-1 focus:border-wechat-green transition-colors"
            />
          </div>
        </div>

        {/* Public toggle */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100">
          <span className="text-sm text-gray-700">公开（好友可申请复制）</span>
          <button
            onClick={() => setIsPublic(!isPublic)}
            className={`relative w-12 h-6 rounded-full transition-colors ${isPublic ? 'bg-wechat-green' : 'bg-gray-300'}`}
          >
            <span
              className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isPublic ? 'translate-x-6' : 'translate-x-0.5'}`}
            />
          </button>
        </div>

        {/* System prompt */}
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600 font-medium">角色描述</p>
            <button
              onClick={handleOptimize}
              disabled={optimizing || !prompt.trim()}
              className="text-xs text-wechat-green border border-wechat-green rounded-full px-3 py-1 disabled:opacity-40 active:bg-wechat-green/10"
            >
              {optimizing ? '优化中...' : '✨ 优化 Prompt'}
            </button>
          </div>

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="描述你的Bot角色，例如：她叫小雨，是个爱聊天的女生，喜欢用emoji，性格活泼，只有被点名或者话题有趣时才会回应..."
            className="w-full min-h-[200px] p-3 text-sm text-gray-800 placeholder-gray-400 bg-gray-50 rounded-xl border border-gray-200 focus:border-wechat-green resize-none transition-colors"
          />

          <p className="text-[11px] text-gray-400 mt-1.5">
            不填则Bot不会说话 · 点「优化 Prompt」让AI帮你规范化
          </p>
        </div>

        {/* AI Refine input - only shows if prompt has content */}
        {prompt.trim() && (
          <div className="px-4 pb-4">
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
              <p className="text-xs text-gray-500 mb-2">告诉AI你想改哪里：</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={refineInstruction}
                  onChange={(e) => setRefineInstruction(e.target.value)}
                  placeholder="例如：把语气改得更活泼一些"
                  className="flex-1 text-sm text-gray-800 placeholder-gray-400 bg-white rounded-lg px-3 py-2 border border-gray-200 focus:border-wechat-green"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRefine();
                  }}
                />
                <button
                  onClick={handleRefine}
                  disabled={refining || !refineInstruction.trim()}
                  className="px-3 py-2 bg-wechat-green text-white text-xs rounded-lg disabled:opacity-50"
                >
                  {refining ? '...' : 'AI改'}
                </button>
              </div>
            </div>
          </div>
        )}

        {error && (
          <p className="px-4 pb-4 text-red-500 text-sm">{error}</p>
        )}
      </div>
    </div>
  );
}
