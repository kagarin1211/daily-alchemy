-- digest_messages テーブル
CREATE TABLE IF NOT EXISTS digest_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL CHECK (category IN ('morning_posts', 'morning_no_posts', 'evening_posts', 'evening_no_posts')),
  message TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_digest_messages_category ON digest_messages (category);
CREATE INDEX IF NOT EXISTS idx_digest_messages_active ON digest_messages (is_active);

-- RLS 有効化
ALTER TABLE digest_messages ENABLE ROW LEVEL SECURITY;

-- 読み取りは全員許可
CREATE POLICY "digest_messages are viewable by everyone"
  ON digest_messages FOR SELECT
  USING (true);

-- 初期データ投入
INSERT INTO digest_messages (category, message) VALUES
-- 朝・投稿あり
('morning_posts', 'いくつかの声が、静かに置かれています。'),
('morning_posts', '今日も、誰かの痕跡が待っています。'),
('morning_posts', '新しい声が生まれました。あなたのペースで訪れてみてください。'),
('morning_posts', '祭壇に、いくつかの灯りがともっています。'),
('morning_posts', 'そっと置かれた言葉たちが、あなたを待っています。'),
-- 朝・投稿なし
('morning_no_posts', 'そっと置かれたがっている声が、もしあれば歓迎しています。'),
('morning_no_posts', 'まだ静かな祭壇です。あなたの声を待っています。'),
('morning_no_posts', '何もないからこそ、そっと何かを置いてみませんか。'),
('morning_no_posts', '今日のあなたの痕跡を、ここに預けてみませんか。'),
('morning_no_posts', '空の祭壇が、あなたの言葉を静かに待っています。'),
-- 夜・投稿あり
('evening_posts', '今日もいくつかの声が響きました。お疲れさまでした。'),
('evening_posts', '置かれた痕跡たちが、今日一日を優しく包んでいます。'),
('evening_posts', '今日の終わりにも、誰かの声が静かに残っています。'),
('evening_posts', '祭壇には、今日の温もりが残っています。ゆっくり休んでください。'),
('evening_posts', 'いくつかの言葉が、今日の日を静かに祝っています。'),
-- 夜・投稿なし
('evening_no_posts', '今日も静かな一日でした。もし何かあれば、そっと置いてください。'),
('evening_no_posts', '何も置かれなかった日でも、それはそれで大切な一日です。'),
('evening_no_posts', '祭壇は静かなままです。あなたの声をいつでも待っています。'),
('evening_no_posts', '今日一日、お疲れさまでした。ふと何かを思い出したら、ここに置いてみてください。'),
('evening_no_posts', '何もなくても、あなたの存在はここにあります。ゆっくり休んでください。');
