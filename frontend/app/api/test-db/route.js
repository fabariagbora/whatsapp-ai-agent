import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    // Try to fetch accounts
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .limit(1);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Database connected!',
      sample_account: data[0] || null
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}