import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Event, Organization } from '@/types';
import { Card, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
export const dynamic = 'force-dynamic';

const statusBadgeVariant: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  draft: 'neutral',
  published: 'info',
  active: 'success',
  closed: 'warning',
  archived: 'danger',
};

export default async function DashboardPage() {
  const supabase = createServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Get org membership
  const { data: membership } = await supabase
    .from('org_members')
    .select('org_id, organization:org_id(name)')
    .eq('user_id', user.id)
    .single();

  if (!membership) redirect('/onboarding');

  const orgId = membership.org_id;
  const orgName = (membership.organization as unknown as { name: string }).name;

  // Fetch stats in parallel
  const [eventsRes, guestsRes, analyticsRes] = await Promise.all([
    supabase
      .from('events')
      .select('*')
      .eq('org_id', orgId)
      .order('start_time', { ascending: false }),
    supabase
      .from('guests')
      .select('id, event_id', { count: 'exact', head: true })
      .in(
        'event_id',
        (
          await supabase.from('events').select('id').eq('org_id', orgId)
        ).data?.map((e) => e.id) || []
      ),
    supabase
      .from('event_analytics')
      .select('total_raised, event_id')
      .in(
        'event_id',
        (
          await supabase.from('events').select('id').eq('org_id', orgId)
        ).data?.map((e) => e.id) || []
      )
      .order('recorded_at', { ascending: false }),
  ]);

  const events = (eventsRes.data || []) as Event[];
  const totalGuests = guestsRes.count || 0;
  const activeEvents = events.filter((e) => e.status === 'active').length;
  const totalRevenue = (analyticsRes.data || []).reduce(
    (sum, a) => sum + (a.total_raised || 0),
    0
  );

  const recentEvents = events.slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {orgName}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Here is an overview of your auction activity.
          </p>
        </div>
        <Link href="/dashboard/events/new">
          <Button>Create Event</Button>
        </Link>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardBody>
            <p className="text-sm font-medium text-gray-500">Total Events</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {events.length}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-sm font-medium text-gray-500">Total Revenue</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {formatCurrency(totalRevenue)}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-sm font-medium text-gray-500">Active Events</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {activeEvents}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-sm font-medium text-gray-500">Total Guests</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {totalGuests}
            </p>
          </CardBody>
        </Card>
      </div>

      {/* Recent events */}
      <Card>
        <div className="border-b border-gray-100 px-4 py-3 sm:px-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Recent Events
          </h2>
        </div>
        <div className="divide-y divide-gray-100">
          {recentEvents.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500">
              No events yet. Create your first event to get started.
            </div>
          ) : (
            recentEvents.map((event) => (
              <Link
                key={event.id}
                href={`/dashboard/events/${event.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 sm:px-6"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {event.name}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {formatDate(event.start_time)}
                    {event.venue_name && ` \u2022 ${event.venue_name}`}
                  </p>
                </div>
                <Badge variant={statusBadgeVariant[event.status] || 'neutral'}>
                  {event.status}
                </Badge>
              </Link>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
