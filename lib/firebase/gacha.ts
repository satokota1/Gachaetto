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
import { db, initializeFirebase } from './config';
import { GachaConfig, GachaResult, UserGachaData, LoginBonusConfig } from '@/types/gacha';

// dbが初期化されているかチェック
const ensureDb = () => {
  // 初期化を試みる
  const { db: dbInstance } = initializeFirebase();
  if (!dbInstance) {
    throw new Error('Firebase is not initialized. Please check your environment variables.');
  }
  return dbInstance;
};

// ユーザーのガチャ設定を保存
export const saveGachaConfig = async (
  userId: string, 
  config: GachaConfig
): Promise<string> => {
  const firestoreDb = ensureDb();
  const userGachaRef = doc(firestoreDb, 'userGachaData', userId);
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
  const firestoreDb = ensureDb();
  const userGachaRef = doc(firestoreDb, 'userGachaData', userId);
  
  // undefinedのフィールドを除外してFirestoreに保存
  const configToSave: any = {
    requiredDays: loginBonusConfig.requiredDays,
    bonusGachaName: loginBonusConfig.bonusGachaName,
    bonusItems: loginBonusConfig.bonusItems,
  };
  
  // bonusDailyLimitがundefinedでない場合のみ追加
  if (loginBonusConfig.bonusDailyLimit !== undefined) {
    configToSave.bonusDailyLimit = loginBonusConfig.bonusDailyLimit;
  }
  
  await updateDoc(userGachaRef, {
    loginBonusConfig: configToSave,
  });
};

// ユーザーのガチャ設定を取得
export const getUserGachaData = async (userId: string): Promise<UserGachaData | null> => {
  const firestoreDb = ensureDb();
  const userGachaRef = doc(firestoreDb, 'userGachaData', userId);
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
  const firestoreDb = ensureDb();
  const resultsRef = collection(firestoreDb, 'gachaResults');
  
  // undefinedのフィールドを除外してFirestoreに保存
  const dataToSave: Record<string, any> = {
    itemName: result.itemName,
    itemProbability: result.itemProbability,
    userId,
    timestamp: Timestamp.now(),
  };
  
  // オプショナルフィールドは値がある場合のみ追加
  if (result.gachaConfigId) {
    dataToSave.gachaConfigId = result.gachaConfigId;
  }
  if (result.isBonus !== undefined) {
    dataToSave.isBonus = result.isBonus;
  }
  
  const docRef = await addDoc(resultsRef, dataToSave);
  return docRef.id;
};

// ユーザーのガチャ履歴を取得
export const getUserGachaHistory = async (
  userId: string,
  limit: number = 50
): Promise<GachaResult[]> => {
  const firestoreDb = ensureDb();
  const resultsRef = collection(firestoreDb, 'gachaResults');
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
  const firestoreDb = ensureDb();
  const userGachaRef = doc(firestoreDb, 'userGachaData', userId);
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
  const firestoreDb = ensureDb();
  const userGachaRef = doc(firestoreDb, 'userGachaData', userId);
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

// 共有設定を保存して短いIDを返す
export const saveSharedConfig = async (
  config: GachaConfig,
  bonusConfig?: LoginBonusConfig | null
): Promise<string> => {
  const firestoreDb = ensureDb();
  const sharedConfigsRef = collection(firestoreDb, 'sharedConfigs');
  
  const dataToSave: any = {
    gachaConfig: {
      title: config.title,
      items: config.items.map(item => ({
        name: item.name,
        probability: item.probability,
      })),
      dailyLimit: config.dailyLimit,
    },
    createdAt: Timestamp.now(),
  };
  
  if (bonusConfig) {
    dataToSave.bonusConfig = {
      requiredDays: bonusConfig.requiredDays,
      bonusGachaName: bonusConfig.bonusGachaName,
      bonusItems: bonusConfig.bonusItems.map(item => ({
        name: item.name,
        probability: item.probability,
      })),
      bonusDailyLimit: bonusConfig.bonusDailyLimit,
    };
  }
  
  const docRef = await addDoc(sharedConfigsRef, dataToSave);
  return docRef.id;
};

// 共有設定をIDから取得
export const getSharedConfig = async (shareId: string): Promise<{ config: GachaConfig | null; bonusConfig: LoginBonusConfig | null }> => {
  const firestoreDb = ensureDb();
  const sharedConfigRef = doc(firestoreDb, 'sharedConfigs', shareId);
  const docSnap = await getDoc(sharedConfigRef);
  
  if (!docSnap.exists()) {
    return { config: null, bonusConfig: null };
  }
  
  const data = docSnap.data();
  const itemsWithIds = data.gachaConfig.items.map((item: any, index: number) => ({
    id: (index + 1).toString(),
    name: item.name || '',
    probability: item.probability || 0,
  }));
  
  const config: GachaConfig = {
    title: data.gachaConfig.title,
    items: itemsWithIds,
    dailyLimit: data.gachaConfig.dailyLimit,
  };
  
  let bonusConfig: LoginBonusConfig | null = null;
  if (data.bonusConfig) {
    const bonusItemsWithIds = data.bonusConfig.bonusItems.map((item: any, index: number) => ({
      id: (index + 1).toString(),
      name: item.name || '',
      probability: item.probability || 0,
    }));
    
    bonusConfig = {
      requiredDays: data.bonusConfig.requiredDays,
      bonusGachaName: data.bonusConfig.bonusGachaName,
      bonusItems: bonusItemsWithIds,
      bonusDailyLimit: data.bonusConfig.bonusDailyLimit,
    };
  }
  
  return { config, bonusConfig };
};

