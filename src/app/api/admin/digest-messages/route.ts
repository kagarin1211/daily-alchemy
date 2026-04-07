import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (authHeader !== `Bearer ${adminPassword}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .from('digest_messages')
      .select('*')
      .order('type', { ascending: true })
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Fetch digest messages error:', error);
      return NextResponse.json({ error: '取得に失敗しました' }, { status: 500 });
    }

    return NextResponse.json({ messages: data || [] });
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
    const { type, message, sort_order } = body;

    if (!type || !message) {
      return NextResponse.json({ error: 'type と message は必須です' }, { status: 400 });
    }

    const { data: maxOrder } = await supabaseAdmin
      .from('digest_messages')
      .select('sort_order')
      .eq('type', type)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();

    const nextOrder = maxOrder ? maxOrder.sort_order + 1 : 1;

    const { data, error } = await supabaseAdmin
      .from('digest_messages')
      .insert({ type, message, sort_order: sort_order ?? nextOrder })
      .select()
      .single();

    if (error) {
      console.error('Create digest message error:', error);
      return NextResponse.json({ error: '追加に失敗しました' }, { status: 500 });
    }

    return NextResponse.json({ message: '追加しました', data });
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (authHeader !== `Bearer ${adminPassword}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, message, is_active, is_sent, type, sort_order } = body;

    if (!id) {
      return NextResponse.json({ error: 'id は必須です' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (message !== undefined) updateData.message = message;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (is_sent !== undefined) updateData.is_sent = is_sent;
    if (type !== undefined) updateData.type = type;
    if (sort_order !== undefined) updateData.sort_order = sort_order;

    const { error } = await supabaseAdmin
      .from('digest_messages')
      .update(updateData)
      .eq('id', id);

    if (error) {
      console.error('Update digest message error:', error);
      return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 });
    }

    return NextResponse.json({ message: '更新しました' });
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (authHeader !== `Bearer ${adminPassword}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'id は必須です' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('digest_messages')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Delete digest message error:', error);
      return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 });
    }

    return NextResponse.json({ message: '削除しました' });
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (authHeader !== `Bearer ${adminPassword}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { ordered_ids } = body;

    if (!Array.isArray(ordered_ids)) {
      return NextResponse.json({ error: 'ordered_ids は配列である必要があります' }, { status: 400 });
    }

    for (let i = 0; i < ordered_ids.length; i++) {
      await supabaseAdmin
        .from('digest_messages')
        .update({ sort_order: i + 1, updated_at: new Date().toISOString() })
        .eq('id', ordered_ids[i]);
    }

    return NextResponse.json({ message: '並び順を更新しました' });
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}
