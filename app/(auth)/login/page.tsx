'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;

    setLoading(true);
    setError('');

    try {
      const supabase = createClient();
      const email = `${username.trim().toLowerCase()}@chatapp.local`;

      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError('用户名或密码错误');
        return;
      }

      router.push('/chats');
      router.refresh();
    } catch {
      setError('登录失败，请重试');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-wechat-bg flex flex-col">
      {/* Status bar spacer */}
      <div className="pt-safe" />

      <div className="flex-1 flex flex-col items-center justify-center px-8">
        {/* Logo */}
        <div className="mb-12 flex flex-col items-center gap-3">
          <div className="w-20 h-20 bg-wechat-green rounded-2xl flex items-center justify-center shadow-lg">
            <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
              <path
                d="M18 8C12.477 8 8 11.99 8 17c0 2.67 1.25 5.06 3.25 6.75L10 28l4.75-1.75C15.97 26.72 17 26.9 18 27c5.523 0 10-3.99 10-9s-4.477-10-10-10z"
                fill="white"
                opacity="0.9"
              />
              <path
                d="M26 20c0-4.5 4.03-8 9-8s9 3.5 9 8c0 2.25-1 4.28-2.72 5.72l.97 3.78-4.03-1.5c-.77.17-1.55.25-2.22.25-4.97 0-9-3.5-9-8z"
                fill="white"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-gray-800">Chat App</h1>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4">
          <div className="bg-white rounded-xl overflow-hidden shadow-sm">
            <div className="flex items-center px-4 py-3.5 border-b border-gray-100">
              <span className="text-gray-500 text-sm w-16 shrink-0">账号</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="请输入用户名"
                autoComplete="username"
                autoCapitalize="none"
                className="flex-1 text-sm text-gray-800 placeholder-gray-400 bg-transparent"
              />
            </div>
            <div className="flex items-center px-4 py-3.5">
              <span className="text-gray-500 text-sm w-16 shrink-0">密码</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                autoComplete="current-password"
                className="flex-1 text-sm text-gray-800 placeholder-gray-400 bg-transparent"
              />
            </div>
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !username.trim() || !password.trim()}
            className="w-full py-3.5 bg-wechat-green text-white font-medium rounded-xl text-sm disabled:opacity-50 active:bg-wechat-green-dark transition-colors"
          >
            {loading ? '登录中...' : '登录'}
          </button>
        </form>

        <Link
          href="/register"
          className="mt-6 text-sm text-wechat-green"
        >
          注册账号
        </Link>
      </div>

      <div className="pb-safe" />
    </div>
  );
}
