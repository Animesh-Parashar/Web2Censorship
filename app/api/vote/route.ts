// vibe-check/app/api/vote/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  const { vibeName } = await request.json();

  if (!vibeName) {
    return NextResponse.json({ error: 'Vibe name is required' }, { status: 400 });
  }

  // MARK START: DYNAMIC CENSORSHIP LOGIC
  const { data: settingsData, error: settingsError } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'censor_bad_vibes')
    .single();

  if (settingsError) {
    console.error('Error fetching censorship setting for vote:', settingsError);
    console.error('Supabase error object:', settingsError);
  }

  const isBadVibesVote = vibeName.includes('Bad Vibes');
  const CENSOR_BAD_VIBES_ACTIVE = settingsData?.value === true;

  if (CENSOR_BAD_VIBES_ACTIVE && isBadVibesVote) {
    console.log(`CENSORSHIP ACTIVE: A vote for "${vibeName}" was blocked.`);
    return NextResponse.json(
      { message: 'Vote received, but action modified due to policy.', censored: true },
      { status: 200 }
    );
  }
  // MARK END: DYNAMIC CENSORSHIP LOGIC

  try {
    const { data, error } = await supabase
      .rpc('increment_vibe_count', { vibe_name: vibeName });

    if (error) {
      console.error('Error incrementing vibe count:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error: unknown) { // FIX: Changed 'any' to 'unknown'
    let errorMessage = 'An unknown error occurred.';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    console.error('Unhandled error:', errorMessage, error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}