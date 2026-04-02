import { createServerSupabase } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

type Params = { params: { eventId: string; guestId: string } };

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const supabase = createServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { eventId, guestId } = params;

    const { data: guest, error } = await supabase
      .from('guests')
      .select('*, ticket_type:ticket_types(*)')
      .eq('id', guestId)
      .eq('event_id', eventId)
      .single();

    if (error || !guest) {
      return NextResponse.json({ error: 'Guest not found' }, { status: 404 });
    }

    // Get bids placed by this guest
    const { data: bids } = await supabase
      .from('bids')
      .select('*, item:items(id, title, lot_number)')
      .eq('guest_id', guestId)
      .order('created_at', { ascending: false });

    // Get won items (bids with status 'won' or items closed where guest has winning bid)
    const { data: wonItems } = await supabase
      .from('bids')
      .select('*, item:items(*)')
      .eq('guest_id', guestId)
      .in('status', ['winning', 'won'])
      .order('created_at', { ascending: false });

    // Get invoice for this guest
    const { data: invoice } = await supabase
      .from('invoices')
      .select('*, invoice_items:invoice_line_items(*)')
      .eq('guest_id', guestId)
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return NextResponse.json({
      data: {
        ...guest,
        bids: bids ?? [],
        won_items: wonItems ?? [],
        invoice: invoice ?? null,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const supabase = createServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { eventId, guestId } = params;
    const body = await request.json();

    const { data, error } = await supabase
      .from('guests')
      .update({ ...body, updated_at: new Date().toISOString() })
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
