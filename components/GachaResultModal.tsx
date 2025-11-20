'use client';

import { useState, useEffect } from 'react';
import Modal from './Modal';
import { GachaResult, GachaConfig } from '@/types/gacha';

interface GachaResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: GachaResult | null;
  gachaConfig: GachaConfig | null;
  remainingCount: number;
  loginDaysIncreased?: number | null;
}

export default function GachaResultModal({
  isOpen,
  onClose,
  result,
  gachaConfig,
  remainingCount,
  loginDaysIncreased,
}: GachaResultModalProps) {
  const [showAnimation, setShowAnimation] = useState(false);

  useEffect(() => {
    if (isOpen && result) {
      setShowAnimation(true);
      const timer = setTimeout(() => setShowAnimation(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, result]);

  if (!result || !gachaConfig) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="text-center space-y-6">
        {/* 演出アニメーション */}
        {showAnimation && (
          <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-gray-800 z-10">
            <div className="text-6xl animate-spin">🎰</div>
          </div>
        )}

        {/* 結果表示 */}
        <div className={`transition-all duration-500 ${showAnimation ? 'opacity-0' : 'opacity-100'}`}>
          {/* ログイン日数増加の表示 */}
          {loginDaysIncreased !== null && (
            <div className="mb-6 p-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg text-white animate-pulse">
              <div className="text-5xl mb-2">🎊</div>
              <h3 className="text-2xl font-bold mb-1">連続ログイン日数が増えました！</h3>
              <p className="text-4xl font-bold">
                {loginDaysIncreased} 日
              </p>
            </div>
          )}
          
          <div className="mb-6">
            <div className="text-4xl mb-2">🎉</div>
            <h2 className="text-3xl font-bold mb-2">{result.itemName}</h2>
            <p className="text-gray-600 dark:text-gray-400">
              出現確率: {result.itemProbability}%
            </p>
            {result.isBonus && (
              <p className="mt-2 text-yellow-600 dark:text-yellow-400 font-semibold">
                ⭐ ログインボーナス適用中 ⭐
              </p>
            )}
          </div>

          {/* 排出率一覧 */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold mb-3">排出率一覧</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {gachaConfig.items.map((item, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-900 rounded"
                >
                  <span>{item.name}</span>
                  <span className="font-semibold">{item.probability}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* 残り回数 */}
          <div className="border-t pt-4">
            <p className="text-lg">
              今日あと <span className="font-bold text-blue-600 dark:text-blue-400">{remainingCount}</span> 回回すことができます
            </p>
          </div>

          <button
            onClick={onClose}
            className="mt-6 px-8 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
          >
            閉じる
          </button>
        </div>
      </div>
    </Modal>
  );
}

