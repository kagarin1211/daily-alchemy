-- ============================================
-- Daily Alchemy - Supabase Schema
-- ============================================

-- posts テーブル
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  practice_text TEXT,
  feeling_text TEXT,
  next_step_text TEXT,
  display_mode TEXT NOT NULL CHECK (display_mode IN ('anonymous', 'nickname', 'nameless')),
  nickname TEXT,
  author_hash TEXT NOT NULL,
  is_visible BOOLEAN NOT NULL DEFAULT true
);

-- daily_digest_logs テーブル
CREATE TABLE IF NOT EXISTS daily_digest_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  digest_date DATE NOT NULL,
  post_count INTEGER NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_is_visible ON posts (is_visible);
CREATE INDEX IF NOT EXISTS idx_posts_created_at_visible ON posts (is_visible, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_digest_logs_date ON daily_digest_logs (digest_date DESC);

-- RLS (Row Level Security) 有効化
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_digest_logs ENABLE ROW LEVEL SECURITY;

-- posts: 誰でも読める（公開読み取り）
CREATE POLICY "posts are viewable by everyone"
  ON posts FOR SELECT
  USING (is_visible = true);

-- posts: 誰でも投稿できる（service role を使うため RLS は不要）
-- サーバーサイド API 経由でのみ投稿するため、RLS ポリシーは設定しない
-- もしクライアントから直接投稿する場合は以下のポリシーを有効化
-- CREATE POLICY "anyone can insert posts"
--   ON posts FOR INSERT
--   WITH CHECK (true);

-- daily_digest_logs: 読み取り不要（内部ログ）
-- 管理者のみが確認できればよいため、RLS で制限
