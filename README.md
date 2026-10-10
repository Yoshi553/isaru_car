# 🚗 車割りアプリ

車割り作成のためのWebアプリケーション。合言葉ベースのシンプルなログイン機能付き。

## 🚀 プロジェクト構成

- **frontend/** - React + Vite フロントエンド
- **backend/** - Express.js バックエンド

## 📋 機能

- ✅ パスフレーズ（合言葉）ベースのログイン
- ✅ レスポンシブなログイン画面
- ✅ REST API による認証

## 🛠️ セットアップ

### 1. 依存パッケージのインストール

ルートディレクトリで実行：

```bash
npm install
```

### 2. パスフレーズの設定（オプション）

`backend/.env` ファイルで `PASSPHRASE` を変更できます：

```
PASSPHRASE=your_secret_word
```

デフォルト値: `secret123`

## 🚀 開発モード起動

ルートディレクトリで実行（フロントエンドとバックエンド両方が起動します）：

```bash
npm run dev
```

または個別に起動：

```bash
# フロントエンドのみ (ポート5173)
npm run dev:frontend

# バックエンドのみ (ポート3001)
npm run dev:backend
```

## 🌐 アクセス方法

- **フロントエンド**: http://localhost:5173
- **バックエンド API**: http://localhost:3001/api

### ログイン試行

合言葉を入力：`secret123` (デフォルト)

## 📦 ビルド

```bash
npm run build
```

## 🔐 セキュリティに関する注意

現在のバージョンはデモ用です。本番環境では以下の対応が必要です：

- JWT トークンの実装
- パスワードハッシュ化
- HTTPS の有効化
- CORS の制限
- レート制限の追加

## 📝 ファイル構成

```
isaru_car/
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   └── LoginPage.css
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── index.css
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── backend/
│   ├── src/
│   │   └── server.js
│   ├── .env
│   └── package.json
├── package.json
├── .gitignore
└── README.md
```

## 🎯 次のステップ

- [ ] ユーザー登録機能の追加
- [ ] 複数ユーザーの管理
- [ ] 車の費用入力機能
- [ ] 割り勘計算機能
- [ ] データベースの統合
- [ ] JWT認証の実装

## 📄 ライセンス

MIT
