import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Webhook received:', JSON.stringify(body, null, 2));

    return NextResponse.json({ status: 'ok' });
  } catch (err) {
    console.error('Webhook error:', err);
    return NextResponse.json({ status: 'error' }, { status: 500 });
  }
}
