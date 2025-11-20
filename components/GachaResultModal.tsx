'use client';

import { useState, useEffect } from 'react';
import Modal from './Modal';
import { GachaResult, GachaConfig, LoginBonusConfig } from '@/types/gacha';

interface GachaResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: GachaResult | null;
  gachaConfig: GachaConfig | null;
  remainingCount: number;
  loginDaysIncreased?: number | null;
  loginBonusConfig?: LoginBonusConfig | null;
}

export default function GachaResultModal({
  isOpen,
  onClose,
  result,
  gachaConfig,
  remainingCount,
  loginDaysIncreased,
  loginBonusConfig,
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
            <h3 className="text-lg font-semibold mb-3">
              {result.isBonus && loginBonusConfig ? '排出率一覧（初期設定 vs ボーナス時）' : '排出率一覧'}
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {result.isBonus && loginBonusConfig ? (
                // ボーナス適用時：比較表示
                (() => {
                  const originalItems = gachaConfig.items;
                  const bonusItems = loginBonusConfig.bonusItems;
                  
                  // 全てのアイテムを収集（初期設定とボーナス設定の両方）
                  const allItemNames = new Set<string>();
                  originalItems.forEach(item => allItemNames.add(item.name));
                  bonusItems.forEach(item => allItemNames.add(item.name));
                  
                  return Array.from(allItemNames).map((itemName, index) => {
                    const originalItem = originalItems.find(item => item.name === itemName);
                    const bonusItem = bonusItems.find(item => item.name === itemName);
                    
                    // 初期設定にのみ存在（削除された）
                    if (originalItem && !bonusItem) {
                      return (
                        <div
                          key={index}
                          className="flex justify-between items-center p-2 bg-gray-100 dark:bg-gray-800 rounded border border-red-300 dark:border-red-700"
                        >
                          <span className="line-through text-gray-400 dark:text-gray-500">{itemName}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-400 dark:text-gray-500 line-through">{originalItem.probability}%</span>
                            <span className="text-xs text-red-600 dark:text-red-400">削除</span>
                          </div>
                        </div>
                      );
                    }
                    
                    // ボーナス設定にのみ存在（新規追加）
                    if (!originalItem && bonusItem) {
                      return (
                        <div
                          key={index}
                          className="flex justify-between items-center p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-300 dark:border-green-700"
                        >
                          <span className="font-semibold">{itemName}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-400 dark:text-gray-500">-</span>
                            <span className="font-semibold text-green-600 dark:text-green-400">{bonusItem.probability}%</span>
                            <span className="text-xs text-green-600 dark:text-green-400">新規</span>
                          </div>
                        </div>
                      );
                    }
                    
                    // 両方に存在（比較）
                    if (originalItem && bonusItem) {
                      const isIncreased = bonusItem.probability > originalItem.probability;
                      const isDecreased = bonusItem.probability < originalItem.probability;
                      
                      return (
                        <div
                          key={index}
                          className={`flex justify-between items-center p-2 rounded border ${
                            isIncreased
                              ? 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700'
                              : isDecreased
                              ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
                              : 'bg-gray-50 dark:bg-gray-900'
                          }`}
                        >
                          <span className={isIncreased ? 'font-bold' : ''}>{itemName}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500 dark:text-gray-400">{originalItem.probability}%</span>
                            <span className="text-gray-400">→</span>
                            <span className={`font-semibold ${
                              isIncreased
                                ? 'text-yellow-600 dark:text-yellow-400 text-lg'
                                : isDecreased
                                ? 'text-red-600 dark:text-red-400'
                                : ''
                            }`}>
                              {bonusItem.probability}%
                            </span>
                            {isIncreased && (
                              <span className="text-xs bg-yellow-400 dark:bg-yellow-600 text-yellow-900 dark:text-yellow-100 px-2 py-0.5 rounded font-bold animate-pulse">
                                確変！
                              </span>
                            )}
                            {isDecreased && (
                              <span className="text-xs text-red-600 dark:text-red-400">減少</span>
                            )}
                          </div>
                        </div>
                      );
                    }
                    
                    return null;
                  });
                })()
              ) : (
                // 通常時：通常表示
                gachaConfig.items.map((item, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-900 rounded"
                  >
                    <span>{item.name}</span>
                    <span className="font-semibold">{item.probability}%</span>
                  </div>
                ))
              )}
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

