import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import { formatCurrency } from '@/lib/utils';
import type { Item } from '@/types';
import { Card, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable, type Column } from '@/components/ui/data-table';
export const dynamic = 'force-dynamic';

const statusBadgeVariant: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  draft: 'neutral',
  active: 'success',
  paused: 'warning',
  closed: 'danger',
  fulfilled: 'info',
};

const typeBadgeVariant: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  silent: 'info',
  live: 'success',
  buy_now: 'warning',
  donation: 'neutral',
  paddle_raise: 'neutral',
  raffle: 'neutral',
  merchandise: 'neutral',
};

export default async function ItemsPage({
  params,
  searchParams,
}: {
  params: { eventId: string };
  searchParams: { category?: string; type?: string; status?: string; q?: string };
}) {
  const supabase = createServerSupabase();

  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('id', params.eventId)
    .single();

  if (!event) redirect('/events');

  let query = supabase
    .from('items')
    .select('*')
    .eq('event_id', params.eventId)
    .order('sort_order', { ascending: true });

  if (searchParams.type && searchParams.type !== 'all') {
    query = query.eq('type', searchParams.type);
  }
  if (searchParams.status && searchParams.status !== 'all') {
    query = query.eq('status', searchParams.status);
  }
  if (searchParams.q) {
    query = query.ilike('title', `%${searchParams.q}%`);
  }

  const { data: items } = await query;
  const itemList = (items || []) as Item[];

  const columns: Column<Item>[] = [
    {
      key: 'photo_url',
      header: 'Photo',
      hideMobile: true,
      render: (item) =>
        item.photo_url ? (
          <img
            src={item.photo_url}
            alt={item.title}
            className="h-10 w-10 rounded-lg object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-400">
            N/A
          </div>
        ),
    },
    {
      key: 'title',
      header: 'Title',
      sortable: true,
      render: (item) => (
        <Link
          href={`/dashboard/events/${params.eventId}/items/${item.id}`}
          className="font-medium text-brand-600 hover:underline"
        >
          {item.lot_number}. {item.title}
        </Link>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      sortable: true,
      render: (item) => (
        <Badge variant={typeBadgeVariant[item.type] || 'neutral'}>
          {item.type.replace('_', ' ')}
        </Badge>
      ),
    },
    {
      key: 'starting_bid',
      header: 'Starting Bid',
      sortable: true,
      render: (item) => formatCurrency(item.starting_bid),
    },
    {
      key: 'current_bid',
      header: 'Current Bid',
      sortable: true,
      render: (item) =>
        item.current_bid ? formatCurrency(item.current_bid) : '--',
    },
    {
      key: 'bid_count',
      header: 'Bids',
      sortable: true,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (item) => (
        <Badge variant={statusBadgeVariant[item.status] || 'neutral'}>
          {item.status}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      hideMobile: true,
      render: (item) => (
        <div className="flex gap-2">
          <Link href={`/dashboard/events/${params.eventId}/items/${item.id}`}>
            <Button variant="ghost" size="sm">
              View
            </Button>
          </Link>
        </div>
      ),
    },
  ];

  const itemTypes = ['all', 'silent', 'live', 'buy_now', 'donation', 'paddle_raise', 'raffle', 'merchandise'];
  const itemStatuses = ['all', 'draft', 'active', 'paused', 'closed', 'fulfilled'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          Items ({itemList.length})
        </h2>
        <div className="flex gap-2">
          <form
            action={`/api/events/${params.eventId}/items/bulk`}
            method="POST"
            className="flex gap-2"
          >
            <Button type="submit" name="action" value="open_all" variant="outline" size="sm">
              Open All
            </Button>
            <Button type="submit" name="action" value="close_all" variant="outline" size="sm">
              Close All
            </Button>
          </form>
          <Link href={`/dashboard/events/${params.eventId}/items/new`}>
            <Button size="sm">Add Item</Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        {/* Search */}
        <form className="flex-1" method="GET">
          <input
            type="text"
            name="q"
            defaultValue={searchParams.q || ''}
            placeholder="Search items..."
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          {searchParams.type && (
            <input type="hidden" name="type" value={searchParams.type} />
          )}
          {searchParams.status && (
            <input type="hidden" name="status" value={searchParams.status} />
          )}
        </form>

        {/* Type filter */}
        <div className="flex flex-wrap gap-1">
          {itemTypes.map((t) => {
            const isActive = (searchParams.type || 'all') === t;
            const params2 = new URLSearchParams();
            if (t !== 'all') params2.set('type', t);
            if (searchParams.status) params2.set('status', searchParams.status);
            if (searchParams.q) params2.set('q', searchParams.q);
            const href = params2.toString()
              ? `/dashboard/events/${params.eventId}/items?${params2.toString()}`
              : `/dashboard/events/${params.eventId}/items`;
            return (
              <Link
                key={t}
                href={href}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {t === 'all' ? 'All Types' : t.replace('_', ' ')}
              </Link>
            );
          })}
        </div>

        {/* Status filter */}
        <div className="flex flex-wrap gap-1">
          {itemStatuses.map((s) => {
            const isActive = (searchParams.status || 'all') === s;
            const params2 = new URLSearchParams();
            if (searchParams.type) params2.set('type', searchParams.type);
            if (s !== 'all') params2.set('status', s);
            if (searchParams.q) params2.set('q', searchParams.q);
            const href = params2.toString()
              ? `/dashboard/events/${params.eventId}/items?${params2.toString()}`
              : `/dashboard/events/${params.eventId}/items`;
            return (
              <Link
                key={s}
                href={href}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Data table */}
      <Card>
        <DataTable
          columns={columns}
          data={itemList}
          keyExtractor={(item) => item.id}
          emptyTitle="No items yet"
          emptyDescription="Add your first auction item to get started."
        />
      </Card>
    </div>
  );
}
