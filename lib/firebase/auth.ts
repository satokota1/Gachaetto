// Firebase認証関連のユーティリティ

import { 
  signInWithPopup, 
  signOut, 
  GoogleAuthProvider,
  User,
  onAuthStateChanged 
} from 'firebase/auth';
import { auth } from './config';

// Google認証でログイン
export const signInWithGoogle = async (): Promise<User> => {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  return result.user;
};

// ログアウト
export const logout = async (): Promise<void> => {
  await signOut(auth);
};

// 認証状態の監視
export const onAuthChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

