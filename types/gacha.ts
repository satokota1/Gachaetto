// ガチャ関連の型定義

export interface GachaItem {
  id: string;
  name: string;
  probability: number; // 0-100のパーセンテージ
}

export interface GachaConfig {
  id?: string;
  title: string;
  items: GachaItem[];
  dailyLimit: number; // 1日に回せる回数
  createdAt?: Date;
  updatedAt?: Date;
  userId?: string; // ログインユーザーのID
}

export interface LoginBonusConfig {
  requiredDays: number; // 必要なログイン日数
  bonusGachaName: string;
  bonusItems: GachaItem[]; // ボーナス時の確率変更
  bonusDailyLimit?: number; // ボーナス時の回数増加（オプション）
}

export interface GachaResult {
  id: string;
  gachaConfigId?: string;
  itemName: string;
  itemProbability: number;
  timestamp: Date;
  userId?: string; // ログインユーザーのID
  isBonus?: boolean; // ログインボーナスかどうか
}

export interface UserGachaData {
  userId: string;
  gachaConfig?: GachaConfig;
  loginBonusConfig?: LoginBonusConfig;
  consecutiveLoginDays: number; // 連続ログイン日数
  lastLoginDate: Date;
  todayGachaCount: number; // 今日回した回数
  lastGachaDate: Date; // 最後にガチャを回した日
}

