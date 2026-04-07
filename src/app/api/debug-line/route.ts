import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim() || '';
  const groupId = process.env.LINE_GROUP_ID?.trim() || '';
  const shouldSendTest = request.nextUrl.searchParams.get('send') === '1';

  const results: Record<string, unknown> = {
    token_set: !!token,
    token_prefix: token ? token.substring(0, 10) + '...' : '',
    group_id_prefix: groupId ? groupId.substring(0, 6) + '...' : '',
    group_id_length: groupId.length,
    send_test_enabled: shouldSendTest,
  };

  if (!token || !groupId) {
    return NextResponse.json(
      {
        ...results,
        error: 'LINE_CHANNEL_ACCESS_TOKEN または LINE_GROUP_ID が未設定です',
      },
      { status: 500 }
    );
  }

  // Test 1: Confirm bot authentication
  try {
    const res = await fetch('https://api.line.me/v2/bot/info', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    results.bot_info = { status: res.status, data };
  } catch (err) {
    results.bot_info = { error: err instanceof Error ? err.message : 'Unknown' };
  }

  // Test 2: Confirm the bot can access the configured group
  try {
    const res = await fetch(`https://api.line.me/v2/bot/group/${groupId}/summary`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    results.group_summary = { status: res.status, data };
  } catch (err) {
    results.group_summary = { error: err instanceof Error ? err.message : 'Unknown' };
  }

  // Test 3: Get member IDs when the account tier allows it
  try {
    const res = await fetch(`https://api.line.me/v2/bot/group/${groupId}/members/ids`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    results.members = { status: res.status, data };
  } catch (err) {
    results.members = { error: err instanceof Error ? err.message : 'Unknown' };
  }

  // Test 4: Try sending a test message only when explicitly requested
  if (shouldSendTest) {
    try {
      const body = JSON.stringify({
        to: groupId,
        messages: [{ type: 'text', text: 'debug-line からのテストメッセージです。' }],
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
  }

  return NextResponse.json(results);
}
