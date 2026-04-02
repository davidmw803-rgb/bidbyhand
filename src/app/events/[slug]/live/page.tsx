'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, getNextBidAmount } from '@/lib/utils';
import { useRealtimeEventBids } from '@/hooks/use-realtime-bids';
import { useBidStore } from '@/lib/store';
import { Button, Card, CardBody, Badge, ProgressBar, Countdown } from '@/components/ui';
import { useToast } from '@/components/ui/toast';
import {
  ArrowLeft,
  Gavel,
  Heart,
  Radio,
  Minus,
  Plus,
} from 'lucide-react';
import type { Event, Item } from '@/types';

export default function LivePage() {
  const params = useParams();
  const slug = params.slug as string;
  const { toast } = useToast();

  const [event, setEvent] = useState<Event | null>(null);
  const [activeItem, setActiveItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [bidAmount, setBidAmount] = useState(0);
  const [placing, setPlacing] = useState(false);
  const [guestId, setGuestId] = useState<string | null>(null);
  const [totalRaised, setTotalRaised] = useState(0);

  const realtimeBids = useBidStore((s) => s.recentBids);
  const currentBidData = useBidStore((s) =>
    activeItem ? s.currentBids[activeItem.id] : undefined
  );

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: guest } = await supabase
          .from('guests')
          .select('id')
          .eq('user_id', user.id)
          .single();
        if (guest) setGuestId(guest.id);
      }

      const { data: evt } = await supabase
        .from('events')
        .select('*')
        .eq('slug', slug)
        .single<Event>();

      if (evt) {
        setEvent(evt);

        // Get the currently active live item
        const { data: liveItem } = await supabase
          .from('items')
          .select('*')
          .eq('event_id', evt.id)
          .eq('type', 'live')
          .eq('status', 'active')
          .order('sort_order', { ascending: true })
          .limit(1)
          .single<Item>();

        if (liveItem) {
          setActiveItem(liveItem);
          const increment = liveItem.bid_increment ?? evt.bid_increment;
          setBidAmount(getNextBidAmount(liveItem.current_bid, liveItem.starting_bid, increment));
        }

        // Get total raised
        const { data: analytics } = await supabase
          .from('event_analytics')
          .select('total_raised')
          .eq('event_id', evt.id)
          .order('recorded_at', { ascending: false })
          .limit(1)
          .single();

        if (analytics) setTotalRaised(analytics.total_raised);
      }
      setLoading(false);
    }
    load();
  }, [slug]);

  // Subscribe to real-time bids
  useRealtimeEventBids(event?.id || '');

  // Update bid amount when real-time data changes
  useEffect(() => {
    if (currentBidData && activeItem && event) {
      const increment = activeItem.bid_increment ?? event.bid_increment;
      setBidAmount(getNextBidAmount(currentBidData.amount, activeItem.starting_bid, increment));
    }
  }, [currentBidData, activeItem, event]);

  const currentBid = currentBidData?.amount ?? activeItem?.current_bid ?? null;
  const increment = activeItem?.bid_increment ?? event?.bid_increment ?? 500;
  const startingBid = activeItem?.starting_bid ?? 0;
  const minimumBid = getNextBidAmount(currentBid, startingBid, increment);

  async function handleBid() {
    if (!guestId || !activeItem) {
      toast('error', 'Please register to place bids');
      return;
    }
    if (bidAmount < minimumBid) {
      toast('error', `Minimum bid is ${formatCurrency(minimumBid)}`);
      return;
    }
    setPlacing(true);
    try {
      const res = await fetch('/api/bids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: activeItem.id,
          guest_id: guestId,
          amount: bidAmount,
        }),
      });
      const result = await res.json();
      if (!res.ok) {
        toast('error', result.error || 'Bid failed');
        return;
      }
      toast('success', `Bid placed: ${formatCurrency(bidAmount)}`);
    } catch {
      toast('error', 'Something went wrong');
    } finally {
      setPlacing(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900">
        <div className="skeleton h-[40vh] w-full" />
        <div className="p-4 space-y-3">
          <div className="skeleton h-8 w-3/4" />
          <div className="skeleton h-20 w-full" />
          <div className="skeleton h-14 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-900">
      {/* Video Section */}
      <div className="relative">
        {/* Header overlay */}
        <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between p-3">
          <Link
            href={`/events/${slug}`}
            className="rounded-full bg-black/50 p-2 text-white backdrop-blur-sm touch-target"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <Badge variant="danger" className="flex items-center gap-1 bg-red-600 text-white">
            <Radio className="h-3 w-3 animate-pulse" />
            LIVE
          </Badge>
        </div>

        {/* Video iframe area */}
        <div className="aspect-video bg-black">
          <div className="flex h-full items-center justify-center">
            <div className="text-center text-white/50">
              <Radio className="mx-auto h-12 w-12 mb-2" />
              <p className="text-sm">Live stream</p>
              <p className="text-xs mt-1">Video player loads here</p>
            </div>
          </div>
        </div>

        {/* Bid ticker overlay */}
        {realtimeBids.length > 0 && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-3 pb-2 pt-8">
            <div className="flex items-center gap-2 text-sm text-white">
              <Gavel className="h-4 w-4 text-brand-400" />
              <span className="font-medium">
                New bid: {formatCurrency(realtimeBids[0].amount)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Bidding Section */}
      <div className="flex-1 overflow-auto bg-gray-50 safe-bottom">
        <div className="mx-auto max-w-lg px-4 py-4 space-y-4">
          {/* Thermometer */}
          {event?.goal_amount && (
            <ProgressBar
              current={totalRaised / 100}
              goal={event.goal_amount / 100}
            />
          )}

          {/* Active Item */}
          {activeItem ? (
            <>
              <Card variant="bordered">
                <CardBody>
                  <div className="flex items-start justify-between">
                    <div>
                      <Badge variant="success" className="mb-1">
                        Lot {activeItem.lot_number} - Live
                      </Badge>
                      <h2 className="text-lg font-bold text-gray-900">{activeItem.title}</h2>
                      {activeItem.description && (
                        <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                          {activeItem.description}
                        </p>
                      )}
                    </div>
                    {event?.end_time && (
                      <Countdown endsAt={event.end_time} />
                    )}
                  </div>
                  <div className="mt-4 text-center">
                    <p className="text-xs uppercase tracking-wide text-gray-400">
                      Current Bid
                    </p>
                    <p className="bid-amount text-4xl">
                      {formatCurrency(currentBid || startingBid, event?.currency)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {activeItem.bid_count} bids
                    </p>
                  </div>
                </CardBody>
              </Card>

              {/* Bid Controls */}
              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={() => setBidAmount((a) => Math.max(minimumBid, a - increment))}
                  disabled={bidAmount <= minimumBid}
                  className="flex h-14 w-14 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 transition-all active:bg-gray-100 disabled:opacity-30 touch-target"
                >
                  <Minus className="h-6 w-6" />
                </button>
                <div className="text-center flex-1">
                  <p className="text-xs text-gray-400">Your Bid</p>
                  <p className="bid-amount text-3xl">{formatCurrency(bidAmount, event?.currency)}</p>
                </div>
                <button
                  onClick={() => setBidAmount((a) => a + increment)}
                  className="flex h-14 w-14 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 transition-all active:bg-gray-100 touch-target"
                >
                  <Plus className="h-6 w-6" />
                </button>
              </div>

              <Button
                onClick={handleBid}
                loading={placing}
                className="btn-bid w-full text-xl"
                disabled={!guestId}
              >
                <Gavel className="h-5 w-5" />
                Bid {formatCurrency(bidAmount, event?.currency)}
              </Button>

              {!guestId && (
                <p className="text-center text-xs text-gray-400">
                  <Link href={`/events/${slug}/register`} className="text-brand-600 hover:underline">
                    Register
                  </Link>{' '}
                  to place bids
                </p>
              )}

              {/* Recent Bids Ticker */}
              {realtimeBids.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-gray-600">Recent Activity</h3>
                  <div className="space-y-1">
                    {realtimeBids.slice(0, 5).map((bid) => (
                      <div
                        key={bid.id}
                        className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm animate-slide-up"
                      >
                        <span className="text-gray-500">New bid</span>
                        <span className="font-bold text-brand-700">
                          {formatCurrency(bid.amount, event?.currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="py-12 text-center">
              <Gavel className="mx-auto h-10 w-10 text-gray-300 mb-3" />
              <p className="text-gray-500">No active live item at the moment.</p>
              <p className="mt-1 text-sm text-gray-400">
                Stay tuned - the next lot will appear here.
              </p>
              <Link href={`/events/${slug}/items`}>
                <Button variant="outline" className="mt-4">
                  Browse Silent Auction Items
                </Button>
              </Link>
            </div>
          )}

          {/* Donate quick action */}
          <Link href={`/events/${slug}/donate`}>
            <Card variant="bordered" className="hover:shadow-md transition-shadow cursor-pointer bg-brand-50 border-brand-200">
              <CardBody className="flex items-center gap-3 py-3">
                <Heart className="h-5 w-5 text-brand-600" />
                <span className="font-medium text-brand-700">Make a Donation</span>
              </CardBody>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
