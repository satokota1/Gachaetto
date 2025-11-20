// Firestoreでのガチャデータ操作

import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  Timestamp,
  addDoc,
  updateDoc
} from 'firebase/firestore';
import { db } from './config';
import { GachaConfig, GachaResult, UserGachaData, LoginBonusConfig } from '@/types/gacha';

// ユーザーのガチャ設定を保存
export const saveGachaConfig = async (
  userId: string, 
  config: GachaConfig
): Promise<string> => {
  const userGachaRef = doc(db, 'userGachaData', userId);
  const userData = await getDoc(userGachaRef);
  
  const data: Partial<UserGachaData> = {
    userId,
    gachaConfig: {
      ...config,
      userId,
      updatedAt: new Date(),
    },
  };

  if (userData.exists()) {
    await updateDoc(userGachaRef, data);
  } else {
    await setDoc(userGachaRef, {
      ...data,
      consecutiveLoginDays: 0,
      lastLoginDate: Timestamp.now(),
      todayGachaCount: 0,
      lastGachaDate: Timestamp.now(),
    });
  }

  return userId;
};

// ユーザーのログインボーナス設定を保存
export const saveLoginBonusConfig = async (
  userId: string,
  loginBonusConfig: LoginBonusConfig
): Promise<void> => {
  const userGachaRef = doc(db, 'userGachaData', userId);
  await updateDoc(userGachaRef, {
    loginBonusConfig,
  });
};

// ユーザーのガチャ設定を取得
export const getUserGachaData = async (userId: string): Promise<UserGachaData | null> => {
  const userGachaRef = doc(db, 'userGachaData', userId);
  const docSnap = await getDoc(userGachaRef);
  
  if (!docSnap.exists()) {
    return null;
  }

  const data = docSnap.data();
  return {
    ...data,
    lastLoginDate: data.lastLoginDate?.toDate() || new Date(),
    lastGachaDate: data.lastGachaDate?.toDate() || new Date(),
  } as UserGachaData;
};

// ガチャ結果を保存
export const saveGachaResult = async (
  userId: string,
  result: Omit<GachaResult, 'id' | 'timestamp'>
): Promise<string> => {
  const resultsRef = collection(db, 'gachaResults');
  const docRef = await addDoc(resultsRef, {
    ...result,
    userId,
    timestamp: Timestamp.now(),
  });
  return docRef.id;
};

// ユーザーのガチャ履歴を取得
export const getUserGachaHistory = async (
  userId: string,
  limit: number = 50
): Promise<GachaResult[]> => {
  const resultsRef = collection(db, 'gachaResults');
  const q = query(
    resultsRef,
    where('userId', '==', userId),
    orderBy('timestamp', 'desc')
  );
  
  const querySnapshot = await getDocs(q);
  const results: GachaResult[] = [];
  
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    results.push({
      id: doc.id,
      ...data,
      timestamp: data.timestamp.toDate(),
    } as GachaResult);
  });

  return results.slice(0, limit);
};

// 連続ログイン日数を更新
export const updateConsecutiveLoginDays = async (userId: string): Promise<number> => {
  const userGachaRef = doc(db, 'userGachaData', userId);
  const userData = await getUserGachaData(userId);
  
  if (!userData) {
    // 新規ユーザーの場合、初期データを作成
    await setDoc(userGachaRef, {
      userId,
      consecutiveLoginDays: 1,
      lastLoginDate: Timestamp.now(),
      todayGachaCount: 0,
      lastGachaDate: Timestamp.now(),
    });
    return 1;
  }

  const today = new Date();
  const lastLogin = userData.lastLoginDate;
  const daysDiff = Math.floor((today.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24));

  let consecutiveDays = userData.consecutiveLoginDays;

  if (daysDiff === 0) {
    // 今日既にログイン済み
    consecutiveDays = userData.consecutiveLoginDays;
  } else if (daysDiff === 1) {
    // 連続ログイン
    consecutiveDays = userData.consecutiveLoginDays + 1;
  } else {
    // 連続が途切れた
    consecutiveDays = 1;
  }

  await updateDoc(userGachaRef, {
    consecutiveLoginDays: consecutiveDays,
    lastLoginDate: Timestamp.now(),
  });

  return consecutiveDays;
};

// 今日のガチャ回数を更新
export const updateTodayGachaCount = async (userId: string): Promise<number> => {
  const userGachaRef = doc(db, 'userGachaData', userId);
  const userData = await getUserGachaData(userId);
  
  if (!userData) {
    return 0;
  }

  const today = new Date();
  const lastGachaDate = userData.lastGachaDate;
  const isSameDay = today.toDateString() === lastGachaDate.toDateString();

  let todayCount = isSameDay ? userData.todayGachaCount + 1 : 1;

  await updateDoc(userGachaRef, {
    todayGachaCount: todayCount,
    lastGachaDate: Timestamp.now(),
  });

  return todayCount;
};

