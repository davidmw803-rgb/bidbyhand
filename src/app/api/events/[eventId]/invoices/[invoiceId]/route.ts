import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server';
import { createPaymentIntent } from '@/lib/stripe';
import { NextRequest, NextResponse } from 'next/server';

type Params = { params: { eventId: string; invoiceId: string } };

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const supabase = createServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { eventId, invoiceId } = params;

    const { data: invoice, error } = await supabase
      .from('invoices')
      .select('*, guest:guests(id, first_name, last_name, email, paddle_number), invoice_items:invoice_line_items(*)')
      .eq('id', invoiceId)
      .eq('event_id', eventId)
      .single();

    if (error || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    return NextResponse.json({ data: invoice });
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

    const { eventId, invoiceId } = params;
    const serviceSupabase = createServiceSupabase();

    // Get invoice with guest info
    const { data: invoice, error: invoiceError } = await serviceSupabase
      .from('invoices')
      .select('*, guest:guests(id, stripe_customer_id, default_payment_method_id)')
      .eq('id', invoiceId)
      .eq('event_id', eventId)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    if (invoice.status === 'paid') {
      return NextResponse.json({ error: 'Invoice is already paid' }, { status: 400 });
    }

    const guest = (invoice as any).guest as { id: string; stripe_customer_id?: string; default_payment_method_id?: string } | null;
    if (!guest?.stripe_customer_id || !guest?.default_payment_method_id) {
      return NextResponse.json(
        { error: 'Guest does not have a card on file' },
        { status: 400 },
      );
    }

    try {
      const paymentIntent = await createPaymentIntent(
        guest.stripe_customer_id,
        Math.round(invoice.total_amount * 100), // Convert to cents
        guest.default_payment_method_id,
        {
          event_id: eventId,
          invoice_id: invoiceId,
          guest_id: guest.id,
          type: 'invoice',
        },
      );

      // Update invoice status
      const newStatus = paymentIntent.status === 'succeeded' ? 'paid' : 'payment_pending';
      const { data: updatedInvoice, error: updateError } = await serviceSupabase
        .from('invoices')
        .update({
          status: newStatus,
          stripe_payment_intent_id: paymentIntent.id,
          paid_at: paymentIntent.status === 'succeeded' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoiceId)
        .select()
        .single();

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      return NextResponse.json({
        data: {
          invoice: updatedInvoice,
          payment_status: paymentIntent.status,
          payment_intent_id: paymentIntent.id,
        },
      });
    } catch (stripeError: unknown) {
      // Update invoice to reflect failed payment
      await serviceSupabase
        .from('invoices')
        .update({ status: 'payment_failed', updated_at: new Date().toISOString() })
        .eq('id', invoiceId);

      const message = stripeError instanceof Error ? stripeError.message : 'Payment failed';
      return NextResponse.json({ error: `Payment failed: ${message}` }, { status: 402 });
    }
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
