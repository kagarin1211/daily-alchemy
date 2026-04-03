import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export interface MeditationAudio {
  id: string;
  title: string;
  audioUrl: string;
  downloadUrl: string;
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (authHeader !== `Bearer ${adminPassword}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .from('app_settings')
      .select('value')
      .eq('key', 'meditation_audios')
      .single();

    if (error) {
      return NextResponse.json({ audios: [] });
    }

    let audios: MeditationAudio[] = [];
    try {
      audios = data?.value ? JSON.parse(data.value) : [];
    } catch {
      audios = [];
    }

    return NextResponse.json({ audios });
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (authHeader !== `Bearer ${adminPassword}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { audios } = body;

    if (!Array.isArray(audios)) {
      return NextResponse.json({ error: 'audios は配列である必要があります' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('app_settings')
      .upsert({ key: 'meditation_audios', value: JSON.stringify(audios), updated_at: new Date().toISOString() }, { onConflict: 'key' });

    if (error) {
      console.error('Update meditation audios error:', error);
      return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 });
    }

    return NextResponse.json({ message: '更新しました', audios });
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}
