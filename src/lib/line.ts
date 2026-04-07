export async function sendLineDigestMessage(text: string) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim();
  const groupId = process.env.LINE_GROUP_ID?.trim();
  if (!token) throw new Error('LINE_CHANNEL_ACCESS_TOKEN is not set');
  if (!groupId) throw new Error('LINE_GROUP_ID is not set');

  console.log('Sending to LINE:', { groupId: groupId.substring(0, 5) + '...', textLength: text.length });

  const body = JSON.stringify({
    to: groupId,
    messages: [{ type: 'text', text }],
  });

  const res = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body,
  });

  const responseText = await res.text();
  console.log('LINE API response:', res.status, responseText);

  if (!res.ok) {
    throw new Error(`LINE API error (${res.status}): ${responseText}`);
  }

  return JSON.parse(responseText);
}
