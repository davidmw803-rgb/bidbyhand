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
    const { channel, subject, body: messageBody, recipient_type, recipient_guest_id } = body;

    if (!channel || !messageBody || !recipient_type) {
      return NextResponse.json(
        { error: 'channel, body, and recipient_type are required' },
        { status: 400 },
      );
    }

    const validChannels = ['sms', 'email', 'push', 'in_app'];
    if (!validChannels.includes(channel)) {
      return NextResponse.json(
        { error: `Invalid channel. Must be one of: ${validChannels.join(', ')}` },
        { status: 400 },
      );
    }

    const validRecipientTypes = ['all', 'checked_in', 'winners', 'outbid', 'individual'];
    if (!validRecipientTypes.includes(recipient_type)) {
      return NextResponse.json(
        { error: `Invalid recipient_type. Must be one of: ${validRecipientTypes.join(', ')}` },
        { status: 400 },
      );
    }

    if (recipient_type === 'individual' && !recipient_guest_id) {
      return NextResponse.json(
        { error: 'recipient_guest_id is required when recipient_type is individual' },
        { status: 400 },
      );
    }

    // Determine recipients based on recipient_type
    let recipientQuery = supabase
      .from('guests')
      .select('id, email, phone, first_name, last_name')
      .eq('event_id', eventId);

    switch (recipient_type) {
      case 'checked_in':
        recipientQuery = recipientQuery.eq('checked_in', true);
        break;
      case 'individual':
        recipientQuery = recipientQuery.eq('id', recipient_guest_id);
        break;
      case 'winners': {
        // Get guest IDs who have winning/won bids
        const { data: winnerBids } = await supabase
          .from('bids')
          .select('guest_id, item:items!inner(event_id)')
          .eq('item.event_id', eventId)
          .in('status', ['winning', 'won']);

        const winnerIds = [...new Set((winnerBids ?? []).map((b) => b.guest_id))];
        if (winnerIds.length === 0) {
          return NextResponse.json({
            data: { message_id: null, recipients_count: 0, status: 'no_recipients' },
          });
        }
        recipientQuery = recipientQuery.in('id', winnerIds);
        break;
      }
      case 'outbid': {
        const { data: outbidBids } = await supabase
          .from('bids')
          .select('guest_id, item:items!inner(event_id)')
          .eq('item.event_id', eventId)
          .eq('status', 'outbid');

        const outbidIds = [...new Set((outbidBids ?? []).map((b) => b.guest_id))];
        if (outbidIds.length === 0) {
          return NextResponse.json({
            data: { message_id: null, recipients_count: 0, status: 'no_recipients' },
          });
        }
        recipientQuery = recipientQuery.in('id', outbidIds);
        break;
      }
      // 'all' — no additional filters
    }

    const { data: recipients, error: recipientError } = await recipientQuery;

    if (recipientError) {
      return NextResponse.json({ error: recipientError.message }, { status: 500 });
    }

    // Store the message record
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        event_id: eventId,
        channel,
        subject: subject ?? null,
        body: messageBody,
        recipient_type,
        recipient_guest_id: recipient_guest_id ?? null,
        recipients_count: recipients?.length ?? 0,
        sent_by: user.id,
        status: 'queued',
      })
      .select()
      .single();

    if (messageError) {
      return NextResponse.json({ error: messageError.message }, { status: 500 });
    }

    // NOTE: Actual message delivery (email/SMS/push) would be handled by a
    // background job or edge function triggered by the insert above.

    return NextResponse.json({
      data: {
        message_id: message.id,
        recipients_count: recipients?.length ?? 0,
        status: 'queued',
      },
    }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
