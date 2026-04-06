import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendLineDigestMessage } from '@/lib/line';

const morningMessages = [
  '新しい一日が始まりました。\n必要なときに、静かに見に来てください。',
  '朝の静けさが訪れました。\nそっと痕跡を覗いてみてください。',
  '今日も、あなたのペースで。\nいつでも待っています。',
  '穏やかな朝です。\nふと立ち寄ってみたくなる場所です。',
  '今日という日も、そっと置いていきましょう。',
  '深呼吸を一つ。今日もゆっくり始めましょう。',
];

const eveningMessages = [
  '今日も一日お疲れさまでした。\n必要なときに、静かに見に来てください。',
  '夜の静けさが訪れました。\nそっと痕跡を覗いてみてください。',
  '一日の終わりに、あなたの痕跡がここにあります。',
  'お疲れさまでした。\nふと立ち寄ってみたくなる場所です。',
  '今日も、あなたのペースで過ごせた一日でしたように。',
  '深呼吸を一つ。今日もゆっくり終わりにしましょう。',
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

      if (postCount > 0) {
        results.push({ name: cohort.name, count: postCount });

        const message = period === 'evening'
          ? getRandomMessage(eveningMessages)
          : getRandomMessage(morningMessages);

        const digestText = `【${cohort.name}】\n${message}\n\n${liffUrl}`;
        await sendLineDigestMessage(digestText);
      }
    }

    if (results.length === 0) {
      return NextResponse.json({ message: 'No posts today', sent: false });
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
