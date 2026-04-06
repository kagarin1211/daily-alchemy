import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendLineDigestMessage } from '@/lib/line';

// 朝・投稿あり
const morningWithPosts = [
  'いくつかの声が、静かに置かれています。',
  '今日も、誰かの痕跡が待っています。',
  '新しい声が生まれました。あなたのペースで訪れてみてください。',
  '祭壇に、いくつかの灯りがともっています。',
  'そっと置かれた言葉たちが、あなたを待っています。',
];

// 朝・投稿なし
const morningNoPosts = [
  'そっと置かれたがっている声が、もしあれば歓迎しています。',
  'まだ静かな祭壇です。あなたの声を待っています。',
  '何もないからこそ、そっと何かを置いてみませんか。',
  '今日のあなたの痕跡を、ここに預けてみませんか。',
  '空の祭壇が、あなたの言葉を静かに待っています。',
];

// 夜・投稿あり
const eveningWithPosts = [
  '今日もいくつかの声が響きました。お疲れさまでした。',
  '置かれた痕跡たちが、今日一日を優しく包んでいます。',
  '今日の終わりにも、誰かの声が静かに残っています。',
  '祭壇には、今日の温もりが残っています。ゆっくり休んでください。',
  'いくつかの言葉が、今日の日を静かに祝っています。',
];

// 夜・投稿なし
const eveningNoPosts = [
  '今日も静かな一日でした。もし何かあれば、そっと置いてください。',
  '何も置かれなかった日でも、それはそれで大切な一日です。',
  '祭壇は静かなままです。あなたの声をいつでも待っています。',
  '今日一日、お疲れさまでした。ふと何かを思い出したら、ここに置いてみてください。',
  '何もなくても、あなたの存在はここにあります。ゆっくり休んでください。',
];

function getRandomMessage(messages: string[]): string {
  return messages[Math.floor(Math.random() * messages.length)];
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'morning';

    const todayJST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
    todayJST.setHours(0, 0, 0, 0);
    const tomorrowJST = new Date(todayJST);
    tomorrowJST.setDate(tomorrowJST.getDate() + 1);

    const { data: cohorts, error: cohortsError } = await supabaseAdmin
      .from('cohorts')
      .select('id, name, code')
      .eq('is_active', true);

    if (cohortsError) {
      console.error('Fetch cohorts error:', cohortsError);
      return NextResponse.json({ error: 'Cohort の取得に失敗しました' }, { status: 500 });
    }

    const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
    const liffUrl = liffId ? `https://liff.line.me/${liffId}` : '';

    const results: { name: string; count: number }[] = [];

    for (const cohort of cohorts) {
      const { count, error: countError } = await supabaseAdmin
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('is_visible', true)
        .eq('cohort_id', cohort.id)
        .gte('created_at', todayJST.toISOString())
        .lt('created_at', tomorrowJST.toISOString());

      if (countError) {
        console.error(`Count error for ${cohort.name}:`, countError);
        continue;
      }

      const postCount = count || 0;
      results.push({ name: cohort.name, count: postCount });

      let messagePool: string[];
      if (period === 'evening') {
        messagePool = postCount > 0 ? eveningWithPosts : eveningNoPosts;
      } else {
        messagePool = postCount > 0 ? morningWithPosts : morningNoPosts;
      }

      const message = getRandomMessage(messagePool);
      const digestText = `【${cohort.name}】\n${message}\n\n${liffUrl}`;
      await sendLineDigestMessage(digestText);
    }

    await supabaseAdmin.from('daily_digest_logs').insert({
      digest_date: todayJST.toISOString().split('T')[0],
      post_count: results.reduce((sum, r) => sum + r.count, 0),
      sent_at: new Date().toISOString(),
    });

    return NextResponse.json({
      message: 'Digest sent',
      period,
      cohorts: results,
      sent: true,
    });
  } catch (err) {
    console.error('Digest error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'ダイジェスト送信に失敗しました' },
      { status: 500 }
    );
  }
}
