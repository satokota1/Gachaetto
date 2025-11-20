// Firebase認証関連のユーティリティ

import { 
  signInWithPopup, 
  signOut, 
  GoogleAuthProvider,
  User,
  onAuthStateChanged 
} from 'firebase/auth';
import { auth, initializeFirebase } from './config';

// Google認証でログイン
export const signInWithGoogle = async (): Promise<User> => {
  // 初期化を試みる
  const { auth: authInstance } = initializeFirebase();
  if (!authInstance) {
    throw new Error('Firebase is not initialized. Please check your environment variables.');
  }
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(authInstance, provider);
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

