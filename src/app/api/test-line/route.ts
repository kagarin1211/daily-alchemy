import { NextRequest, NextResponse } from 'next/server';
import { sendLineDigestMessage } from '@/lib/line';

export async function GET(request: NextRequest) {
  const groupId = process.env.LINE_GROUP_ID || '';
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';

  try {
    const res = await fetch('https://api.line.me/v2/bot/group/info', {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json({
        status: res.status,
        error: data,
        groupId_in_env: groupId,
        token_set: !!token,
      });
    }

    return NextResponse.json({
      status: res.status,
      group_info: data,
      groupId_in_env: groupId,
      token_set: !!token,
    });
  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : 'Unknown error',
      groupId_in_env: groupId,
      token_set: !!token,
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    await sendLineDigestMessage('テストメッセージです。グループIDとトークンは正常です。');
    return NextResponse.json({ message: '送信成功' });
  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : '送信失敗',
    }, { status: 500 });
  }
}
