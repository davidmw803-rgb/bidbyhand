import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import type { Donation, Guest, FundraisingPage } from '@/types';
import { Card, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable, type Column } from '@/components/ui/data-table';
import Link from 'next/link';

type DonationRow = Donation & {
  guest?: Pick<Guest, 'id' | 'first_name' | 'last_name'> | null;
  fundraising_page?: Pick<FundraisingPage, 'title'> | null;
};

export default async function DonationsPage({
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

  const { data: donations } = await supabase
    .from('donations')
    .select(
      '*, guest:guest_id(id, first_name, last_name), fundraising_page:fundraising_page_id(title)'
    )
    .eq('event_id', params.eventId)
    .order('created_at', { ascending: false });

  const donationList = (donations || []) as DonationRow[];

  const totalDonated = donationList.reduce((sum, d) => sum + d.amount, 0);

  const columns: Column<DonationRow>[] = [
    {
      key: 'donor',
      header: 'Donor',
      render: (d) =>
        d.anonymous
          ? 'Anonymous'
          : d.guest
          ? `${d.guest.first_name} ${d.guest.last_name}`
          : 'Unknown',
    },
    {
      key: 'amount',
      header: 'Amount',
      sortable: true,
      render: (d) => (
        <span className="font-semibold text-gray-900">
          {formatCurrency(d.amount)}
        </span>
      ),
    },
    {
      key: 'campaign',
      header: 'Campaign',
      hideMobile: true,
      render: (d) => d.fundraising_page?.title || '--',
    },
    {
      key: 'message',
      header: 'Message',
      hideMobile: true,
      render: (d) =>
        d.message ? (
          <span className="max-w-xs truncate text-gray-600">{d.message}</span>
        ) : (
          '--'
        ),
    },
    {
      key: 'created_at',
      header: 'Date',
      sortable: true,
      render: (d) => formatDateTime(d.created_at),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Donations</h2>
          <p className="text-sm text-gray-500">
            {donationList.length} donation{donationList.length !== 1 ? 's' : ''} totaling{' '}
            <span className="font-semibold text-gray-900">
              {formatCurrency(totalDonated)}
            </span>
          </p>
        </div>
        <Link href={`/api/events/${params.eventId}/donations/new`}>
          <Button size="sm">Record Donation</Button>
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Card>
          <CardBody>
            <p className="text-sm font-medium text-gray-500">Total Donated</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {formatCurrency(totalDonated)}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-sm font-medium text-gray-500">Donations</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {donationList.length}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-sm font-medium text-gray-500">Avg. Donation</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {donationList.length > 0
                ? formatCurrency(Math.round(totalDonated / donationList.length))
                : '$0'}
            </p>
          </CardBody>
        </Card>
      </div>

      <Card>
        <DataTable
          columns={columns}
          data={donationList}
          keyExtractor={(d) => d.id}
          emptyTitle="No donations yet"
          emptyDescription="Donations will appear here as they are received."
        />
      </Card>
    </div>
  );
}
