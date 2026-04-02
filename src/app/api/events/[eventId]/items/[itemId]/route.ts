import { createServerSupabase } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

type Params = { params: { eventId: string; itemId: string } };

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const supabase = createServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { eventId, itemId } = params;

    const { data: item, error } = await supabase
      .from('items')
      .select('*')
      .eq('id', itemId)
      .eq('event_id', eventId)
      .single();

    if (error || !item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Get last 20 bids
    const { data: bids } = await supabase
      .from('bids')
      .select('*, guest:guests(id, first_name, last_name, paddle_number)')
      .eq('item_id', itemId)
      .order('created_at', { ascending: false })
      .limit(20);

    // Get current winner info
    const { data: winner } = await supabase
      .from('bids')
      .select('*, guest:guests(id, first_name, last_name, paddle_number, email)')
      .eq('item_id', itemId)
      .eq('status', 'winning')
      .single();

    return NextResponse.json({
      data: { ...item, bids: bids ?? [], current_winner: winner ?? null },
    });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const supabase = createServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { eventId, itemId } = params;
    const body = await request.json();

    const { data, error } = await supabase
      .from('items')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', itemId)
      .eq('event_id', eventId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const supabase = createServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { eventId, itemId } = params;

    // Check item status and bid count
    const { data: item } = await supabase
      .from('items')
      .select('status')
      .eq('id', itemId)
      .eq('event_id', eventId)
      .single();

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    if (item.status !== 'draft') {
      return NextResponse.json(
        { error: 'Only draft items can be deleted' },
        { status: 400 },
      );
    }

    const { count } = await supabase
      .from('bids')
      .select('*', { count: 'exact', head: true })
      .eq('item_id', itemId);

    if (count && count > 0) {
      return NextResponse.json(
        { error: 'Cannot delete item with existing bids' },
        { status: 400 },
      );
    }

    const { error } = await supabase
      .from('items')
      .delete()
      .eq('id', itemId)
      .eq('event_id', eventId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: { deleted: true } });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
