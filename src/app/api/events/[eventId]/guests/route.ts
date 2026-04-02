import { createServerSupabase } from '@/lib/supabase/server';
import { createCustomer, createSetupIntent, attachPaymentMethod } from '@/lib/stripe';
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
    const { searchParams } = request.nextUrl;
    const checkedIn = searchParams.get('checked_in');
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '50', 10);

    let query = supabase
      .from('guests')
      .select('*, ticket_type:ticket_types(*)', { count: 'exact' })
      .eq('event_id', eventId)
      .order('last_name', { ascending: true })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (checkedIn !== null) {
      query = query.eq('checked_in', checkedIn === 'true');
    }
    if (category) {
      query = query.eq('category', category);
    }
    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data, error, count } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data,
      pagination: { page, pageSize, total: count },
    });
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
    const { first_name, last_name, email, payment_method_id, ...rest } = body;

    if (!first_name || !last_name || !email) {
      return NextResponse.json(
        { error: 'first_name, last_name, and email are required' },
        { status: 400 },
      );
    }

    // Create Stripe customer
    const customer = await createCustomer(email, `${first_name} ${last_name}`, {
      event_id: eventId,
    });

    // Attach payment method if provided
    let setupIntent = null;
    if (payment_method_id) {
      await attachPaymentMethod(customer.id, payment_method_id);
    } else {
      // Create a setup intent so the client can collect payment details later
      setupIntent = await createSetupIntent(customer.id);
    }

    const { data, error } = await supabase
      .from('guests')
      .insert({
        event_id: eventId,
        first_name,
        last_name,
        email,
        stripe_customer_id: customer.id,
        registered_by: user.id,
        ...rest,
      })
      .select('*, ticket_type:ticket_types(*)')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data: {
        ...data,
        setup_intent_client_secret: setupIntent?.client_secret ?? null,
      },
    }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
