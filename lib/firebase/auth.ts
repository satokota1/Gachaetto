// Firebase認証関連のユーティリティ

import { 
  signInWithEmailAndPassword,
  signOut, 
  User,
  onAuthStateChanged 
} from 'firebase/auth';
import { auth, initializeFirebase, db } from './config';
import { collection, query, where, getDocs } from 'firebase/firestore';

// 4桁のパスワードを6文字以上に変換（Firebaseの最小要件を満たすため）
// 4桁の数字の場合、末尾に"00"を追加して6文字にする
const normalizePassword = (password: string): string => {
  // 4桁の数字のみの場合、末尾に"00"を追加
  if (/^\d{4}$/.test(password)) {
    return password + '00';
  }
  // それ以外はそのまま返す
  return password;
};

// ユーザー名とパスワードでログイン
export const signInWithUsername = async (username: string, password: string): Promise<User> => {
  // 初期化を試みる
  const { auth: authInstance, db: dbInstance } = initializeFirebase();
  if (!authInstance || !dbInstance) {
    throw new Error('Firebase is not initialized. Please check your environment variables.');
  }

  // Firestoreからユーザー名でメールアドレスを取得
  const usernameMappingsRef = collection(dbInstance, 'usernameMappings');
  const q = query(usernameMappingsRef, where('username', '==', username.toLowerCase().trim()));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    throw new Error('ユーザー名またはパスワードが正しくありません');
  }

  const userData = querySnapshot.docs[0].data();
  const email = userData.email;

  // パスワードを正規化（4桁の場合は6文字以上に変換）
  const normalizedPassword = normalizePassword(password);

  // メールアドレスとパスワードでFirebase Authenticationにログイン
  const result = await signInWithEmailAndPassword(authInstance, email, normalizedPassword);
  return result.user;
};

// メールアドレスとパスワードでログイン（後方互換性のため残す）
export const signInWithEmail = async (email: string, password: string): Promise<User> => {
  // 初期化を試みる
  const { auth: authInstance } = initializeFirebase();
  if (!authInstance) {
    throw new Error('Firebase is not initialized. Please check your environment variables.');
  }
  const result = await signInWithEmailAndPassword(authInstance, email, password);
  return result.user;
};

// ログアウト
export const logout = async (): Promise<void> => {
  // 初期化を試みる
  const { auth: authInstance } = initializeFirebase();
  if (!authInstance) {
    throw new Error('Firebase is not initialized. Please check your environment variables.');
  }
  await signOut(authInstance);
};

// 認証状態の監視
export const onAuthChange = (callback: (user: User | null) => void) => {
  // 初期化を試みる
  const { auth: authInstance } = initializeFirebase();
  if (!authInstance) {
    throw new Error('Firebase is not initialized. Please check your environment variables.');
  }
  return onAuthStateChanged(authInstance, callback);
};

