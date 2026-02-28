'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    username: '',
    displayName: '',
    password: '',
    confirm: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function update(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const { username, displayName, password, confirm } = form;
    if (!username.trim() || !password.trim() || !displayName.trim()) {
      setError('请填写所有必填项');
      return;
    }
    if (!/^[a-z0-9_]{3,20}$/.test(username.trim())) {
      setError('用户名只能包含小写字母、数字和下划线，3-20位');
      return;
    }
    if (password.length < 6) {
      setError('密码至少6位');
      return;
    }
    if (password !== confirm) {
      setError('两次密码不一致');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim().toLowerCase(),
          displayName: displayName.trim(),
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? '注册失败');
        return;
      }

      // Sign in after successful registration
      const supabase = createClient();
      const email = `${username.trim().toLowerCase()}@chatapp.local`;
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError('注册成功，请前往登录页登录');
        router.push('/login');
        return;
      }

      router.push('/chats');
      router.refresh();
    } catch {
      setError('注册失败，请重试');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-wechat-bg flex flex-col">
      <div className="pt-safe" />

      {/* Header */}
      <div className="flex items-center px-4 py-3">
        <Link href="/login" className="text-wechat-green text-sm flex items-center gap-1">
          <svg width="7" height="12" viewBox="0 0 7 12" fill="currentColor">
            <path d="M6 1L1 6l5 5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          返回
        </Link>
        <h1 className="flex-1 text-center text-base font-semibold text-gray-800 -mr-10">注册</h1>
      </div>

      <div className="flex-1 px-6 py-4">
        <form onSubmit={handleRegister} className="space-y-4">
          <div className="bg-white rounded-xl overflow-hidden shadow-sm">
            {[
              { label: '用户名', key: 'username', type: 'text', placeholder: '3-20位，字母/数字/下划线', autocomplete: 'username' },
              { label: '昵称', key: 'displayName', type: 'text', placeholder: '你的显示名称', autocomplete: 'name' },
              { label: '密码', key: 'password', type: 'password', placeholder: '至少6位', autocomplete: 'new-password' },
              { label: '确认密码', key: 'confirm', type: 'password', placeholder: '再次输入密码', autocomplete: 'new-password' },
            ].map((field, idx, arr) => (
              <div
                key={field.key}
                className={`flex items-center px-4 py-3.5 ${idx < arr.length - 1 ? 'border-b border-gray-100' : ''}`}
              >
                <span className="text-gray-500 text-sm w-20 shrink-0">{field.label}</span>
                <input
                  type={field.type}
                  value={form[field.key as keyof typeof form]}
                  onChange={(e) => update(field.key as keyof typeof form, e.target.value)}
                  placeholder={field.placeholder}
                  autoComplete={field.autocomplete}
                  autoCapitalize="none"
                  className="flex-1 text-sm text-gray-800 placeholder-gray-400 bg-transparent"
                />
              </div>
            ))}
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-wechat-green text-white font-medium rounded-xl text-sm disabled:opacity-50 active:bg-wechat-green-dark transition-colors"
          >
            {loading ? '注册中...' : '注册'}
          </button>
        </form>
      </div>

      <div className="pb-safe" />
    </div>
  );
}
