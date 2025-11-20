// Firebase設定ファイル
// このファイルはFirebase Consoleから取得した設定値で更新してください

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';

// Firebase設定オブジェクト
// 環境変数から読み込むか、直接設定してください
const getFirebaseConfig = () => ({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
});

// Firebaseアプリの初期化（既に初期化されている場合は再利用）
let app: FirebaseApp | undefined;
let db: Firestore | undefined;
let auth: Auth | undefined;

// 初期化関数
const initializeFirebase = () => {
  // 既に初期化されている場合はスキップ
  if (app) {
    return { app, db, auth };
  }

  // クライアントサイドでない場合はスキップ
  if (typeof window === 'undefined') {
    return { app: undefined, db: undefined, auth: undefined };
  }

  const firebaseConfig = getFirebaseConfig();
  
  // デバッグ用：環境変数の状態を確認（本番環境では削除推奨）
  if (typeof window !== 'undefined') {
    console.log('Firebase環境変数の状態:', {
      apiKey: firebaseConfig.apiKey ? `${firebaseConfig.apiKey.substring(0, 10)}...` : '未設定',
      authDomain: firebaseConfig.authDomain || '未設定',
      projectId: firebaseConfig.projectId || '未設定',
      storageBucket: firebaseConfig.storageBucket || '未設定',
      messagingSenderId: firebaseConfig.messagingSenderId || '未設定',
      appId: firebaseConfig.appId ? `${firebaseConfig.appId.substring(0, 20)}...` : '未設定',
    });
  }
  
  // 環境変数が設定されているかチェック
  const isFirebaseConfigured = 
    firebaseConfig.apiKey && 
    firebaseConfig.apiKey.trim() !== '' &&
    firebaseConfig.authDomain && 
    firebaseConfig.authDomain.trim() !== '' &&
    firebaseConfig.projectId &&
    firebaseConfig.projectId.trim() !== '';

  if (!isFirebaseConfigured) {
    console.warn('Firebase環境変数が設定されていません。環境変数を確認してください。', {
      apiKey: !!firebaseConfig.apiKey,
      authDomain: !!firebaseConfig.authDomain,
      projectId: !!firebaseConfig.projectId,
    });
    return { app: undefined, db: undefined, auth: undefined };
  }

  // 既に初期化されている場合は再利用
  if (getApps().length > 0) {
    app = getApps()[0];
  } else {
    app = initializeApp(firebaseConfig);
  }
  
  // FirestoreとAuthのインスタンスを取得
  db = getFirestore(app);
  auth = getAuth(app);

  return { app, db, auth };
};

// 初回初期化を試みる
if (typeof window !== 'undefined') {
  initializeFirebase();
}

// 型安全なエクスポート
// クライアントサイドで環境変数が設定されている場合のみ定義される
// 使用する側で undefined チェックが必要
export { db, auth, initializeFirebase };
export default app;

