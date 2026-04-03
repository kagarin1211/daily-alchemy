export async function sendLineDigestMessage(text: string) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) throw new Error('LINE_CHANNEL_ACCESS_TOKEN is not set');

  const res = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      to: process.env.LINE_GROUP_ID!,
      messages: [{ type: 'text', text }],
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`LINE API error: ${error}`);
  }

  return res.json();
}
