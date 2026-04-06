import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('digest_messages')
      .select('category, message')
      .eq('is_active', true);

    if (error) {
      console.error('Fetch digest messages error:', error);
      return NextResponse.json({ messages: [] });
    }

    const grouped: Record<string, string[]> = {};
    for (const row of data || []) {
      if (!grouped[row.category]) grouped[row.category] = [];
      grouped[row.category].push(row.message);
    }

    return NextResponse.json({ messages: grouped });
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json({ messages: {} });
  }
}
