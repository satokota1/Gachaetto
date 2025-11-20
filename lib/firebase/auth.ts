// Firebase認証関連のユーティリティ

import { 
  signInWithEmailAndPassword,
  signOut, 
  User,
  onAuthStateChanged 
} from 'firebase/auth';
import { auth, initializeFirebase, db } from './config';
import { collection, query, where, getDocs } from 'firebase/firestore';

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

  // メールアドレスとパスワードでFirebase Authenticationにログイン
  const result = await signInWithEmailAndPassword(authInstance, email, password);
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

