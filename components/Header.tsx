'use client';

import { User } from 'firebase/auth';
import { signInWithGoogle, logout } from '@/lib/firebase/auth';

interface HeaderProps {
  user: User | null;
  onAuthChange: (user: User | null) => void;
}

export default function Header({ user, onAuthChange }: HeaderProps) {
  const handleLogin = async () => {
    try {
      const user = await signInWithGoogle();
      onAuthChange(user);
    } catch (error) {
      console.error('ログインエラー:', error);
      alert('ログインに失敗しました');
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
    <header className="w-full flex justify-end p-4">
      {user ? (
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {user.displayName || user.email}
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
          onClick={handleLogin}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
        >
          ログイン
        </button>
      )}
    </header>
  );
}

