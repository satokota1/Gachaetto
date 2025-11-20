// ガチャ実行ロジック

import { GachaItem, GachaConfig, GachaResult, LoginBonusConfig } from '@/types/gacha';

// ガチャを実行して結果を返す
export const executeGacha = (
  config: GachaConfig,
  loginBonusConfig?: LoginBonusConfig,
  isBonusDay?: boolean
): GachaResult => {
  // ログインボーナス日で、ボーナス設定がある場合はそれを使用
  const items = (isBonusDay && loginBonusConfig?.bonusItems) 
    ? loginBonusConfig.bonusItems 
    : config.items;

  // 確率に基づいて抽選
  const random = Math.random() * 100;
  let cumulativeProbability = 0;
  let selectedItem: GachaItem | null = null;

  for (const item of items) {
    cumulativeProbability += item.probability;
    if (random <= cumulativeProbability) {
      selectedItem = item;
      break;
    }
  }

  // フォールバック（確率の合計が100%でない場合）
  if (!selectedItem && items.length > 0) {
    selectedItem = items[items.length - 1];
  }

  const result: GachaResult = {
    id: Date.now().toString(),
    gachaConfigId: config.id,
    itemName: selectedItem?.name || '不明',
    itemProbability: selectedItem?.probability || 0,
    timestamp: new Date(),
    isBonus: isBonusDay && !!loginBonusConfig,
  };

  return result;
};

// 確率の合計が100%かチェック
export const validateProbabilities = (items: GachaItem[]): boolean => {
  const total = items.reduce((sum, item) => sum + item.probability, 0);
  return Math.abs(total - 100) < 0.01; // 浮動小数点誤差を考慮
};

