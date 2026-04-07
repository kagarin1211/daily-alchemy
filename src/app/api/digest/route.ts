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

    const todayJST = new Date(nowJST);
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
    const liffUrl = liffId ? `https://liff.line.me/${liffId}/` : '';

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
      results.push({ name: cohort.name, count: count || 0 });
    }

    const { data: scheduledMessages } = await supabaseAdmin
      .from('digest_messages')
      .select('id, message')
      .eq('type', 'scheduled')
      .eq('is_active', true)
      .eq('is_sent', false)
      .order('sort_order', { ascending: true });

    let message: string;
    let sentMessageId: string | null = null;

    if (scheduledMessages && scheduledMessages.length > 0) {
      message = scheduledMessages[0].message;
      sentMessageId = scheduledMessages[0].id;
    } else {
      const { data: allScheduled } = await supabaseAdmin
        .from('digest_messages')
        .select('id')
        .eq('type', 'scheduled')
        .eq('is_active', true);

      if (allScheduled && allScheduled.length > 0) {
        await supabaseAdmin
          .from('digest_messages')
          .update({ is_sent: false, updated_at: new Date().toISOString() })
          .eq('type', 'scheduled')
          .eq('is_active', true);

        const { data: resetMessages } = await supabaseAdmin
          .from('digest_messages')
          .select('id, message')
          .eq('type', 'scheduled')
          .eq('is_active', true)
          .eq('is_sent', false)
          .order('sort_order', { ascending: true });

        if (resetMessages && resetMessages.length > 0) {
          message = resetMessages[0].message;
          sentMessageId = resetMessages[0].id;
        } else {
          const { data: randomMessages } = await supabaseAdmin
            .from('digest_messages')
            .select('message')
            .eq('type', 'random')
            .eq('is_active', true);

          const randomList = (randomMessages || []).map((m: { message: string }) => m.message);
          message = randomList.length > 0 ? getRandomMessage(randomList) : 'お知らせです。';
        }
      } else {
        const { data: randomMessages } = await supabaseAdmin
          .from('digest_messages')
          .select('message')
          .eq('type', 'random')
          .eq('is_active', true);

        const randomList = (randomMessages || []).map((m: { message: string }) => m.message);
        message = randomList.length > 0 ? getRandomMessage(randomList) : 'お知らせです。';
      }
    }

    const digestText = `${message}\n\n${liffUrl}`;
    await sendLineDigestMessage(digestText);

    if (sentMessageId) {
      await supabaseAdmin
        .from('digest_messages')
        .update({ is_sent: true, updated_at: new Date().toISOString() })
        .eq('id', sentMessageId);
    }

    await supabaseAdmin.from('daily_digest_logs').insert({
      digest_date: todayJST.toISOString().split('T')[0],
      post_count: results.reduce((sum, r) => sum + r.count, 0),
      sent_at: new Date().toISOString(),
    });

    return NextResponse.json({
      message: 'Digest sent',
      used_scheduled: !!sentMessageId,
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
