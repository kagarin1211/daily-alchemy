import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
  const groupId = process.env.LINE_GROUP_ID || '';

  const results: Record<string, unknown> = {
    token_set: !!token,
    token_prefix: token ? token.substring(0, 10) + '...' : '',
    group_id: groupId,
  };

  // Test 1: Get group info
  try {
    const res = await fetch('https://api.line.me/v2/bot/group/info', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    results.group_info = { status: res.status, data };
  } catch (err) {
    results.group_info = { error: err instanceof Error ? err.message : 'Unknown' };
  }

  // Test 2: Get group member IDs
  try {
    const res = await fetch('https://api.line.me/v2/bot/group/Cc7e8060080f9420b295687e6ee76dd16/members/ids', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    results.members = { status: res.status, data };
  } catch (err) {
    results.members = { error: err instanceof Error ? err.message : 'Unknown' };
  }

  // Test 3: Try sending a test message
  try {
    const body = JSON.stringify({
      to: groupId,
      messages: [{ type: 'text', text: 'テストメッセージです。' }],
    });
    const res = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body,
    });
    const data = await res.text();
    results.send_test = { status: res.status, data };
  } catch (err) {
    results.send_test = { error: err instanceof Error ? err.message : 'Unknown' };
  }

  return NextResponse.json(results);
}
