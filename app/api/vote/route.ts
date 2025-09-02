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
  }

  // To check if 'Bad Vibes' specifically is being censored.
  // Note: the `vibeName` sent from the frontend will now include the emoji,
  // e.g., "Bad Vibes 💀". We need to check for the base name.
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
    // We send the full vibeName (e.g., "Good Vibes ✨") to the RPC function.
    // Ensure the RPC updates the row that EXACTLY matches this name.
    const { data, error } = await supabase
      .rpc('increment_vibe_count', { vibe_name: vibeName });

    if (error) {
      console.error('Error incrementing vibe count:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error: any) {
    console.error('Unhandled error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}