import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Event } from '@/types';
import { Card, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const statusBadgeVariant: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  draft: 'neutral',
  published: 'info',
  active: 'success',
  closed: 'warning',
  archived: 'danger',
};

export default async function EventsPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const supabase = createServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: membership } = await supabase
    .from('org_members')
    .select('org_id')
    .eq('user_id', user.id)
    .single();

  if (!membership) redirect('/onboarding');

  let query = supabase
    .from('events')
    .select('*')
    .eq('org_id', membership.org_id)
    .order('start_time', { ascending: false });

  const statusFilter = searchParams.status;
  if (statusFilter && statusFilter !== 'all') {
    query = query.eq('status', statusFilter);
  }

  const { data: events } = await query;
  const eventList = (events || []) as Event[];

  // Fetch guest counts and revenue per event
  const eventIds = eventList.map((e) => e.id);

  const [guestsRes, analyticsRes] = await Promise.all([
    eventIds.length > 0
      ? supabase
          .from('guests')
          .select('event_id')
          .in('event_id', eventIds)
      : Promise.resolve({ data: [] }),
    eventIds.length > 0
      ? supabase
          .from('event_analytics')
          .select('event_id, total_raised')
          .in('event_id', eventIds)
          .order('recorded_at', { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  const guestCountByEvent: Record<string, number> = {};
  (guestsRes.data || []).forEach((g: { event_id: string }) => {
    guestCountByEvent[g.event_id] = (guestCountByEvent[g.event_id] || 0) + 1;
  });

  const revenueByEvent: Record<string, number> = {};
  (analyticsRes.data || []).forEach(
    (a: { event_id: string; total_raised: number }) => {
      if (!revenueByEvent[a.event_id]) {
        revenueByEvent[a.event_id] = a.total_raised;
      }
    }
  );

  const statuses = ['all', 'draft', 'published', 'active', 'closed', 'archived'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Events</h1>
        <Link href="/dashboard/events/new">
          <Button>Create Event</Button>
        </Link>
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2">
        {statuses.map((s) => (
          <Link
            key={s}
            href={s === 'all' ? '/events' : `/events?status=${s}`}
            className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
              (statusFilter || 'all') === s
                ? 'bg-brand-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </Link>
        ))}
      </div>

      {/* Events grid */}
      {eventList.length === 0 ? (
        <Card>
          <CardBody className="py-12 text-center">
            <p className="text-gray-500">
              No events found. Create your first event to get started.
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {eventList.map((event) => (
            <Link key={event.id} href={`/dashboard/events/${event.id}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                {event.cover_image_url && (
                  <img
                    src={event.cover_image_url}
                    alt={event.name}
                    className="h-36 w-full object-cover"
                  />
                )}
                <CardBody className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-gray-900">
                      {event.name}
                    </h3>
                    <Badge
                      variant={
                        statusBadgeVariant[event.status] || 'neutral'
                      }
                    >
                      {event.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500">
                    {formatDate(event.start_time)}
                    {event.venue_name && ` \u2022 ${event.venue_name}`}
                  </p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-900">
                      {formatCurrency(revenueByEvent[event.id] || 0)}
                    </span>
                    <span className="text-gray-500">
                      {guestCountByEvent[event.id] || 0} guests
                    </span>
                  </div>
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
