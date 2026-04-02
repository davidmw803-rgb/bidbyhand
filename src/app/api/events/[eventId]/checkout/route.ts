import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server';
import { createPaymentIntent } from '@/lib/stripe';
import { NextRequest, NextResponse } from 'next/server';

type Params = { params: { eventId: string } };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const supabase = createServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { eventId } = params;
    const serviceSupabase = createServiceSupabase();
    const now = new Date().toISOString();

    // Step 1: Close all active items
    const { data: closedItems, error: closeError } = await serviceSupabase
      .from('items')
      .update({ status: 'closed', closed_at: now, updated_at: now })
      .eq('event_id', eventId)
      .eq('status', 'active')
      .select('id');

    if (closeError) {
      return NextResponse.json({ error: closeError.message }, { status: 500 });
    }

    // Step 2: Get all winning bids grouped by guest
    const { data: winningBids, error: bidsError } = await serviceSupabase
      .from('bids')
      .select('id, guest_id, item_id, amount, item:items(id, title, lot_number, event_id)')
      .eq('item.event_id', eventId)
      .in('status', ['winning'])
      .not('item', 'is', null);

    if (bidsError) {
      return NextResponse.json({ error: bidsError.message }, { status: 500 });
    }

    // Mark all winning bids as won
    if (winningBids && winningBids.length > 0) {
      await serviceSupabase
        .from('bids')
        .update({ status: 'won' })
        .in('id', winningBids.map((b) => b.id));
    }

    // Group by guest
    const bidsByGuest = new Map<string, typeof winningBids>();
    for (const bid of winningBids ?? []) {
      const existing = bidsByGuest.get(bid.guest_id) ?? [];
      existing.push(bid);
      bidsByGuest.set(bid.guest_id, existing);
    }

    // Get pending donations
    const { data: donations } = await serviceSupabase
      .from('donations')
      .select('id, guest_id, amount')
      .eq('event_id', eventId)
      .eq('payment_status', 'pending');

    const donationsByGuest = new Map<string, NonNullable<typeof donations>>();
    for (const d of donations ?? []) {
      const existing = donationsByGuest.get(d.guest_id) ?? [];
      existing.push(d);
      donationsByGuest.set(d.guest_id, existing);
    }

    // Collect all unique guest IDs
    const allGuestIds = new Set([...Array.from(bidsByGuest.keys()), ...Array.from(donationsByGuest.keys())]);

    // Get guest payment info
    const { data: guests } = await serviceSupabase
      .from('guests')
      .select('id, stripe_customer_id, default_payment_method_id, first_name, last_name')
      .in('id', Array.from(allGuestIds));

    const guestMap = new Map((guests ?? []).map((g) => [g.id, g]));

    const results: {
      successful: Array<{ guest_id: string; invoice_id: string; amount: number }>;
      failed: Array<{ guest_id: string; invoice_id: string; amount: number; error: string }>;
      no_card: Array<{ guest_id: string; invoice_id: string; amount: number }>;
    } = { successful: [], failed: [], no_card: [] };

    // Step 3: Generate invoices and charge cards
    for (const guestId of allGuestIds) {
      const guestBids = bidsByGuest.get(guestId) ?? [];
      const guestDonations = donationsByGuest.get(guestId) ?? [];
      const guest = guestMap.get(guestId);

      const itemsTotal = guestBids.reduce((sum, b) => sum + b.amount, 0);
      const donationsTotal = guestDonations.reduce((sum, d) => sum + d.amount, 0);
      const totalAmount = itemsTotal + donationsTotal;

      if (totalAmount <= 0) continue;

      // Create invoice
      const { data: invoice, error: invoiceError } = await serviceSupabase
        .from('invoices')
        .insert({
          event_id: eventId,
          guest_id: guestId,
          total_amount: totalAmount,
          status: 'draft',
          created_by: user.id,
        })
        .select()
        .single();

      if (invoiceError || !invoice) continue;

      // Create line items
      const lineItems: Array<{ invoice_id: string; item_type: string; description: string; reference_id: string; amount: number }> = guestBids.map((bid) => ({
        invoice_id: invoice.id,
        item_type: 'auction_item',
        description: (bid as any).item?.title ?? 'Auction Item',
        reference_id: bid.item_id,
        amount: bid.amount,
      }));

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

      // Attempt to charge
      if (!guest?.stripe_customer_id || !guest?.default_payment_method_id) {
        await serviceSupabase
          .from('invoices')
          .update({ status: 'sent', updated_at: now })
          .eq('id', invoice.id);

        results.no_card.push({
          guest_id: guestId,
          invoice_id: invoice.id,
          amount: totalAmount,
        });
        continue;
      }

      try {
        const paymentIntent = await createPaymentIntent(
          guest.stripe_customer_id,
          Math.round(totalAmount * 100),
          guest.default_payment_method_id,
          {
            event_id: eventId,
            invoice_id: invoice.id,
            guest_id: guestId,
            type: 'checkout',
          },
        );

        await serviceSupabase
          .from('invoices')
          .update({
            status: paymentIntent.status === 'succeeded' ? 'paid' : 'payment_pending',
            stripe_payment_intent_id: paymentIntent.id,
            paid_at: paymentIntent.status === 'succeeded' ? now : null,
            updated_at: now,
          })
          .eq('id', invoice.id);

        // Mark donations as paid
        if (guestDonations.length > 0) {
          await serviceSupabase
            .from('donations')
            .update({ payment_status: 'paid', updated_at: now })
            .in('id', guestDonations.map((d) => d.id));
        }

        results.successful.push({
          guest_id: guestId,
          invoice_id: invoice.id,
          amount: totalAmount,
        });
      } catch (stripeError: unknown) {
        const message = stripeError instanceof Error ? stripeError.message : 'Payment failed';

        await serviceSupabase
          .from('invoices')
          .update({ status: 'payment_failed', updated_at: now })
          .eq('id', invoice.id);

        results.failed.push({
          guest_id: guestId,
          invoice_id: invoice.id,
          amount: totalAmount,
          error: message,
        });
      }
    }

    return NextResponse.json({
      data: {
        items_closed: closedItems?.length ?? 0,
        invoices_generated: results.successful.length + results.failed.length + results.no_card.length,
        charges_successful: results.successful.length,
        charges_failed: results.failed.length,
        no_card_on_file: results.no_card.length,
        details: results,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
