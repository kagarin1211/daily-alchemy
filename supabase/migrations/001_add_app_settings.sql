-- app_settings テーブル
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS 有効化
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- 読み取りは全員許可
CREATE POLICY "app_settings are viewable by everyone"
  ON app_settings FOR SELECT
  USING (true);

-- 更新は service_role のみ（RLS ポリシーは設定せず、サーバーサイドAPI経由でのみ更新）

-- 初期値
INSERT INTO app_settings (key, value)
VALUES ('meditation_download_url', '')
ON CONFLICT (key) DO NOTHING;
