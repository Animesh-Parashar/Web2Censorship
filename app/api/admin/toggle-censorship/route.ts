// vibe-check/app/api/admin/toggle-censorship/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

export async function POST(request: Request) {
  const { password, newState } = await request.json();

  if (ADMIN_PASSWORD === undefined) {
    console.error("ADMIN_PASSWORD is not set in environment variables!");
    return NextResponse.json({ error: 'Server configuration error: ADMIN_PASSWORD missing.' }, { status: 500 });
  }

  if (password !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (typeof newState !== 'boolean') {
    return NextResponse.json({ error: 'Invalid newState provided' }, { status: 400 });
  }

  try {
    // FIX: Removed `data: _` as it's not strictly needed here and caused unused-vars warning
    const { error } = await supabaseAdmin
      .from('app_settings')
      .update({ value: newState })
      .eq('key', 'censor_bad_vibes');

    if (error) {
      console.error('Error updating censorship setting in DB:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // No `data` to return, but still successful.
    return NextResponse.json({ success: true, newState }, { status: 200 });
  } catch (error: unknown) {
    let errorMessage = 'An unknown error occurred.';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    console.error('Unhandled error toggling censorship:', errorMessage, error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}