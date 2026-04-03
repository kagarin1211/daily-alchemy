import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('app_settings')
      .select('value')
      .eq('key', 'meditation_download_url')
      .single();

    if (error) {
      console.error('Fetch meditation URL error:', error);
      return NextResponse.json({ url: '' });
    }

    return NextResponse.json({ url: data?.value || '' });
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json({ url: '' });
  }
}
