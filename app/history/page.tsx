'use client';

import { useState, useEffect } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { GachaResult } from '@/types/gacha';
import { getUserGachaHistory } from '@/lib/firebase/gacha';
import { getGachaHistoryFromStorage } from '@/lib/storage';
import Link from 'next/link';

export default function HistoryPage() {
  const [user, setUser] = useState<User | null>(null);
  const [history, setHistory] = useState<GachaResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      setLoading(true);

      if (user) {
        // ログインユーザーはDBから取得
        const results = await getUserGachaHistory(user.uid);
        setHistory(results);
      } else {
        // 非ログインユーザーはストレージから取得
        const results = getGachaHistoryFromStorage();
        setHistory(results);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold">ガチャ履歴</h1>
          <Link
            href="/"
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
          >
            トップに戻る
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p>読み込み中...</p>
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">
              まだガチャを回していません
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((result) => (
              <div
                key={result.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold">{result.itemName}</h3>
                      {result.isBonus && (
                        <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded text-sm font-semibold">
                          ⭐ ボーナス
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      <p>出現確率: {result.itemProbability}%</p>
                      <p>実行日時: {formatDate(result.timestamp)}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!user && (
          <div className="mt-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              💡 ログインすると、ガチャ履歴がクラウドに保存され、どのデバイスからでもアクセスできます。
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

