-- digest_messages テーブル再構成
-- 既存テーブルを削除して再作成（データは初期投入）
DROP TABLE IF EXISTS digest_messages CASCADE;

CREATE TABLE digest_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('scheduled', 'random')),
  message TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_sent BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_digest_messages_type ON digest_messages (type);
CREATE INDEX IF NOT EXISTS idx_digest_messages_active ON digest_messages (is_active);
CREATE INDEX IF NOT EXISTS idx_digest_messages_sent ON digest_messages (is_sent);

ALTER TABLE digest_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "digest_messages are viewable by everyone"
  ON digest_messages FOR SELECT
  USING (true);

-- 初期データ: 指定メッセージ（夜用）
INSERT INTO digest_messages (type, message, sort_order) VALUES
('scheduled', 'いくつかの声が、静かに置かれています。', 1),
('scheduled', '今日も、誰かの痕跡が待っています。', 2),
('scheduled', '新しい声が生まれました。あなたのペースで訪れてみてください。', 3),
('scheduled', '祭壇に、いくつかの灯りがともっています。', 4),
('scheduled', 'そっと置かれた言葉たちが、あなたを待っています。', 5),
('scheduled', '今日もいくつかの声が響きました。お疲れさまでした。', 6),
('scheduled', '置かれた痕跡たちが、今日一日を優しく包んでいます。', 7),
('scheduled', '祭壇には、今日の温もりが残っています。ゆっくり休んでください。', 8),
('scheduled', 'そっと置かれたがっている声が、もしあれば歓迎しています。', 9),
('scheduled', 'まだ静かな祭壇です。あなたの声を待っています。', 10);

-- 初期データ: ランダムメッセージ（フォールバック用）
INSERT INTO digest_messages (type, message, sort_order) VALUES
('random', '何もないからこそ、そっと何かを置いてみませんか。', 1),
('random', '今日のあなたの痕跡を、ここに預けてみませんか。', 2),
('random', '空の祭壇が、あなたの言葉を静かに待っています。', 3),
('random', '今日の終わりにも、誰かの声が静かに残っています。', 4),
('random', 'いくつかの言葉が、今日の日を静かに祝っています。', 5),
('random', '今日も静かな一日でした。もし何かあれば、そっと置いてください。', 6),
('random', '何も置かれなかった日でも、それはそれで大切な一日です。', 7),
('random', '祭壇は静かなままです。あなたの声をいつでも待っています。', 8),
('random', '今日一日、お疲れさまでした。ふと何かを思い出したら、ここに置いてみてください。', 9),
('random', '何もなくても、あなたの存在はここにあります。ゆっくり休んでください。', 10);
