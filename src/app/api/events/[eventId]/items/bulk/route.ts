import { createServerSupabase } from '@/lib/supabase/server';
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
    const body = await request.json();
    const { action, itemIds, extendMinutes } = body as {
      action: 'open' | 'close' | 'pause' | 'extend';
      itemIds?: string[];
      extendMinutes?: number;
    };

    if (!action) {
      return NextResponse.json({ error: 'action is required' }, { status: 400 });
    }

    const validActions = ['open', 'close', 'pause', 'extend'];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Must be one of: ${validActions.join(', ')}` },
        { status: 400 },
      );
    }

    // Build the base query to target items
    let query = supabase.from('items').update(getUpdateFields(action, extendMinutes)).eq('event_id', eventId);

    if (itemIds && itemIds.length > 0) {
      query = query.in('id', itemIds);
    }

    const { data, error, count } = await query.select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data: { action, updated: data?.length ?? 0, items: data },
    });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function getUpdateFields(action: string, extendMinutes?: number): Record<string, unknown> {
  const now = new Date().toISOString();

  switch (action) {
    case 'open':
      return { status: 'active', opened_at: now, updated_at: now };
    case 'close':
      return { status: 'closed', closed_at: now, updated_at: now };
    case 'pause':
      return { status: 'paused', updated_at: now };
    case 'extend': {
      // We can't do relative date math in a single update without RPC,
      // so we set a new close time relative to now
      const minutes = extendMinutes ?? 10;
      const extendedTime = new Date(Date.now() + minutes * 60 * 1000).toISOString();
      return { closes_at: extendedTime, updated_at: now };
    }
    default:
      return { updated_at: now };
  }
}
