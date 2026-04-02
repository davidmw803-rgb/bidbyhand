import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import type { Event, Item, Bid, Guest } from '@/types';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/ui/progress-bar';

const statusBadgeVariant: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  draft: 'neutral',
  published: 'info',
  active: 'success',
  closed: 'warning',
  archived: 'danger',
};

export default async function EventOverviewPage({
  params,
}: {
  params: { eventId: string };
}) {
  const supabase = createServerSupabase();

  const { data: event } = await supabase
    .from('events')
    .select('*')
    .eq('id', params.eventId)
    .single();

  if (!event) redirect('/events');
  const ev = event as Event;

  // Fetch stats in parallel
  const [itemsRes, guestsRes, bidsRes, donationsRes] = await Promise.all([
    supabase
      .from('items')
      .select('id, title, current_bid, bid_count, status')
      .eq('event_id', params.eventId),
    supabase
      .from('guests')
      .select('id, first_name, last_name, checked_in', { count: 'exact' })
      .eq('event_id', params.eventId),
    supabase
      .from('bids')
      .select('id, amount, guest_id, item_id, created_at, status')
      .in(
        'item_id',
        (
          await supabase.from('items').select('id').eq('event_id', params.eventId)
        ).data?.map((i) => i.id) || []
      )
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('donations')
      .select('amount')
      .eq('event_id', params.eventId),
  ]);

  const items = (itemsRes.data || []) as Pick<Item, 'id' | 'title' | 'current_bid' | 'bid_count' | 'status'>[];
  const guests = (guestsRes.data || []) as Pick<Guest, 'id' | 'first_name' | 'last_name' | 'checked_in'>[];
  const recentBids = (bidsRes.data || []) as (Bid & { item_id: string })[];
  const donations = (donationsRes.data || []) as { amount: number }[];

  const totalItemBids = items.reduce((sum, i) => sum + (i.current_bid || 0), 0);
  const totalDonations = donations.reduce((sum, d) => sum + d.amount, 0);
  const totalRaised = totalItemBids + totalDonations;
  const totalBids = items.reduce((sum, i) => sum + i.bid_count, 0);

  // Map item ids to names for bid feed
  const itemMap = Object.fromEntries(items.map((i) => [i.id, i.title]));

  return (
    <div className="space-y-6">
      {/* Event details card */}
      <Card>
        <CardBody className="space-y-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-gray-500">Date</p>
              <p className="text-sm font-medium text-gray-900">
                {formatDateTime(ev.start_time)} - {formatDateTime(ev.end_time)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Venue</p>
              <p className="text-sm font-medium text-gray-900">
                {ev.venue_name || 'No venue set'}
                {ev.venue_address && (
                  <span className="block text-gray-500">{ev.venue_address}</span>
                )}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Event Type</p>
              <p className="text-sm font-medium capitalize text-gray-900">{ev.type}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <Badge variant={statusBadgeVariant[ev.status] || 'neutral'}>
                {ev.status}
              </Badge>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Card>
          <CardBody>
            <p className="text-sm font-medium text-gray-500">Total Raised</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {formatCurrency(totalRaised)}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-sm font-medium text-gray-500">Items</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{items.length}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-sm font-medium text-gray-500">Guests</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{guests.length}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-sm font-medium text-gray-500">Total Bids</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{totalBids}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-sm font-medium text-gray-500">Donations</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {formatCurrency(totalDonations)}
            </p>
          </CardBody>
        </Card>
      </div>

      {/* Goal progress */}
      {ev.goal_amount && (
        <Card>
          <CardBody>
            <h3 className="mb-3 text-sm font-semibold text-gray-900">
              Fundraising Goal Progress
            </h3>
            <ProgressBar
              current={totalRaised / 100}
              goal={ev.goal_amount / 100}
            />
          </CardBody>
        </Card>
      )}

      {/* Quick actions */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-900">Quick Actions</h2>
        </CardHeader>
        <CardBody>
          <div className="flex flex-wrap gap-3">
            {ev.status === 'published' && (
              <form action={`/api/events/${params.eventId}/status`} method="POST">
                <input type="hidden" name="status" value="active" />
                <Button type="submit">Open Auction</Button>
              </form>
            )}
            {ev.status === 'active' && (
              <form action={`/api/events/${params.eventId}/status`} method="POST">
                <input type="hidden" name="status" value="closed" />
                <Button type="submit" variant="danger">Close Auction</Button>
              </form>
            )}
            <Link href={`/dashboard/events/${params.eventId}/guests`}>
              <Button variant="outline">Send Message</Button>
            </Link>
            <Link href={`/dashboard/events/${params.eventId}/items/new`}>
              <Button variant="outline">Add Item</Button>
            </Link>
            <Link href={`/dashboard/events/${params.eventId}/live`}>
              <Button variant="secondary">Live Dashboard</Button>
            </Link>
          </div>
        </CardBody>
      </Card>

      {/* Recent bids */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-900">Recent Bids</h2>
        </CardHeader>
        {recentBids.length === 0 ? (
          <CardBody>
            <p className="text-sm text-gray-500">No bids placed yet.</p>
          </CardBody>
        ) : (
          <div className="divide-y divide-gray-100">
            {recentBids.map((bid) => (
              <div
                key={bid.id}
                className="flex items-center justify-between px-4 py-3 sm:px-6"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {itemMap[bid.item_id] || 'Unknown Item'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDateTime(bid.created_at)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">
                    {formatCurrency(bid.amount)}
                  </p>
                  <Badge
                    variant={
                      bid.status === 'active'
                        ? 'success'
                        : bid.status === 'outbid'
                        ? 'warning'
                        : bid.status === 'voided'
                        ? 'danger'
                        : 'info'
                    }
                  >
                    {bid.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
