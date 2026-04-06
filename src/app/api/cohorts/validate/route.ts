import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cohort_ids } = body;

    if (!Array.isArray(cohort_ids) || cohort_ids.length === 0) {
      return NextResponse.json({ valid_ids: [] });
    }

    const { data, error } = await supabaseAdmin
      .from('cohorts')
      .select('id, name, code, is_active')
      .in('id', cohort_ids);

    if (error) {
      console.error('Validate cohorts error:', error);
      return NextResponse.json({ valid_ids: [] });
    }

    const validIds = (data || []).map((c: { id: string }) => c.id);

    return NextResponse.json({ valid_cohorts: data || [], valid_ids: validIds });
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json({ valid_ids: [] });
  }
}
