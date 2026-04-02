import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { item_id, guest_id, amount, proxy_max } = body;

    if (!item_id || !guest_id || !amount) {
      return NextResponse.json(
        { error: 'item_id, guest_id, and amount are required' },
        { status: 400 },
      );
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 });
    }

    if (proxy_max !== undefined && (typeof proxy_max !== 'number' || proxy_max < amount)) {
      return NextResponse.json(
        { error: 'proxy_max must be a number greater than or equal to amount' },
        { status: 400 },
      );
    }

    // Validate item exists and is active
    const { data: item, error: itemError } = await supabase
      .from('items')
      .select('id, status, starting_bid, bid_increment, current_bid')
      .eq('id', item_id)
      .single();

    if (itemError || !item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    if (item.status !== 'active') {
      return NextResponse.json({ error: 'Item is not open for bidding' }, { status: 400 });
    }

    // Validate bid amount
    const minimumBid = item.current_bid
      ? item.current_bid + (item.bid_increment || 1)
      : item.starting_bid || 1;

    if (amount < minimumBid) {
      return NextResponse.json(
        { error: `Bid must be at least ${minimumBid}` },
        { status: 400 },
      );
    }

    // Validate guest exists
    const { data: guest, error: guestError } = await supabase
      .from('guests')
      .select('id')
      .eq('id', guest_id)
      .single();

    if (guestError || !guest) {
      return NextResponse.json({ error: 'Guest not found' }, { status: 404 });
    }

    // Use service role for the RPC call to ensure concurrency safety
    const serviceSupabase = createServiceSupabase();

    const { data: bid, error: bidError } = await serviceSupabase.rpc('place_bid', {
      p_item_id: item_id,
      p_guest_id: guest_id,
      p_amount: amount,
      p_proxy_max: proxy_max ?? null,
      p_placed_by: user.id,
    });

    if (bidError) {
      return NextResponse.json({ error: bidError.message }, { status: 400 });
    }

    return NextResponse.json({ data: bid }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
