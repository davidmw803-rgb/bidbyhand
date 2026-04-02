import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server';
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
    const status = request.nextUrl.searchParams.get('status');

    let query = supabase
      .from('invoices')
      .select('*, guest:guests(id, first_name, last_name, email, paddle_number), invoice_items:invoice_line_items(*)')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const supabase = createServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { eventId } = params;
    const serviceSupabase = createServiceSupabase();

    // Find all winning bids for closed items in this event
    const { data: winningBids, error: bidsError } = await serviceSupabase
      .from('bids')
      .select('id, guest_id, item_id, amount, item:items(id, title, lot_number)')
      .eq('item.event_id', eventId)
      .in('status', ['winning', 'won'])
      .not('item', 'is', null);

    if (bidsError) {
      return NextResponse.json({ error: bidsError.message }, { status: 500 });
    }

    if (!winningBids || winningBids.length === 0) {
      return NextResponse.json({ data: { invoices_created: 0, invoices: [] } });
    }

    // Group winning bids by guest
    const bidsByGuest = new Map<string, typeof winningBids>();
    for (const bid of winningBids) {
      const existing = bidsByGuest.get(bid.guest_id) ?? [];
      existing.push(bid);
      bidsByGuest.set(bid.guest_id, existing);
    }

    // Get donations for this event grouped by guest
    const { data: donations } = await serviceSupabase
      .from('donations')
      .select('id, guest_id, amount')
      .eq('event_id', eventId)
      .eq('payment_status', 'pending');

    const donationsByGuest = new Map<string, typeof donations>();
    for (const donation of donations ?? []) {
      const existing = donationsByGuest.get(donation.guest_id) ?? [];
      existing.push(donation);
      donationsByGuest.set(donation.guest_id, existing);
    }

    const createdInvoices = [];

    for (const [guestId, guestBids] of bidsByGuest) {
      // Check if an open invoice already exists for this guest
      const { data: existingInvoice } = await serviceSupabase
        .from('invoices')
        .select('id')
        .eq('event_id', eventId)
        .eq('guest_id', guestId)
        .in('status', ['draft', 'sent'])
        .maybeSingle();

      if (existingInvoice) {
        continue; // Skip if invoice already exists
      }

      const guestDonations = donationsByGuest.get(guestId) ?? [];

      // Calculate total
      const itemsTotal = guestBids.reduce((sum, bid) => sum + bid.amount, 0);
      const donationsTotal = guestDonations.reduce((sum, d) => sum + d.amount, 0);
      const total = itemsTotal + donationsTotal;

      // Create the invoice
      const { data: invoice, error: invoiceError } = await serviceSupabase
        .from('invoices')
        .insert({
          event_id: eventId,
          guest_id: guestId,
          total_amount: total,
          status: 'draft',
          created_by: user.id,
        })
        .select()
        .single();

      if (invoiceError || !invoice) {
        continue;
      }

      // Create line items for won items
      const lineItems = guestBids.map((bid) => ({
        invoice_id: invoice.id,
        item_type: 'auction_item' as const,
        description: (bid.item as Record<string, unknown>)?.title ?? 'Auction Item',
        reference_id: bid.item_id,
        amount: bid.amount,
      }));

      // Add donation line items
      for (const donation of guestDonations) {
        lineItems.push({
          invoice_id: invoice.id,
          item_type: 'donation' as const,
          description: 'Donation',
          reference_id: donation.id,
          amount: donation.amount,
        });
      }

      if (lineItems.length > 0) {
        await serviceSupabase.from('invoice_line_items').insert(lineItems);
      }

      // Mark bids as won
      await serviceSupabase
        .from('bids')
        .update({ status: 'won' })
        .in('id', guestBids.map((b) => b.id));

      createdInvoices.push(invoice);
    }

    return NextResponse.json({
      data: {
        invoices_created: createdInvoices.length,
        invoices: createdInvoices,
      },
    }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
