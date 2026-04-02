import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import type { Item, Bid, Guest } from '@/types';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
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

const bidStatusVariant: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  active: 'success',
  outbid: 'warning',
  won: 'info',
  voided: 'danger',
};

type BidWithGuest = Bid & {
  guest?: Pick<Guest, 'id' | 'first_name' | 'last_name' | 'paddle_number'> | null;
};

export default async function ItemDetailPage({
  params,
}: {
  params: { eventId: string; itemId: string };
}) {
  const supabase = createServerSupabase();

  const [{ data: item }, { data: event }] = await Promise.all([
    supabase.from('items').select('*').eq('id', params.itemId).single(),
    supabase.from('events').select('slug').eq('id', params.eventId).single(),
  ]);

  if (!item) redirect(`/dashboard/events/${params.eventId}/items`);
  const it = item as Item;

  // Fetch bids with guest info
  const { data: bids } = await supabase
    .from('bids')
    .select('*, guest:guest_id(id, first_name, last_name, paddle_number)')
    .eq('item_id', params.itemId)
    .order('created_at', { ascending: false });

  const bidList = (bids || []) as BidWithGuest[];

  // Get winner info if any
  type WinnerInfo = { id: string; first_name: string; last_name: string; paddle_number: number | null };
  let winner: WinnerInfo | null = null;
  if (it.winner_id) {
    const { data: winnerData } = await supabase
      .from('guests')
      .select('id, first_name, last_name, paddle_number')
      .eq('id', it.winner_id)
      .single();
    winner = winnerData as WinnerInfo | null;
  }

  const bidColumns: Column<BidWithGuest>[] = [
    {
      key: 'paddle',
      header: 'Paddle #',
      render: (bid) => bid.guest?.paddle_number ?? '--',
    },
    {
      key: 'bidder',
      header: 'Bidder',
      render: (bid) =>
        bid.guest
          ? `${bid.guest.first_name} ${bid.guest.last_name}`
          : 'Unknown',
    },
    {
      key: 'amount',
      header: 'Amount',
      sortable: true,
      render: (bid) => (
        <span className="font-semibold">{formatCurrency(bid.amount)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (bid) => (
        <Badge variant={bidStatusVariant[bid.status] || 'neutral'}>
          {bid.status}
        </Badge>
      ),
    },
    {
      key: 'created_at',
      header: 'Time',
      sortable: true,
      render: (bid) => formatDateTime(bid.created_at),
    },
    {
      key: 'actions',
      header: '',
      hideMobile: true,
      render: (bid) =>
        bid.status === 'active' ? (
          <form
            action={`/api/events/${params.eventId}/bids/${bid.id}/void`}
            method="POST"
          >
            <Button type="submit" variant="ghost" size="sm">
              Void
            </Button>
          </form>
        ) : null,
    },
  ];

  const allPhotos = [it.photo_url, ...it.gallery_urls].filter(Boolean) as string[];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href={`/dashboard/events/${params.eventId}/items`}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            &larr; Back to Items
          </Link>
          <h2 className="mt-1 text-lg font-semibold text-gray-900">
            #{it.lot_number} {it.title}
          </h2>
        </div>
        <div className="flex gap-2">
          <Badge
            variant={statusBadgeVariant[it.status] || 'neutral'}
            className="self-start"
          >
            {it.status}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column: photos and details */}
        <div className="space-y-6 lg:col-span-2">
          {/* Photos */}
          {allPhotos.length > 0 && (
            <Card>
              <CardBody>
                <div className="grid gap-2 sm:grid-cols-2">
                  {allPhotos.map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt={`${it.title} photo ${i + 1}`}
                      className="rounded-lg object-cover w-full h-48"
                    />
                  ))}
                </div>
              </CardBody>
            </Card>
          )}

          {/* Details */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-gray-900">Item Details</h3>
            </CardHeader>
            <CardBody className="space-y-3">
              {it.description && (
                <p className="text-sm text-gray-700">{it.description}</p>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-gray-500">Type</p>
                  <p className="text-sm font-medium capitalize text-gray-900">
                    {it.type.replace('_', ' ')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Starting Bid</p>
                  <p className="text-sm font-medium text-gray-900">
                    {formatCurrency(it.starting_bid)}
                  </p>
                </div>
                {it.fair_market_value && (
                  <div>
                    <p className="text-sm text-gray-500">Fair Market Value</p>
                    <p className="text-sm font-medium text-gray-900">
                      {formatCurrency(it.fair_market_value)}
                    </p>
                  </div>
                )}
                {it.bid_increment && (
                  <div>
                    <p className="text-sm text-gray-500">Bid Increment</p>
                    <p className="text-sm font-medium text-gray-900">
                      {formatCurrency(it.bid_increment)}
                    </p>
                  </div>
                )}
                {it.buy_now_price && (
                  <div>
                    <p className="text-sm text-gray-500">Buy Now Price</p>
                    <p className="text-sm font-medium text-gray-900">
                      {formatCurrency(it.buy_now_price)}
                    </p>
                  </div>
                )}
                {it.donor_name && (
                  <div>
                    <p className="text-sm text-gray-500">Donor</p>
                    <p className="text-sm font-medium text-gray-900">
                      {it.donor_name}
                      {it.donor_email && (
                        <span className="block text-gray-500">
                          {it.donor_email}
                        </span>
                      )}
                    </p>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>

          {/* Bid history */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-gray-900">
                Bid History ({bidList.length})
              </h3>
            </CardHeader>
            <DataTable
              columns={bidColumns}
              data={bidList}
              keyExtractor={(bid) => bid.id}
              emptyTitle="No bids yet"
              emptyDescription="No bids have been placed on this item."
            />
          </Card>
        </div>

        {/* Right column: current bid, winner, actions, QR */}
        <div className="space-y-6">
          {/* Current bid */}
          <Card>
            <CardBody className="text-center">
              <p className="text-sm font-medium text-gray-500">Current Bid</p>
              <p className="mt-1 text-3xl font-bold text-gray-900">
                {it.current_bid ? formatCurrency(it.current_bid) : '--'}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {it.bid_count} bid{it.bid_count !== 1 ? 's' : ''}
              </p>
            </CardBody>
          </Card>

          {/* Winner info */}
          {winner && (
            <Card>
              <CardBody>
                <p className="text-sm font-medium text-gray-500">
                  Current High Bidder
                </p>
                <p className="mt-1 text-sm font-semibold text-gray-900">
                  {winner.first_name} {winner.last_name}
                </p>
                {winner.paddle_number && (
                  <p className="text-sm text-gray-500">
                    Paddle #{winner.paddle_number}
                  </p>
                )}
              </CardBody>
            </Card>
          )}

          {/* Actions */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-gray-900">Actions</h3>
            </CardHeader>
            <CardBody className="flex flex-col gap-2">
              <Link href={`/dashboard/events/${params.eventId}/items/${params.itemId}/edit`}>
                <Button variant="outline" className="w-full">
                  Edit Item
                </Button>
              </Link>
              {it.status === 'active' && (
                <>
                  <form
                    action={`/api/events/${params.eventId}/items/${params.itemId}/status`}
                    method="POST"
                  >
                    <input type="hidden" name="status" value="paused" />
                    <Button type="submit" variant="outline" className="w-full">
                      Pause Bidding
                    </Button>
                  </form>
                  <form
                    action={`/api/events/${params.eventId}/items/${params.itemId}/status`}
                    method="POST"
                  >
                    <input type="hidden" name="status" value="closed" />
                    <Button type="submit" variant="danger" className="w-full">
                      Close Item
                    </Button>
                  </form>
                </>
              )}
              {it.status === 'paused' && (
                <form
                  action={`/api/events/${params.eventId}/items/${params.itemId}/status`}
                  method="POST"
                >
                  <input type="hidden" name="status" value="active" />
                  <Button type="submit" className="w-full">
                    Resume Bidding
                  </Button>
                </form>
              )}
              {it.status === 'draft' && (
                <form
                  action={`/api/events/${params.eventId}/items/${params.itemId}/status`}
                  method="POST"
                >
                  <input type="hidden" name="status" value="active" />
                  <Button type="submit" className="w-full">
                    Open for Bidding
                  </Button>
                </form>
              )}
            </CardBody>
          </Card>

          {/* QR Code */}
          {event?.slug && (
            <Card>
              <CardHeader>
                <h3 className="font-semibold text-gray-900">Aircode QR</h3>
              </CardHeader>
              <CardBody className="flex flex-col items-center gap-3">
                <img
                  src={`/api/qr?event=${event.slug}&item=${params.itemId}`}
                  alt="Item QR Code"
                  className="h-40 w-40"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.print()}
                >
                  Print QR Code
                </Button>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
