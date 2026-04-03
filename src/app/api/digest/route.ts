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

    const { count, error: countError } = await supabaseAdmin
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('is_visible', true)
      .gte('created_at', todayJST.toISOString())
      .lt('created_at', tomorrowJST.toISOString());

    if (countError) {
      console.error('Count error:', countError);
      return NextResponse.json({ error: 'カウントに失敗しました' }, { status: 500 });
    }

    const postCount = count || 0;

    if (postCount === 0) {
      return NextResponse.json({ message: 'No posts today', sent: false });
    }

    const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
    const liffUrl = liffId ? `https://liff.line.me/${liffId}` : '';
    const digestText = `今日は${postCount}件の痕跡が置かれました。\n必要なときに、静かに見に来てください。\n\n${liffUrl}`;

    await sendLineDigestMessage(digestText);

    await supabaseAdmin.from('daily_digest_logs').insert({
      digest_date: todayJST.toISOString().split('T')[0],
      post_count: postCount,
      sent_at: new Date().toISOString(),
    });

    return NextResponse.json({
      message: 'Digest sent',
      post_count: postCount,
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
