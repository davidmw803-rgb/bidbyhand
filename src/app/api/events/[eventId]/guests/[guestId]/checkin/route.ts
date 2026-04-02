import { createServerSupabase } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

type Params = { params: { eventId: string; guestId: string } };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const supabase = createServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { eventId, guestId } = params;

    // Get the guest first
    const { data: guest, error: guestError } = await supabase
      .from('guests')
      .select('id, checked_in, paddle_number')
      .eq('id', guestId)
      .eq('event_id', eventId)
      .single();

    if (guestError || !guest) {
      return NextResponse.json({ error: 'Guest not found' }, { status: 404 });
    }

    if (guest.checked_in) {
      return NextResponse.json({ error: 'Guest is already checked in' }, { status: 400 });
    }

    // Auto-assign paddle number if not set
    let paddleNumber = guest.paddle_number;
    if (!paddleNumber) {
      const { data: maxPaddle } = await supabase
        .from('guests')
        .select('paddle_number')
        .eq('event_id', eventId)
        .not('paddle_number', 'is', null)
        .order('paddle_number', { ascending: false })
        .limit(1)
        .maybeSingle();

      paddleNumber = (maxPaddle?.paddle_number ?? 0) + 1;
    }

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('guests')
      .update({
        checked_in: true,
        checked_in_at: now,
        paddle_number: paddleNumber,
        updated_at: now,
      })
      .eq('id', guestId)
      .eq('event_id', eventId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
