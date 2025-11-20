'use client';

import { useState } from 'react';
import { User } from 'firebase/auth';
import { signInWithUsername, logout } from '@/lib/firebase/auth';

interface HeaderProps {
  user: User | null;
  onAuthChange: (user: User | null) => void;
}

export default function Header({ user, onAuthChange }: HeaderProps) {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (!username.trim() || !password.trim()) {
        setError('ユーザー名とパスワードを入力してください');
        setIsLoading(false);
        return;
      }

      const user = await signInWithUsername(username.trim(), password);
      onAuthChange(user);
      setIsLoginModalOpen(false);
      setUsername('');
      setPassword('');
    } catch (error: any) {
      console.error('ログインエラー:', error);
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.message === 'ユーザー名またはパスワードが正しくありません') {
        setError('ユーザー名またはパスワードが正しくありません');
      } else {
        setError('ログインに失敗しました');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      onAuthChange(null);
    } catch (error) {
      console.error('ログアウトエラー:', error);
    }
  };

  return (
    <>
      <header className="w-full flex justify-end p-4">
        {user ? (
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {user.email}
            </span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition"
            >
              ログアウト
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsLoginModalOpen(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
          >
            ログイン
          </button>
        )}
      </header>

      {/* ログインモーダル */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">ログイン</h2>
              <button
                onClick={() => {
                  setIsLoginModalOpen(false);
                  setUsername('');
                  setPassword('');
                  setError('');
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  ユーザー名
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  placeholder="ユーザー名"
                  required
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  パスワード
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  placeholder="パスワード"
                  required
                  disabled={isLoading}
                />
              </div>

              {error && (
                <div className="p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setIsLoginModalOpen(false);
                    setEmail('');
                    setPassword('');
                    setError('');
                  }}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                  disabled={isLoading}
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isLoading}
                >
                  {isLoading ? 'ログイン中...' : 'ログイン'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

