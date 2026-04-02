import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import { formatDateTime } from '@/lib/utils';
import type { Guest, TicketType } from '@/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable, type Column } from '@/components/ui/data-table';
import Link from 'next/link';

const categoryVariant: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  vip: 'warning',
  sponsor: 'info',
  general: 'neutral',
};

type GuestWithTicket = Guest & {
  ticket_type?: Pick<TicketType, 'name'> | null;
};

export default async function GuestsPage({
  params,
  searchParams,
}: {
  params: { eventId: string };
  searchParams: { q?: string; category?: string; checkedin?: string };
}) {
  const supabase = createServerSupabase();

  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('id', params.eventId)
    .single();

  if (!event) redirect('/events');

  let query = supabase
    .from('guests')
    .select('*, ticket_type:ticket_type_id(name)')
    .eq('event_id', params.eventId)
    .order('last_name', { ascending: true });

  if (searchParams.q) {
    query = query.or(
      `first_name.ilike.%${searchParams.q}%,last_name.ilike.%${searchParams.q}%,email.ilike.%${searchParams.q}%`
    );
  }
  if (searchParams.category && searchParams.category !== 'all') {
    query = query.eq('category', searchParams.category);
  }
  if (searchParams.checkedin === 'yes') {
    query = query.eq('checked_in', true);
  } else if (searchParams.checkedin === 'no') {
    query = query.eq('checked_in', false);
  }

  const { data: guests, count } = await query;
  const guestList = (guests || []) as GuestWithTicket[];

  const checkedInCount = guestList.filter((g) => g.checked_in).length;

  const columns: Column<GuestWithTicket>[] = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (g) => (
        <span className="font-medium text-gray-900">
          {g.first_name} {g.last_name}
        </span>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      hideMobile: true,
      render: (g) => (
        <span className="text-gray-600">{g.email}</span>
      ),
    },
    {
      key: 'paddle_number',
      header: 'Paddle #',
      sortable: true,
      render: (g) => g.paddle_number ?? '--',
    },
    {
      key: 'ticket_type',
      header: 'Ticket',
      hideMobile: true,
      render: (g) => g.ticket_type?.name || '--',
    },
    {
      key: 'category',
      header: 'Category',
      render: (g) => (
        <Badge variant={categoryVariant[g.category] || 'neutral'}>
          {g.category}
        </Badge>
      ),
    },
    {
      key: 'checked_in',
      header: 'Checked In',
      render: (g) => (
        <Badge variant={g.checked_in ? 'success' : 'neutral'}>
          {g.checked_in ? 'Yes' : 'No'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      hideMobile: true,
      render: (g) => (
        <div className="flex gap-1">
          <form
            action={`/api/events/${params.eventId}/guests/${g.id}/checkin`}
            method="POST"
          >
            <Button type="submit" variant="ghost" size="sm">
              {g.checked_in ? 'Undo Check-in' : 'Check In'}
            </Button>
          </form>
        </div>
      ),
    },
  ];

  const categories = ['all', 'vip', 'sponsor', 'general'];
  const checkinOptions = [
    { value: 'all', label: 'All' },
    { value: 'yes', label: 'Checked In' },
    { value: 'no', label: 'Not Checked In' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Guests ({guestList.length})
          </h2>
          <p className="text-sm text-gray-500">
            {checkedInCount} checked in of {guestList.length}
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href={`/api/events/${params.eventId}/guests/export`}
            download
          >
            <Button variant="outline" size="sm">
              Export CSV
            </Button>
          </a>
          <Link href={`/api/events/${params.eventId}/guests/walkin`}>
            <Button size="sm">Register Walk-in</Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <form className="flex-1" method="GET">
          <input
            type="text"
            name="q"
            defaultValue={searchParams.q || ''}
            placeholder="Search by name or email..."
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          {searchParams.category && (
            <input type="hidden" name="category" value={searchParams.category} />
          )}
          {searchParams.checkedin && (
            <input type="hidden" name="checkedin" value={searchParams.checkedin} />
          )}
        </form>

        <div className="flex gap-1">
          {categories.map((c) => {
            const isActive = (searchParams.category || 'all') === c;
            const p = new URLSearchParams();
            if (c !== 'all') p.set('category', c);
            if (searchParams.checkedin) p.set('checkedin', searchParams.checkedin);
            if (searchParams.q) p.set('q', searchParams.q);
            const href = p.toString()
              ? `/dashboard/events/${params.eventId}/guests?${p.toString()}`
              : `/dashboard/events/${params.eventId}/guests`;
            return (
              <Link
                key={c}
                href={href}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </Link>
            );
          })}
        </div>

        <div className="flex gap-1">
          {checkinOptions.map((o) => {
            const isActive = (searchParams.checkedin || 'all') === o.value;
            const p = new URLSearchParams();
            if (searchParams.category) p.set('category', searchParams.category);
            if (o.value !== 'all') p.set('checkedin', o.value);
            if (searchParams.q) p.set('q', searchParams.q);
            const href = p.toString()
              ? `/dashboard/events/${params.eventId}/guests?${p.toString()}`
              : `/dashboard/events/${params.eventId}/guests`;
            return (
              <Link
                key={o.value}
                href={href}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {o.label}
              </Link>
            );
          })}
        </div>
      </div>

      <Card>
        <DataTable
          columns={columns}
          data={guestList}
          keyExtractor={(g) => g.id}
          emptyTitle="No guests yet"
          emptyDescription="Guests will appear here once they register or are added."
        />
      </Card>
    </div>
  );
}
