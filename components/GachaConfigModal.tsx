'use client';

import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import Modal from './Modal';
import { GachaConfig, GachaItem, LoginBonusConfig } from '@/types/gacha';
import { validateProbabilities } from '@/lib/gacha';
import { saveGachaConfig, saveLoginBonusConfig } from '@/lib/firebase/gacha';
import {
  saveGachaConfigToStorage,
  saveLoginBonusConfigToStorage,
} from '@/lib/storage';

interface GachaConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: GachaConfig, bonusConfig?: LoginBonusConfig) => void;
  initialConfig?: GachaConfig | null;
  initialBonusConfig?: LoginBonusConfig | null;
  user: User | null;
}

export default function GachaConfigModal({
  isOpen,
  onClose,
  onSave,
  initialConfig,
  initialBonusConfig,
  user,
}: GachaConfigModalProps) {
  const [title, setTitle] = useState('');
  const [items, setItems] = useState<GachaItem[]>([]);
  const [dailyLimit, setDailyLimit] = useState(3);
  const [error, setError] = useState('');
  
  // ログインボーナス設定
  const [showLoginBonus, setShowLoginBonus] = useState(false);
  const [bonusRequiredDays, setBonusRequiredDays] = useState(14);
  const [bonusGachaName, setBonusGachaName] = useState('');
  const [bonusItems, setBonusItems] = useState<GachaItem[]>([]);
  const [bonusDailyLimit, setBonusDailyLimit] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (initialConfig) {
      setTitle(initialConfig.title);
      setItems([...initialConfig.items]);
      setDailyLimit(initialConfig.dailyLimit);
    } else {
      setTitle('');
      setItems([{ id: '1', name: '', probability: 0 }]);
      setDailyLimit(3);
    }

    if (initialBonusConfig) {
      setShowLoginBonus(true);
      setBonusRequiredDays(initialBonusConfig.requiredDays);
      setBonusGachaName(initialBonusConfig.bonusGachaName);
      setBonusItems([...initialBonusConfig.bonusItems]);
      setBonusDailyLimit(initialBonusConfig.bonusDailyLimit);
    } else {
      setShowLoginBonus(false);
      setBonusRequiredDays(14);
      setBonusGachaName('');
      setBonusItems([]);
      setBonusDailyLimit(undefined);
    }
  }, [initialConfig, initialBonusConfig, isOpen]);

  const addItem = () => {
    setItems([...items, { id: Date.now().toString(), name: '', probability: 0 }]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const updateItem = (id: string, field: 'name' | 'probability', value: string | number) => {
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const addBonusItem = () => {
    setBonusItems([...bonusItems, { id: Date.now().toString(), name: '', probability: 0 }]);
  };

  const removeBonusItem = (id: string) => {
    setBonusItems(bonusItems.filter((item) => item.id !== id));
  };

  const updateBonusItem = (id: string, field: 'name' | 'probability', value: string | number) => {
    setBonusItems(
      bonusItems.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const handleSave = async () => {
    setError('');

    // バリデーション
    if (!title.trim()) {
      setError('タイトルを入力してください');
      return;
    }

    if (items.length === 0) {
      setError('少なくとも1つのガチャ項目が必要です');
      return;
    }

    if (items.some((item) => !item.name.trim())) {
      setError('すべての項目名を入力してください');
      return;
    }

    if (!validateProbabilities(items)) {
      setError('確率の合計が100%になるように設定してください');
      return;
    }

    if (dailyLimit < 1) {
      setError('1日の回数は1回以上にしてください');
      return;
    }

    // ログインボーナス設定のバリデーション
    if (showLoginBonus && user) {
      if (!bonusGachaName.trim()) {
        setError('ボーナスガチャ名を入力してください');
        return;
      }

      if (bonusItems.length === 0) {
        setError('ボーナスガチャの項目を設定してください');
        return;
      }

      if (bonusItems.some((item) => !item.name.trim())) {
        setError('すべてのボーナス項目名を入力してください');
        return;
      }

      if (!validateProbabilities(bonusItems)) {
        setError('ボーナスガチャの確率の合計が100%になるように設定してください');
        return;
      }

      if (bonusRequiredDays < 1) {
        setError('必要なログイン日数は1日以上にしてください');
        return;
      }
    }

    const config: GachaConfig = {
      title,
      items,
      dailyLimit,
    };

    let bonusConfig: LoginBonusConfig | undefined;

    if (showLoginBonus && user) {
      bonusConfig = {
        requiredDays: bonusRequiredDays,
        bonusGachaName,
        bonusItems,
        bonusDailyLimit,
      };
    }

    // 保存
    if (user) {
      // ログインユーザーはDBに保存
      await saveGachaConfig(user.uid, config);
      if (bonusConfig) {
        await saveLoginBonusConfig(user.uid, bonusConfig);
      }
    } else {
      // 非ログインユーザーはストレージに保存
      saveGachaConfigToStorage(config);
      if (bonusConfig) {
        saveLoginBonusConfigToStorage(bonusConfig);
      }
    }

    onSave(config, bonusConfig);
    onClose();
  };

  const totalProbability = items.reduce((sum, item) => sum + item.probability, 0);
  const bonusTotalProbability = bonusItems.reduce((sum, item) => sum + item.probability, 0);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="ガチャ設定">
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">ガチャタイトル</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg"
            placeholder="例: ダイエットガチャ"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium">ガチャ項目</label>
            <button
              onClick={addItem}
              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
            >
              + 追加
            </button>
          </div>
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="flex gap-2 items-center">
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                  className="flex-1 px-4 py-2 border rounded-lg"
                  placeholder="項目名"
                />
                <input
                  type="number"
                  value={item.probability}
                  onChange={(e) => updateItem(item.id, 'probability', parseFloat(e.target.value) || 0)}
                  className="w-24 px-4 py-2 border rounded-lg"
                  placeholder="%"
                  min="0"
                  max="100"
                  step="0.1"
                />
                <span className="w-8 text-sm">%</span>
                {items.length > 1 && (
                  <button
                    onClick={() => removeItem(item.id)}
                    className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    削除
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="mt-2 text-sm text-gray-600">
            合計: {totalProbability.toFixed(1)}% {totalProbability === 100 ? '✓' : '⚠'}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">1日に回せる回数</label>
          <input
            type="number"
            value={dailyLimit}
            onChange={(e) => setDailyLimit(parseInt(e.target.value) || 1)}
            className="w-full px-4 py-2 border rounded-lg"
            min="1"
          />
        </div>

        {user && (
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-medium">ログインボーナス設定</label>
              <button
                onClick={() => setShowLoginBonus(!showLoginBonus)}
                className={`px-4 py-2 rounded ${
                  showLoginBonus
                    ? 'bg-gray-200 dark:bg-gray-700'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                {showLoginBonus ? '無効化' : '有効化'}
              </button>
            </div>

            {showLoginBonus && (
              <div className="space-y-4 bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    ログインボーナスまでの日数
                  </label>
                  <input
                    type="number"
                    value={bonusRequiredDays}
                    onChange={(e) => setBonusRequiredDays(parseInt(e.target.value) || 1)}
                    className="w-full px-4 py-2 border rounded-lg"
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">ボーナスガチャ名</label>
                  <input
                    type="text"
                    value={bonusGachaName}
                    onChange={(e) => setBonusGachaName(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg"
                    placeholder="例: チートデイ!!デブ率3倍!!"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium">ボーナスガチャ項目</label>
                    <button
                      onClick={addBonusItem}
                      className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                    >
                      + 追加
                    </button>
                  </div>
                  <div className="space-y-2">
                    {bonusItems.map((item) => (
                      <div key={item.id} className="flex gap-2 items-center">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => updateBonusItem(item.id, 'name', e.target.value)}
                          className="flex-1 px-4 py-2 border rounded-lg"
                          placeholder="項目名"
                        />
                        <input
                          type="number"
                          value={item.probability}
                          onChange={(e) => updateBonusItem(item.id, 'probability', parseFloat(e.target.value) || 0)}
                          className="w-24 px-4 py-2 border rounded-lg"
                          placeholder="%"
                          min="0"
                          max="100"
                          step="0.1"
                        />
                        <span className="w-8 text-sm">%</span>
                        {bonusItems.length > 1 && (
                          <button
                            onClick={() => removeBonusItem(item.id)}
                            className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                          >
                            削除
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 text-sm text-gray-600">
                    合計: {bonusTotalProbability.toFixed(1)}% {bonusTotalProbability === 100 ? '✓' : '⚠'}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    ボーナス時の回数増加（オプション）
                  </label>
                  <input
                    type="number"
                    value={bonusDailyLimit || ''}
                    onChange={(e) => setBonusDailyLimit(e.target.value ? parseInt(e.target.value) : undefined)}
                    className="w-full px-4 py-2 border rounded-lg"
                    placeholder="未設定の場合は通常の回数制限を使用"
                    min="1"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded">
            {error}
          </div>
        )}

        <div className="flex gap-4 justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            {user ? '保存' : '設定'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

