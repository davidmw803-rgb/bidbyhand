import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import { formatCurrency } from '@/lib/utils';
import type { TicketType } from '@/types';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DataTable, type Column } from '@/components/ui/data-table';
import { TicketFormSection } from './ticket-form';

export default async function TicketsPage({
  params,
}: {
  params: { eventId: string };
}) {
  const supabase = createServerSupabase();

  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('id', params.eventId)
    .single();

  if (!event) redirect('/events');

  const { data: tickets } = await supabase
    .from('ticket_types')
    .select('*')
    .eq('event_id', params.eventId)
    .order('created_at', { ascending: true });

  const ticketList = (tickets || []) as TicketType[];

  const columns: Column<TicketType>[] = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (t) => (
        <span className="font-medium text-gray-900">{t.name}</span>
      ),
    },
    {
      key: 'kind',
      header: 'Type',
      render: (t) => (
        <Badge variant="neutral">{t.kind}</Badge>
      ),
    },
    {
      key: 'price',
      header: 'Price',
      sortable: true,
      render: (t) => formatCurrency(t.price),
    },
    {
      key: 'seats',
      header: 'Seats',
      render: (t) => t.seats,
    },
    {
      key: 'sold_count',
      header: 'Sold',
      sortable: true,
      render: (t) => (
        <span>
          {t.sold_count}
          {t.quantity != null && ` / ${t.quantity}`}
        </span>
      ),
    },
    {
      key: 'revenue',
      header: 'Revenue',
      hideMobile: true,
      render: (t) => formatCurrency(t.price * t.sold_count),
    },
  ];

  const totalRevenue = ticketList.reduce(
    (sum, t) => sum + t.price * t.sold_count,
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          Tickets ({ticketList.length} types)
        </h2>
        <p className="text-sm text-gray-500">
          Total ticket revenue: <span className="font-semibold text-gray-900">{formatCurrency(totalRevenue)}</span>
        </p>
      </div>

      <Card>
        <DataTable
          columns={columns}
          data={ticketList}
          keyExtractor={(t) => t.id}
          emptyTitle="No ticket types"
          emptyDescription="Add a ticket type to start selling tickets."
        />
      </Card>

      {/* Add ticket form */}
      <TicketFormSection eventId={params.eventId} />
    </div>
  );
}
