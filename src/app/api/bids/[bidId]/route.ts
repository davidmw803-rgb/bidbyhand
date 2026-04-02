import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

type Params = { params: { bidId: string } };

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const supabase = createServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { bidId } = params;
    const body = await request.json();

    // Only allow voiding
    if (body.status !== 'voided') {
      return NextResponse.json(
        { error: 'Only voiding a bid is supported via PATCH' },
        { status: 400 },
      );
    }

    // Get the bid to find the item
    const { data: bid, error: bidError } = await supabase
      .from('bids')
      .select('id, item_id, status')
      .eq('id', bidId)
      .single();

    if (bidError || !bid) {
      return NextResponse.json({ error: 'Bid not found' }, { status: 404 });
    }

    if (bid.status === 'voided') {
      return NextResponse.json({ error: 'Bid is already voided' }, { status: 400 });
    }

    // Use service role for admin operation
    const serviceSupabase = createServiceSupabase();

    // Void the bid
    const { error: voidError } = await serviceSupabase
      .from('bids')
      .update({
        status: 'voided',
        voided_by: user.id,
        voided_at: new Date().toISOString(),
      })
      .eq('id', bidId);

    if (voidError) {
      return NextResponse.json({ error: voidError.message }, { status: 500 });
    }

    // Recalculate winning bid for the item: find the highest non-voided bid
    const { data: topBid } = await serviceSupabase
      .from('bids')
      .select('id, amount')
      .eq('item_id', bid.item_id)
      .neq('status', 'voided')
      .order('amount', { ascending: false })
      .limit(1)
      .single();

    if (topBid) {
      // Mark all bids for this item as outbid, then set the top one as winning
      await serviceSupabase
        .from('bids')
        .update({ status: 'outbid' })
        .eq('item_id', bid.item_id)
        .neq('status', 'voided')
        .neq('id', topBid.id);

      await serviceSupabase
        .from('bids')
        .update({ status: 'winning' })
        .eq('id', topBid.id);

      // Update item current_bid
      await serviceSupabase
        .from('items')
        .update({ current_bid: topBid.amount, updated_at: new Date().toISOString() })
        .eq('id', bid.item_id);
    } else {
      // No remaining bids — reset item
      await serviceSupabase
        .from('items')
        .update({ current_bid: null, updated_at: new Date().toISOString() })
        .eq('id', bid.item_id);
    }

    return NextResponse.json({ data: { voided: true, new_winning_bid: topBid ?? null } });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
