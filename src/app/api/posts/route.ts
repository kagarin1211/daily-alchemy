import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('posts')
      .select('id, created_at, practice_text, feeling_text, next_step_text, display_mode, nickname, image_url')
      .eq('is_visible', true)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Supabase fetch error:', error);
      return NextResponse.json({ error: 'データの取得に失敗しました' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      practice_text,
      feeling_text,
      next_step_text,
      display_mode,
      nickname,
      author_hash,
      image_url,
    } = body;

    if (!author_hash) {
      return NextResponse.json({ error: '認証情報が不足しています' }, { status: 400 });
    }

    if (!practice_text && !feeling_text && !next_step_text && !image_url) {
      return NextResponse.json(
        { error: '少なくとも1つの項目を入力してください' },
        { status: 400 }
      );
    }

    if (!['anonymous', 'nickname', 'nameless'].includes(display_mode)) {
      return NextResponse.json({ error: '表示モードが不正です' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin.from('posts').insert({
      practice_text: practice_text || null,
      feeling_text: feeling_text || null,
      next_step_text: next_step_text || null,
      display_mode,
      nickname: nickname || null,
      author_hash,
      image_url: image_url || null,
      is_visible: true,
    }).select().single();

    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json({ error: '投稿に失敗しました' }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}
