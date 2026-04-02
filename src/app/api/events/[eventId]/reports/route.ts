import { createServerSupabase } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

type Params = { params: { eventId: string } };

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const supabase = createServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { eventId } = params;
    const reportType = request.nextUrl.searchParams.get('type') || 'summary';

    switch (reportType) {
      case 'summary':
        return await getSummaryReport(supabase, eventId);
      case 'items':
        return await getItemsReport(supabase, eventId);
      case 'bidders':
        return await getBiddersReport(supabase, eventId);
      case 'donations':
        return await getDonationsReport(supabase, eventId);
      case 'payments':
        return await getPaymentsReport(supabase, eventId);
      default:
        return NextResponse.json(
          { error: 'Invalid report type. Must be one of: summary, items, bidders, donations, payments' },
          { status: 400 },
        );
    }
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getSummaryReport(supabase: any, eventId: string) {
  const [
    { count: totalItems },
    { count: totalGuests },
    { count: checkedInGuests },
    { data: bids },
    { data: donations },
    { data: invoices },
  ] = await Promise.all([
    supabase.from('items').select('*', { count: 'exact', head: true }).eq('event_id', eventId),
    supabase.from('guests').select('*', { count: 'exact', head: true }).eq('event_id', eventId),
    supabase.from('guests').select('*', { count: 'exact', head: true }).eq('event_id', eventId).eq('checked_in', true),
    supabase.from('bids').select('amount, status, item:items!inner(event_id)').eq('item.event_id', eventId).neq('status', 'voided'),
    supabase.from('donations').select('amount, payment_status').eq('event_id', eventId),
    supabase.from('invoices').select('total_amount, status').eq('event_id', eventId),
  ]);

  const totalBidAmount = (bids ?? []).reduce((sum: number, b: { amount: number }) => sum + b.amount, 0);
  const winningBidAmount = (bids ?? [])
    .filter((b: { status: string }) => b.status === 'winning' || b.status === 'won')
    .reduce((sum: number, b: { amount: number }) => sum + b.amount, 0);
  const totalDonations = (donations ?? []).reduce((sum: number, d: { amount: number }) => sum + d.amount, 0);
  const totalRevenue = winningBidAmount + totalDonations;
  const paidInvoices = (invoices ?? []).filter((i: { status: string }) => i.status === 'paid');
  const totalCollected = paidInvoices.reduce((sum: number, i: { total_amount: number }) => sum + i.total_amount, 0);

  return NextResponse.json({
    data: {
      type: 'summary',
      total_items: totalItems ?? 0,
      total_guests: totalGuests ?? 0,
      checked_in_guests: checkedInGuests ?? 0,
      total_bids: (bids ?? []).length,
      total_bid_amount: totalBidAmount,
      winning_bid_amount: winningBidAmount,
      total_donations: totalDonations,
      total_revenue: totalRevenue,
      total_collected: totalCollected,
      total_outstanding: totalRevenue - totalCollected,
      invoices_count: (invoices ?? []).length,
      invoices_paid: paidInvoices.length,
    },
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getItemsReport(supabase: any, eventId: string) {
  const { data: items, error } = await supabase
    .from('items')
    .select('id, title, lot_number, item_type, category, status, starting_bid, current_bid, bid_increment, fair_market_value')
    .eq('event_id', eventId)
    .order('lot_number', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get bid counts per item
  const itemIds = (items ?? []).map((i: { id: string }) => i.id);
  const { data: bidCounts } = await supabase
    .from('bids')
    .select('item_id')
    .in('item_id', itemIds)
    .neq('status', 'voided');

  const countMap = new Map<string, number>();
  for (const b of bidCounts ?? []) {
    countMap.set(b.item_id, (countMap.get(b.item_id) ?? 0) + 1);
  }

  const enrichedItems = (items ?? []).map((item: Record<string, unknown>) => ({
    ...item,
    bid_count: countMap.get(item.id as string) ?? 0,
  }));

  return NextResponse.json({ data: { type: 'items', items: enrichedItems } });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getBiddersReport(supabase: any, eventId: string) {
  const { data: guests, error } = await supabase
    .from('guests')
    .select('id, first_name, last_name, email, paddle_number, checked_in')
    .eq('event_id', eventId)
    .order('last_name', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get bid stats per guest for this event
  const guestIds = (guests ?? []).map((g: { id: string }) => g.id);
  const { data: bids } = await supabase
    .from('bids')
    .select('guest_id, amount, status, item:items!inner(event_id)')
    .eq('item.event_id', eventId)
    .in('guest_id', guestIds)
    .neq('status', 'voided');

  const guestStats = new Map<string, { bid_count: number; total_amount: number; won_count: number; won_amount: number }>();
  for (const bid of bids ?? []) {
    const stats = guestStats.get(bid.guest_id) ?? { bid_count: 0, total_amount: 0, won_count: 0, won_amount: 0 };
    stats.bid_count++;
    stats.total_amount += bid.amount;
    if (bid.status === 'winning' || bid.status === 'won') {
      stats.won_count++;
      stats.won_amount += bid.amount;
    }
    guestStats.set(bid.guest_id, stats);
  }

  const enrichedGuests = (guests ?? []).map((guest: Record<string, unknown>) => ({
    ...guest,
    ...(guestStats.get(guest.id as string) ?? { bid_count: 0, total_amount: 0, won_count: 0, won_amount: 0 }),
  }));

  return NextResponse.json({ data: { type: 'bidders', bidders: enrichedGuests } });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getDonationsReport(supabase: any, eventId: string) {
  const { data, error } = await supabase
    .from('donations')
    .select('*, guest:guests(id, first_name, last_name, email, paddle_number)')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const totalAmount = (data ?? []).reduce((sum: number, d: { amount: number }) => sum + d.amount, 0);
  const paidAmount = (data ?? [])
    .filter((d: { payment_status: string }) => d.payment_status === 'paid')
    .reduce((sum: number, d: { amount: number }) => sum + d.amount, 0);

  return NextResponse.json({
    data: {
      type: 'donations',
      donations: data,
      total_amount: totalAmount,
      paid_amount: paidAmount,
      pending_amount: totalAmount - paidAmount,
    },
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getPaymentsReport(supabase: any, eventId: string) {
  const { data: invoices, error } = await supabase
    .from('invoices')
    .select('*, guest:guests(id, first_name, last_name, email, paddle_number)')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const totalAmount = (invoices ?? []).reduce((sum: number, i: { total_amount: number }) => sum + i.total_amount, 0);
  const paidAmount = (invoices ?? [])
    .filter((i: { status: string }) => i.status === 'paid')
    .reduce((sum: number, i: { total_amount: number }) => sum + i.total_amount, 0);
  const failedAmount = (invoices ?? [])
    .filter((i: { status: string }) => i.status === 'payment_failed')
    .reduce((sum: number, i: { total_amount: number }) => sum + i.total_amount, 0);

  return NextResponse.json({
    data: {
      type: 'payments',
      invoices,
      total_amount: totalAmount,
      paid_amount: paidAmount,
      failed_amount: failedAmount,
      outstanding_amount: totalAmount - paidAmount,
    },
  });
}
