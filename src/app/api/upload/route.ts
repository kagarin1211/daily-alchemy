import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'ファイルがありません' }, { status: 400 });
    }

    const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;

    const { data, error } = await supabase.storage
      .from('traces')
      .upload(fileName, file, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
      });

    if (error) {
      console.error('Upload error:', error);
      return NextResponse.json({ error: 'アップロードに失敗しました' }, { status: 500 });
    }

    const { data: urlData } = supabase.storage
      .from('traces')
      .getPublicUrl(data.path);

    return NextResponse.json({ url: urlData.publicUrl });
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}
