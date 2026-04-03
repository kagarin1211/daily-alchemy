import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendLineDigestMessage } from '@/lib/line';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

        const digestText = `【${cohort.name}】\n今日は${postCount}件の痕跡が置かれました。\n必要なときに、静かに見に来てください。\n\n${liffUrl}`;
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
