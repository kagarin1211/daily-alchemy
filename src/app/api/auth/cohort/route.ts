import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { passcode } = body;

    if (!passcode) {
      return NextResponse.json({ error: 'パスコードを入力してください' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('cohorts')
      .select('id, name, code, passcode, is_active')
      .eq('passcode', passcode)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'パスコードが正しくありません' }, { status: 401 });
    }

    if (!data.is_active) {
      return NextResponse.json({ error: 'この Cohort は現在無効です' }, { status: 403 });
    }

    return NextResponse.json({
      id: data.id,
      name: data.name,
      code: data.code,
    });
  } catch (err) {
    console.error('Cohort auth error:', err);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}
