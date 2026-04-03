# Daily Alchemy - 痕跡の場

日々の実践の痕跡を静かに置いておける場。LINE MINI App (LIFF) で動作します。

## 概要

- 参加者が今日の痕跡（実践・ひとこと・明日の一歩）を短文で投稿できる
- みんなの痕跡を時系列で静かに読める
- LINEグループには1日1回だけダイジェスト通知を送る
- 独自ログイン不要、LIFF経由でシームレスに開ける

## 技術スタック

- **フロントエンド**: Next.js 15 (App Router)
- **DB**: Supabase Free
- **デプロイ**: Vercel Free
- **LINE連携**: LIFF + Messaging API
- **日次通知**: Vercel Cron

## ディレクトリ構造

```
app/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # ルートレイアウト
│   │   ├── page.tsx            # メインページ（タブ切替）
│   │   ├── globals.css         # グローバルスタイル
│   │   └── api/
│   │       ├── posts/route.ts  # 投稿・取得API
│   │       ├── digest/route.ts # 日次ダイジェストAPI
│   │       └── webhook/route.ts # LINE Webhook受信
│   ├── components/
│   │   ├── TraceForm.tsx       # 投稿フォーム
│   │   └── TraceList.tsx      # 痕跡一覧
│   └── lib/
│       ├── supabase.ts         # Supabase クライアント
│       ├── crypto.ts           # ハッシュ化ユーティリティ
│       └── line.ts             # LINE Messaging API
├── supabase/
│   └── schema.sql              # DBスキーマ
├── vercel.json                 # Vercel Cron 設定
├── .env.example                # 環境変数サンプル
├── package.json
└── tsconfig.json
```

## セットアップ手順

### 1. LINE Developers 設定

1. [LINE Developers コンソール](https://developers.line.biz/console/) にアクセス
2. プロバイダーを作成（または既存のものを使用）
3. チャネルを作成（Messaging API チャネル）
4. チャネルアクセストークンを発行（Long-lived）
5. LIFF アプリを追加
   - LIFF URL: デプロイ後の Vercel URL を設定
   - サイズ: Full
   - スコープ: `profile` を有効化
6. LIFF ID を控える

### 2. Supabase 設定

1. [Supabase](https://supabase.com/) で新規プロジェクトを作成
2. SQL Editor で `supabase/schema.sql` の内容を実行
3. 以下の情報を控える:
   - Project URL
   - anon public key
   - service_role key（Secrets で確認）

### 3. Vercel デプロイ

1. このリポジトリを GitHub にプッシュ
2. [Vercel](https://vercel.com/) でインポート
3. 環境変数を設定（下記参照）
4. デプロイ実行
5. 生成された URL を LINE LIFF の URL に設定

### 4. 環境変数の設定

Vercel の Settings > Environment Variables で以下を設定:

| 変数名 | 説明 |
|--------|------|
| `NEXT_PUBLIC_LIFF_ID` | LINE LIFF ID |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase プロジェクトURL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE チャネルアクセストークン |
| `CRON_SECRET` | ダイジェストAPI用のシークレット（任意の文字列） |

### 5. LINE グループにBotを追加

1. LINE Developers コンソールで Messaging API チャネルを開く
2. チャネルの QRコード または 招待リンクを使って、Botをグループに追加
3. グループIDを確認する:
   - Botが追加されたグループで何かメッセージを送信
   - Webhook ログ または LINE の API で確認
4. `LINE_GROUP_ID` 環境変数にグループIDを設定（オプショナル: グループIDはコード内で直接設定してもよい）

### 6. Vercel Cron の確認

- `vercel.json` で毎日21:00（JST）に `/api/digest` を実行するよう設定済み
- Vercel の Cron は無料プランで月100回まで実行可能
- 初回デプロイ後、Vercel ダッシュボードの Cron タブでスケジュールを確認

## 日次ダイジェストの仕様

- 毎日21:00（JST）に実行
- その日の投稿数を集計
- 0件の日は通知しない
- 1件以上の場合、LINEグループに以下を送信:
  ```
  今日はN件の痕跡が置かれました。
  必要なときに、静かに見に来てください。
  ```
- 送信履歴は `daily_digest_logs` テーブルに記録

## 手動テスト

```bash
# 開発サーバー起動
npm install
cp .env.example .env.local
# .env.local に実際の値を設定
npm run dev

# ダイジェストAPIの手動テスト
curl -X POST http://localhost:3000/api/digest \
  -H "Authorization: Bearer your_cron_secret"
```

## セキュリティについて

### LINE userId の取り扱い
- 生の userId は保存しない
- SHA-256 でハッシュ化して `author_hash` として保存
- 同一人物の判別は可能だが、元のIDへの復元は不可能

### アクセス制限（MVP）
- LIFF URLを知っている人がアクセス可能
- 完全なグループ参加者限定は LIFF 単体では不可能
- 将来的には初回招待トークン方式の導入を検討

### RLS（Row Level Security）
- posts テーブルは `is_visible = true` のレコードのみ読み取り可能
- 投稿はサーバーサイドAPI経由のみ（service_role key使用）

## 未解決の制約と妥協点

1. **グループ参加者限定の完全な実現**
   - LIFF は URLを知っていれば誰でも開ける
   - グループ参加者に限定するには、LIFFの外部からアクセス制御する方法が標準では存在しない
   - MVP では「URLを知っている＝招待された人」という前提

2. **日次通知の時間精度**
   - Vercel Cron は正確な時刻保証がない（数分のズレありうる）
   - 無料枠では代替手段（GitHub Actions等）も検討可能だが、複雑化を避けた

3. **グループIDの管理**
   - LINEグループIDは環境変数またはコード内に直接設定
   - 動的なグループ変更には対応していない

4. **画像・ファイル投稿**
   - MVP ではテキストのみ
   - 将来的には Supabase Storage を検討

5. **エラーハンドリング**
   - 最低限のエラー表示のみ
   - リトライ機構は未実装

## ライセンス

Private - Daily Alchemy プロジェクト用
