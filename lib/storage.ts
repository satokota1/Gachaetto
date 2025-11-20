// セッションストレージ（非ログインユーザー用）の管理

import { GachaConfig, GachaResult, LoginBonusConfig } from '@/types/gacha';

const STORAGE_KEYS = {
  GACHA_CONFIG: 'gachaetto_gacha_config',
  GACHA_RESULTS: 'gachaetto_gacha_results',
  LOGIN_BONUS_CONFIG: 'gachaetto_login_bonus_config',
  TODAY_GACHA_COUNT: 'gachaetto_today_gacha_count',
  LAST_GACHA_DATE: 'gachaetto_last_gacha_date',
} as const;

// ガチャ設定を保存
export const saveGachaConfigToStorage = (config: GachaConfig): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.GACHA_CONFIG, JSON.stringify(config));
  }
};

// ガチャ設定を取得
export const getGachaConfigFromStorage = (): GachaConfig | null => {
  if (typeof window === 'undefined') return null;
  
  const stored = localStorage.getItem(STORAGE_KEYS.GACHA_CONFIG);
  if (!stored) return null;

  try {
    const config = JSON.parse(stored);
    return {
      ...config,
      items: config.items || [],
    };
  } catch {
    return null;
  }
};

// ログインボーナス設定を保存
export const saveLoginBonusConfigToStorage = (config: LoginBonusConfig): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.LOGIN_BONUS_CONFIG, JSON.stringify(config));
  }
};

// ログインボーナス設定を取得
export const getLoginBonusConfigFromStorage = (): LoginBonusConfig | null => {
  if (typeof window === 'undefined') return null;
  
  const stored = localStorage.getItem(STORAGE_KEYS.LOGIN_BONUS_CONFIG);
  if (!stored) return null;

  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
};

// ガチャ結果を保存
export const saveGachaResultToStorage = (result: GachaResult): void => {
  if (typeof window === 'undefined') return;
  
  const results = getGachaHistoryFromStorage();
  results.unshift(result);
  // 最新50件のみ保持
  const limitedResults = results.slice(0, 50);
  localStorage.setItem(STORAGE_KEYS.GACHA_RESULTS, JSON.stringify(limitedResults));
};

// ガチャ履歴を取得
export const getGachaHistoryFromStorage = (): GachaResult[] => {
  if (typeof window === 'undefined') return [];
  
  const stored = localStorage.getItem(STORAGE_KEYS.GACHA_RESULTS);
  if (!stored) return [];

  try {
    const results = JSON.parse(stored);
    return results.map((r: any) => ({
      ...r,
      timestamp: new Date(r.timestamp),
    }));
  } catch {
    return [];
  }
};

// 今日のガチャ回数を取得
export const getTodayGachaCountFromStorage = (): number => {
  if (typeof window === 'undefined') return 0;
  
  const lastDate = localStorage.getItem(STORAGE_KEYS.LAST_GACHA_DATE);
  const today = new Date().toDateString();
  
  if (lastDate !== today) {
    // 日付が変わったらリセット
    localStorage.setItem(STORAGE_KEYS.TODAY_GACHA_COUNT, '0');
    localStorage.setItem(STORAGE_KEYS.LAST_GACHA_DATE, today);
    return 0;
  }

  const count = localStorage.getItem(STORAGE_KEYS.TODAY_GACHA_COUNT);
  return count ? parseInt(count, 10) : 0;
};

// 今日のガチャ回数を更新
export const updateTodayGachaCountInStorage = (): number => {
  if (typeof window === 'undefined') return 0;
  
  const count = getTodayGachaCountFromStorage() + 1;
  localStorage.setItem(STORAGE_KEYS.TODAY_GACHA_COUNT, count.toString());
  localStorage.setItem(STORAGE_KEYS.LAST_GACHA_DATE, new Date().toDateString());
  return count;
};

