# Gachaetto - オリジナルガチャアプリ

自分だけのオリジナルガチャを作成・遊べるアプリです。

## 技術スタック

- **フロントエンド**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **データベース**: Firebase Firestore
- **認証**: Firebase Authentication
- **デプロイ**: Vercel (GitHub連携)

## セットアップ手順

### 1. Node.jsのインストール

まだインストールしていない場合は、[Node.js公式サイト](https://nodejs.org/)からLTS版をインストールしてください。

### 2. 依存関係のインストール

```bash
npm install
```

### 3. Firebaseプロジェクトの設定

1. [Firebase Console](https://console.firebase.google.com/)で新しいプロジェクトを作成
2. **Firestore Databaseを有効化**
   - 「Firestore Database」を選択
   - 「データベースを作成」をクリック
   - テストモードで開始（後でセキュリティルールを設定）
   - ロケーションを選択（推奨: asia-northeast1）
3. **Authenticationを有効化**
   - 「Authentication」を選択
   - 「始める」をクリック
   - 「Sign-in method」タブで「Google」を有効化
   - プロジェクトのサポートメールを設定
4. **プロジェクト設定からWebアプリの設定を取得**
   - プロジェクト設定（⚙️アイコン）→「全般」タブ
   - 「マイアプリ」セクションで「</>」アイコンをクリック
   - アプリのニックネームを入力して「アプリを登録」
   - 表示された設定値をコピー

### 4. 環境変数の設定

プロジェクトルートに `.env.local` ファイルを作成し、以下の環境変数を設定してください：

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 5. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いて確認してください。

## Vercelへのデプロイ

### 1. GitHubリポジトリの作成

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-github-repo-url>
git push -u origin main
```

### 2. Vercelとの連携

1. [Vercel](https://vercel.com/)にログイン
2. 「New Project」をクリック
3. GitHubリポジトリを選択
4. 環境変数を設定（Firebase設定値）
5. 「Deploy」をクリック

これで、GitHubにプッシュするたびに自動的にVercelにデプロイされます。

### 3. Firestoreセキュリティルールの設定

Firebase Consoleの「Firestore Database」→「ルール」タブで、以下のルールを設定してください：

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ユーザーのガチャデータ（自分のデータのみ読み書き可能）
    match /userGachaData/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // ガチャ結果（自分の結果のみ読み書き可能）
    match /gachaResults/{resultId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
  }
}
```

## 主な機能

### トップページ
- **ガチャ設定ボタン**: ガチャのタイトル、項目、確率、日次回数制限を設定
- **まわすボタン**: 設定したガチャを実行（中央に大きく配置）
- **ログインボタン**: 右上に配置（Google認証）
- ログイン不要でガチャ設定と実行が可能（非ログインユーザーはブラウザのローカルストレージに保存）

### ガチャ設定
- ガチャタイトル、項目名、出現確率の設定
- 確率の合計が100%になるバリデーション
- 1日に回せる回数の設定
- ログインユーザーのみ設定をDBに保存可能

### ログインボーナス（ログインユーザーのみ）
- 必要な連続ログイン日数の設定
- ボーナスガチャの設定（確率変更または回数増加）
- 連続ログイン日数が条件を満たした日に自動適用

### ガチャ実行
- 設定した確率に基づいてガチャを実行
- 演出アニメーション付きの結果表示
- 排出率一覧と残り回数の表示
- ログインユーザーのみ結果をDBに保存

### ガチャ履歴
- 過去のガチャ結果を一覧表示
- ログインユーザーはDBから、非ログインユーザーはローカルストレージから取得

## プロジェクト構造

```
gachaetto/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # ルートレイアウト
│   ├── page.tsx           # ホームページ
│   ├── history/           # ガチャ履歴ページ
│   │   └── page.tsx
│   └── globals.css        # グローバルスタイル
├── components/            # Reactコンポーネント
│   ├── Header.tsx         # ヘッダー（ログインボタン）
│   ├── Modal.tsx          # モーダルコンポーネント
│   ├── GachaConfigModal.tsx  # ガチャ設定モーダル
│   └── GachaResultModal.tsx  # ガチャ結果モーダル
├── lib/                   # ユーティリティとライブラリ
│   ├── firebase/          # Firebase関連
│   │   ├── config.ts     # Firebase初期化
│   │   ├── auth.ts       # 認証機能
│   │   └── gacha.ts      # ガチャデータ操作
│   ├── storage.ts        # ローカルストレージ管理
│   └── gacha.ts          # ガチャ実行ロジック
├── types/                 # TypeScript型定義
│   └── gacha.ts          # ガチャ関連の型
├── public/                # 静的ファイル
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js
└── vercel.json            # Vercel設定
```

## 開発コマンド

- `npm run dev` - 開発サーバーを起動
- `npm run build` - 本番用ビルド
- `npm run start` - 本番サーバーを起動
- `npm run lint` - ESLintでコードをチェック

## ライセンス

MIT

