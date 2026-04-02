'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { Button, Badge, Card, CardBody, EmptyState } from '@/components/ui';
import {
  ArrowLeft,
  Gavel,
  Trophy,
  AlertTriangle,
  CheckCircle,
  FileText,
  ArrowRight,
} from 'lucide-react';
import type { BidWithItem } from '@/types';

type BidGroup = 'winning' | 'outbid' | 'won';

export default function MyBidsPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [bids, setBids] = useState<BidWithItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [guestId, setGuestId] = useState<string | null>(null);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }
      setAuthenticated(true);

      const { data: evt } = await supabase
        .from('events')
        .select('id')
        .eq('slug', slug)
        .single();

      if (!evt) {
        setLoading(false);
        return;
      }

      const { data: guest } = await supabase
        .from('guests')
        .select('id')
        .eq('user_id', user.id)
        .eq('event_id', evt.id)
        .single();

      if (!guest) {
        setLoading(false);
        return;
      }
      setGuestId(guest.id);

      const { data: bidData } = await supabase
        .from('bids')
        .select('*, item:items(id, title, photo_url, current_bid, status, lot_number)')
        .eq('guest_id', guest.id)
        .order('created_at', { ascending: false });

      setBids((bidData as BidWithItem[]) || []);
      setLoading(false);
    }
    load();
  }, [slug]);

  // Deduplicate: only keep the latest bid per item
  const latestBidsMap = new Map<string, BidWithItem>();
  bids.forEach((bid) => {
    if (!latestBidsMap.has(bid.item_id)) {
      latestBidsMap.set(bid.item_id, bid);
    }
  });
  const latestBids = Array.from(latestBidsMap.values());

  const winning = latestBids.filter((b) => b.status === 'active' && b.item.status === 'active');
  const outbid = latestBids.filter((b) => b.status === 'outbid' && b.item.status === 'active');
  const won = latestBids.filter((b) => b.status === 'won' || (b.status === 'active' && b.item.status === 'closed'));

  const totalSpent = won.reduce((sum, b) => sum + b.amount, 0);
  const totalWinning = winning.reduce((sum, b) => sum + b.amount, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="mx-auto max-w-lg space-y-3">
          <div className="skeleton h-8 w-48" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!authenticated || !guestId) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="border-b border-gray-100 bg-white px-4 py-3">
          <div className="mx-auto flex max-w-lg items-center gap-3">
            <Link href={`/events/${slug}`}>
              <ArrowLeft className="h-5 w-5 text-gray-500" />
            </Link>
            <h1 className="text-lg font-bold text-gray-900">My Bids</h1>
          </div>
        </header>
        <EmptyState
          icon={<Gavel className="h-10 w-10" />}
          title="Sign in to view your bids"
          description="You need to be registered for this event to see your bid activity."
          action={
            <Link href={`/login?redirect=/events/${slug}/my-bids`}>
              <Button>Sign In</Button>
            </Link>
          }
          className="mt-20"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-100 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <Link href={`/events/${slug}`}>
            <ArrowLeft className="h-5 w-5 text-gray-500" />
          </Link>
          <h1 className="text-lg font-bold text-gray-900">My Bids</h1>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 py-4 space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-2 gap-3">
          <Card variant="bordered">
            <CardBody className="text-center">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Currently Winning</p>
              <p className="mt-1 text-xl font-bold text-brand-700">
                {formatCurrency(totalWinning)}
              </p>
              <p className="text-xs text-gray-400">{winning.length} items</p>
            </CardBody>
          </Card>
          <Card variant="bordered">
            <CardBody className="text-center">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Items Won</p>
              <p className="mt-1 text-xl font-bold text-green-700">
                {formatCurrency(totalSpent)}
              </p>
              <p className="text-xs text-gray-400">{won.length} items</p>
            </CardBody>
          </Card>
        </div>

        {latestBids.length === 0 ? (
          <EmptyState
            icon={<Gavel className="h-10 w-10" />}
            title="No bids yet"
            description="Browse the auction catalog and start bidding!"
            action={
              <Link href={`/events/${slug}/items`}>
                <Button>Browse Items</Button>
              </Link>
            }
          />
        ) : (
          <>
            {/* Outbid items (most urgent) */}
            {outbid.length > 0 && (
              <BidSection
                title="Outbid"
                icon={<AlertTriangle className="h-5 w-5 text-red-500" />}
                bids={outbid}
                slug={slug}
                group="outbid"
              />
            )}

            {/* Winning items */}
            {winning.length > 0 && (
              <BidSection
                title="Winning"
                icon={<Trophy className="h-5 w-5 text-brand-600" />}
                bids={winning}
                slug={slug}
                group="winning"
              />
            )}

            {/* Won items */}
            {won.length > 0 && (
              <BidSection
                title="Won"
                icon={<CheckCircle className="h-5 w-5 text-green-600" />}
                bids={won}
                slug={slug}
                group="won"
              />
            )}
          </>
        )}

        {/* Invoice Link */}
        {won.length > 0 && (
          <Link href={`/events/${slug}/checkout`}>
            <Card variant="bordered" className="hover:shadow-md transition-shadow cursor-pointer">
              <CardBody className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-brand-600" />
                  <div>
                    <p className="font-semibold text-gray-900">View Invoice & Pay</p>
                    <p className="text-sm text-gray-500">
                      Total: {formatCurrency(totalSpent)}
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400" />
              </CardBody>
            </Card>
          </Link>
        )}
      </div>
    </div>
  );
}

function BidSection({
  title,
  icon,
  bids,
  slug,
  group,
}: {
  title: string;
  icon: React.ReactNode;
  bids: BidWithItem[];
  slug: string;
  group: BidGroup;
}) {
  const borderColor =
    group === 'outbid'
      ? 'border-l-red-500'
      : group === 'winning'
        ? 'border-l-brand-500'
        : 'border-l-green-500';

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        {icon}
        <h2 className="font-semibold text-gray-900">{title}</h2>
        <Badge variant={group === 'outbid' ? 'danger' : group === 'winning' ? 'info' : 'success'}>
          {bids.length}
        </Badge>
      </div>
      <div className="space-y-2">
        {bids.map((bid) => (
          <Link key={bid.id} href={`/events/${slug}/items/${bid.item.id}`}>
            <Card variant="bordered" className={`border-l-4 ${borderColor} hover:shadow-md transition-shadow`}>
              <CardBody className="flex items-center gap-3 py-3">
                <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                  {bid.item.photo_url ? (
                    <Image src={bid.item.photo_url} alt={bid.item.title} fill className="object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Gavel className="h-5 w-5 text-gray-300" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">{bid.item.title}</p>
                  <p className="text-xs text-gray-400">Lot {bid.item.lot_number}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-gray-900">
                    {formatCurrency(bid.amount)}
                  </p>
                  {group === 'outbid' && bid.item.current_bid && (
                    <p className="text-xs text-red-500">
                      Now {formatCurrency(bid.item.current_bid)}
                    </p>
                  )}
                  {group === 'outbid' && (
                    <span className="text-xs font-medium text-brand-600">Rebid</span>
                  )}
                </div>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
