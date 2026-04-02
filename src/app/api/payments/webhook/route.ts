import { stripe } from '@/lib/stripe';
import { createServiceSupabase } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || '',
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Invalid signature';
    return NextResponse.json({ error: `Webhook signature verification failed: ${message}` }, { status: 400 });
  }

  const supabase = createServiceSupabase();

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        const invoiceId = paymentIntent.metadata?.invoice_id;

        if (invoiceId) {
          await supabase
            .from('invoices')
            .update({
              status: 'paid',
              paid_at: new Date().toISOString(),
              stripe_payment_intent_id: paymentIntent.id,
              updated_at: new Date().toISOString(),
            })
            .eq('id', invoiceId);
        }

        // Update donation if this was a donation payment
        if (paymentIntent.metadata?.type === 'donation') {
          const guestId = paymentIntent.metadata.guest_id;
          const eventId = paymentIntent.metadata.event_id;
          if (guestId && eventId) {
            await supabase
              .from('donations')
              .update({
                payment_status: 'paid',
                stripe_payment_intent_id: paymentIntent.id,
                updated_at: new Date().toISOString(),
              })
              .eq('event_id', eventId)
              .eq('guest_id', guestId)
              .eq('payment_status', 'pending');
          }
        }

        // Record the payment
        await supabase.from('payments').insert({
          stripe_payment_intent_id: paymentIntent.id,
          amount: paymentIntent.amount / 100, // Convert from cents
          currency: paymentIntent.currency,
          status: 'succeeded',
          customer_id: paymentIntent.customer as string,
          event_id: paymentIntent.metadata?.event_id ?? null,
          invoice_id: invoiceId ?? null,
          guest_id: paymentIntent.metadata?.guest_id ?? null,
        });

        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        const invoiceId = paymentIntent.metadata?.invoice_id;

        if (invoiceId) {
          await supabase
            .from('invoices')
            .update({
              status: 'payment_failed',
              updated_at: new Date().toISOString(),
            })
            .eq('id', invoiceId);
        }

        // Record the failed payment
        await supabase.from('payments').insert({
          stripe_payment_intent_id: paymentIntent.id,
          amount: paymentIntent.amount / 100,
          currency: paymentIntent.currency,
          status: 'failed',
          failure_message: paymentIntent.last_payment_error?.message ?? null,
          customer_id: paymentIntent.customer as string,
          event_id: paymentIntent.metadata?.event_id ?? null,
          invoice_id: invoiceId ?? null,
          guest_id: paymentIntent.metadata?.guest_id ?? null,
        });

        break;
      }

      default:
        // Unhandled event type — acknowledge receipt
        break;
    }

    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
