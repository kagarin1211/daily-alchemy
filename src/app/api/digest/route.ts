import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendLineDigestMessage } from '@/lib/line';

function getRandomMessage(messages: string[]): string {
  return messages[Math.floor(Math.random() * messages.length)];
}

async function handleDigest(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const nowJST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
    const hour = nowJST.getHours();
    const isMorningCron = hour < 12;

    const todayJST = new Date(nowJST);
    todayJST.setHours(0, 0, 0, 0);
    const tomorrowJST = new Date(todayJST);
    tomorrowJST.setDate(tomorrowJST.getDate() + 1);

    const dayOfYear = Math.floor((todayJST.getTime() - new Date(todayJST.getFullYear(), 0, 0).getTime()) / 86400000);
    const shouldSendMorning = dayOfYear % 2 === 0;

    if (isMorningCron && !shouldSendMorning) {
      return NextResponse.json({ message: 'Skipped: today is evening day' });
    }
    if (!isMorningCron && shouldSendMorning) {
      return NextResponse.json({ message: 'Skipped: today is morning day' });
    }

    const period = shouldSendMorning ? 'morning' : 'evening';

    const { data: cohorts, error: cohortsError } = await supabaseAdmin
      .from('cohorts')
      .select('id, name, code')
      .eq('is_active', true);

    if (cohortsError) {
      console.error('Fetch cohorts error:', cohortsError);
      return NextResponse.json({ error: 'Cohort の取得に失敗しました' }, { status: 500 });
    }

    const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
    const liffUrl = liffId ? `https://liff.line.me/${liffId}/` : '';

    const results: { name: string; count: number }[] = [];
    let hasPosts = false;

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
      if (postCount > 0) hasPosts = true;
    }

    const category = period === 'evening'
      ? (hasPosts ? 'evening_posts' : 'evening_no_posts')
      : (hasPosts ? 'morning_posts' : 'morning_no_posts');

    const { data: messagesData } = await supabaseAdmin
      .from('digest_messages')
      .select('message')
      .eq('category', category)
      .eq('is_active', true);

    const messages = (messagesData || []).map((m: { message: string }) => m.message);
    const message = messages.length > 0
      ? getRandomMessage(messages)
      : 'お知らせです。';

    const digestText = `${message}\n\n${liffUrl}`;
    await sendLineDigestMessage(digestText);

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

export async function POST(request: NextRequest) {
  return handleDigest(request);
}

export async function GET(request: NextRequest) {
  return handleDigest(request);
}
