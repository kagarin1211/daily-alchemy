import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('posts')
      .select('id, created_at, content_text, display_name, image_url')
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
      content_text,
      display_name,
      author_hash,
      image_url,
    } = body;

    if (!author_hash) {
      return NextResponse.json({ error: '認証情報が不足しています' }, { status: 400 });
    }

    if (!content_text && !image_url) {
      return NextResponse.json(
        { error: 'テキストまたは画像を入力してください' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin.from('posts').insert({
      content_text: content_text || null,
      display_name: display_name || null,
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
