// Firebase認証関連のユーティリティ

import { 
  signInWithEmailAndPassword,
  signOut, 
  User,
  onAuthStateChanged 
} from 'firebase/auth';
import { auth, initializeFirebase } from './config';

// メールアドレスとパスワードでログイン
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

