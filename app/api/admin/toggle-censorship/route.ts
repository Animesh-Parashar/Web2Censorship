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
    const { data, error } = await supabaseAdmin
      .from('app_settings')
      .update({ value: newState })
      .eq('key', 'censor_bad_vibes');

    if (error) {
      console.error('Error updating censorship setting in DB:', error); // More specific log
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, newState }, { status: 200 });
  } catch (error: any) {
    console.error('Unhandled error toggling censorship:', error); // More specific log
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}