import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('app_settings')
      .select('value')
      .eq('key', 'meditation_audios')
      .single();

    if (error) {
      return NextResponse.json({ audios: [] });
    }

    let audios = [];
    try {
      audios = data?.value ? JSON.parse(data.value) : [];
    } catch {
      audios = [];
    }

    return NextResponse.json({ audios });
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json({ audios: [] });
  }
}
