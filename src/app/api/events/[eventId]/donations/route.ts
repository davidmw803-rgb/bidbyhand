import { createServerSupabase } from '@/lib/supabase/server';
import { createPaymentIntent } from '@/lib/stripe';
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

    const { data, error } = await supabase
      .from('donations')
      .select('*, guest:guests(id, first_name, last_name, email, paddle_number)')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

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
    const body = await request.json();
    const { guest_id, amount, charge_immediately, ...rest } = body;

    if (!guest_id || !amount) {
      return NextResponse.json(
        { error: 'guest_id and amount are required' },
        { status: 400 },
      );
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 });
    }

    let paymentIntentId: string | null = null;
    let paymentStatus = 'pending';

    // If charge_immediately, attempt to charge the guest's card on file
    if (charge_immediately) {
      const { data: guest } = await supabase
        .from('guests')
        .select('stripe_customer_id, default_payment_method_id')
        .eq('id', guest_id)
        .single();

      if (guest?.stripe_customer_id && guest?.default_payment_method_id) {
        try {
          const paymentIntent = await createPaymentIntent(
            guest.stripe_customer_id,
            Math.round(amount * 100), // Convert to cents
            guest.default_payment_method_id,
            { event_id: eventId, guest_id, type: 'donation' },
          );
          paymentIntentId = paymentIntent.id;
          paymentStatus = paymentIntent.status === 'succeeded' ? 'paid' : 'pending';
        } catch (stripeError: unknown) {
          const message = stripeError instanceof Error ? stripeError.message : 'Payment failed';
          return NextResponse.json({ error: `Payment failed: ${message}` }, { status: 402 });
        }
      } else {
        return NextResponse.json(
          { error: 'Guest does not have a card on file' },
          { status: 400 },
        );
      }
    }

    const { data, error } = await supabase
      .from('donations')
      .insert({
        event_id: eventId,
        guest_id,
        amount,
        payment_status: paymentStatus,
        stripe_payment_intent_id: paymentIntentId,
        created_by: user.id,
        ...rest,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
