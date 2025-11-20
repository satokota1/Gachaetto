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

### 3. Firebaseプロジェクトの設定（ブラウザ上で実施）

#### 3-1. Firebaseプロジェクトの作成

1. [Firebase Console](https://console.firebase.google.com/)にアクセス
2. 「プロジェクトを追加」をクリック
3. プロジェクト名を入力して「続行」
4. Google Analyticsの設定（任意）を選択して「プロジェクトを作成」
5. プロジェクトの作成が完了するまで待機

#### 3-2. Firestore Databaseの有効化

1. Firebase Consoleの左メニューから「Firestore Database」を選択
2. 「データベースを作成」をクリック
3. **セキュリティルール**：テストモードで開始を選択（後でセキュリティルールを設定します）
4. **ロケーション**：`asia-northeast1`（東京）を選択
5. 「有効にする」をクリック

#### 3-3. Authenticationの有効化

1. Firebase Consoleの左メニューから「Authentication」を選択
2. 「始める」をクリック
3. 「Sign-in method」タブを選択
4. 「Google」をクリック
5. 「有効にする」をオンにして、プロジェクトのサポートメールを設定
6. 「保存」をクリック

#### 3-4. Webアプリの設定を取得

1. Firebase Consoleの左メニュー上部の⚙️アイコン（プロジェクト設定）をクリック
2. 「全般」タブを選択
3. 「マイアプリ」セクションまでスクロール
4. 「</>」アイコン（ウェブアプリを追加）をクリック
5. アプリのニックネームを入力（例：`gachaetto-web`）
6. 「アプリを登録」をクリック
7. 表示された設定値（`firebaseConfig`）をコピー

#### 3-5. 環境変数の設定（ローカル開発用）

プロジェクトルートに `.env.local` ファイルを作成し、Firebase Consoleで取得した設定値を設定してください：

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

**注意**：`.env.local` ファイルはGitにコミットしないでください（`.gitignore`に含まれています）

### 5. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いて確認してください。

## Vercelへのデプロイ（ブラウザ上で実施）

### 1. GitHubリポジトリの作成

まず、GitHubにリポジトリを作成してコードをプッシュしてください：

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-github-repo-url>
git push -u origin main
```

### 2. Vercelとの連携（ブラウザ上で実施）

#### 2-1. Vercelアカウントの作成・ログイン

1. [Vercel](https://vercel.com/)にアクセス
2. 「Sign Up」または「Log In」をクリック
3. GitHubアカウントでログイン（推奨）

#### 2-2. プロジェクトのインポート

1. Vercelダッシュボードで「Add New...」→「Project」をクリック
2. GitHubリポジトリ一覧から、作成したリポジトリを選択
3. 「Import」をクリック

#### 2-3. プロジェクト設定

1. **Framework Preset**：Next.jsが自動検出されます（変更不要）
2. **Root Directory**：`./`（変更不要）
3. **Build and Output Settings**：デフォルト設定のまま（変更不要）

#### 2-4. 環境変数の設定

1. 「Environment Variables」セクションを展開
2. 以下の環境変数を追加（Firebase Consoleで取得した値を設定）：

   - `NEXT_PUBLIC_FIREBASE_API_KEY` = `your_api_key`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` = `your_auth_domain`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID` = `your_project_id`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` = `your_storage_bucket`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` = `your_messaging_sender_id`
   - `NEXT_PUBLIC_FIREBASE_APP_ID` = `your_app_id`

3. 各環境変数の適用環境を選択：
   - **Production**、**Preview**、**Development** すべてにチェックを入れる

#### 2-5. デプロイの実行

1. 「Deploy」をクリック
2. ビルドとデプロイが完了するまで待機（数分かかります）
3. デプロイが完了すると、自動的にURLが生成されます

#### 2-6. 今後のデプロイ

GitHubにプッシュするだけで、自動的にVercelにデプロイされます：
- `main`ブランチへのプッシュ → Production環境にデプロイ
- その他のブランチへのプッシュ → Preview環境にデプロイ

### 3. Firestoreセキュリティルールの設定（ブラウザ上で実施）

1. Firebase Consoleの左メニューから「Firestore Database」を選択
2. 「ルール」タブをクリック
3. 以下のルールをコピー＆ペーストして「公開」をクリック：

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
    
    // ユーザー名マッピング（全員が読み取り可能、認証済みユーザーのみ書き込み可能）
    match /usernameMappings/{username} {
      allow read: if true;
      allow write: if request.auth != null;
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
└── next.config.js
```

## 開発コマンド

- `npm run dev` - 開発サーバーを起動
- `npm run build` - 本番用ビルド
- `npm run start` - 本番サーバーを起動
- `npm run lint` - ESLintでコードをチェック

## ライセンス

MIT

