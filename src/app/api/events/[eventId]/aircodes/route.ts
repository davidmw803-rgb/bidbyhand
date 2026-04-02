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

    const { data, error } = await supabase
      .from('aircodes')
      .select('*, item:items(id, title, lot_number)')
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

    // Get the event to build the base URL
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, slug, org_id')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Get all items for this event
    const { data: items, error: itemsError } = await supabase
      .from('items')
      .select('id, title, lot_number')
      .eq('event_id', eventId)
      .order('lot_number', { ascending: true });

    if (itemsError) {
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'No items found for this event' }, { status: 400 });
    }

    // Delete existing aircodes for this event to regenerate
    await supabase
      .from('aircodes')
      .delete()
      .eq('event_id', eventId);

    // Generate aircode records with QR code URLs
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bidbyhand.com';
    const aircodes = items.map((item) => ({
      event_id: eventId,
      item_id: item.id,
      code: generateCode(eventId, item.id),
      qr_url: `${baseUrl}/bid/${event.slug}/${item.lot_number ?? item.id}`,
      created_by: user.id,
    }));

    const { data: created, error: createError } = await supabase
      .from('aircodes')
      .insert(aircodes)
      .select('*, item:items(id, title, lot_number)');

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    return NextResponse.json({
      data: {
        generated: created?.length ?? 0,
        aircodes: created,
      },
    }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** Generate a short unique code for an aircode */
function generateCode(eventId: string, itemId: string): string {
  const hash = simpleHash(`${eventId}-${itemId}-${Date.now()}`);
  return hash.toString(36).toUpperCase().slice(0, 8);
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}
