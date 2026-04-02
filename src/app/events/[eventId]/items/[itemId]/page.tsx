'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, formatDate, getNextBidAmount } from '@/lib/utils';
import { useRealtimeBids } from '@/hooks/use-realtime-bids';
import { useBidStore } from '@/lib/store';
import { Button, Badge, Countdown, Card, CardBody, Modal } from '@/components/ui';
import { useToast } from '@/components/ui/toast';
import {
  ArrowLeft,
  Heart,
  Gavel,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  Zap,
  Clock,
  User,
  ShieldCheck,
} from 'lucide-react';
import type { Event, Item, Bid, Guest } from '@/types';

export default function ItemBiddingPage() {
  const params = useParams();
  const slug = params.eventId as string;
  const itemId = params.itemId as string;
  const { toast } = useToast();

  const [event, setEvent] = useState<Event | null>(null);
  const [item, setItem] = useState<Item | null>(null);
  const [bids, setBids] = useState<(Bid & { guest?: Pick<Guest, 'first_name' | 'last_name' | 'paddle_number'> })[]>([]);
  const [loading, setLoading] = useState(true);
  const [bidAmount, setBidAmount] = useState(0);
  const [placing, setPlacing] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [showProxyModal, setShowProxyModal] = useState(false);
  const [proxyMax, setProxyMax] = useState(0);
  const [placingProxy, setPlacingProxy] = useState(false);
  const [guestId, setGuestId] = useState<string | null>(null);

  // Real-time bid subscription
  useRealtimeBids(itemId);
  const realtimeBidData = useBidStore((s) => s.currentBids[itemId]);
  const realtimeBids = useBidStore((s) => s.bidsByItem[itemId]);
  const initBids = useBidStore((s) => s.initBids);

  // Determine current bid from realtime or initial data
  const currentBid = realtimeBidData?.amount ?? item?.current_bid ?? null;
  const increment = item?.bid_increment ?? event?.bid_increment ?? 500;
  const startingBid = item?.starting_bid ?? 0;
  const minimumBid = getNextBidAmount(currentBid, startingBid, increment);

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      // Try to get guest session
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

      if (!evt) {
        setLoading(false);
        return;
      }
      setEvent(evt);

      const { data: itm } = await supabase
        .from('items')
        .select('*')
        .eq('id', itemId)
        .single<Item>();

      if (itm) {
        setItem(itm);
        setBidAmount(getNextBidAmount(itm.current_bid, itm.starting_bid, itm.bid_increment ?? evt.bid_increment));
      }

      // Fetch recent bids
      const { data: bidData } = await supabase
        .from('bids')
        .select('*, guest:guests(first_name, last_name, paddle_number)')
        .eq('item_id', itemId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (bidData) {
        setBids(bidData);
        initBids(itemId, bidData);
      }

      setLoading(false);
    }
    load();
  }, [slug, itemId, initBids]);

  // Update bid amount when current bid changes from realtime
  useEffect(() => {
    if (realtimeBidData) {
      setBidAmount(getNextBidAmount(realtimeBidData.amount, startingBid, increment));
    }
  }, [realtimeBidData, startingBid, increment]);

  const gallery = useMemo(() => {
    if (!item) return [];
    const images = item.photo_url ? [item.photo_url] : [];
    return [...images, ...(item.gallery_urls || [])];
  }, [item]);

  const adjustBid = useCallback(
    (delta: number) => {
      setBidAmount((prev) => Math.max(minimumBid, prev + delta));
    },
    [minimumBid]
  );

  async function handlePlaceBid() {
    if (!guestId) {
      toast('error', 'Please register for this event to place a bid');
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
          item_id: itemId,
          guest_id: guestId,
          amount: bidAmount,
        }),
      });
      const result = await res.json();
      if (!res.ok) {
        toast('error', result.error || 'Failed to place bid');
        return;
      }
      toast('success', `Bid of ${formatCurrency(bidAmount)} placed!`);
      // Bid amount auto-updates via realtime
    } catch {
      toast('error', 'Something went wrong. Please try again.');
    } finally {
      setPlacing(false);
    }
  }

  async function handleBuyNow() {
    if (!guestId || !item?.buy_now_price) return;
    setPlacing(true);
    try {
      const res = await fetch('/api/bids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: itemId,
          guest_id: guestId,
          amount: item.buy_now_price,
        }),
      });
      const result = await res.json();
      if (!res.ok) {
        toast('error', result.error || 'Buy now failed');
        return;
      }
      toast('success', 'Item purchased!');
    } catch {
      toast('error', 'Something went wrong.');
    } finally {
      setPlacing(false);
    }
  }

  async function handleProxyBid() {
    if (!guestId) return;
    if (proxyMax < minimumBid) {
      toast('error', `Max bid must be at least ${formatCurrency(minimumBid)}`);
      return;
    }
    setPlacingProxy(true);
    try {
      const res = await fetch('/api/bids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: itemId,
          guest_id: guestId,
          amount: minimumBid,
          proxy_max: proxyMax,
        }),
      });
      const result = await res.json();
      if (!res.ok) {
        toast('error', result.error || 'Proxy bid failed');
        return;
      }
      toast('success', `Max bid of ${formatCurrency(proxyMax)} set! We'll bid for you.`);
      setShowProxyModal(false);
    } catch {
      toast('error', 'Something went wrong.');
    } finally {
      setPlacingProxy(false);
    }
  }

  const displayBids = realtimeBids || bids;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="skeleton h-80 w-full" />
        <div className="p-4 space-y-3">
          <div className="skeleton h-8 w-3/4" />
          <div className="skeleton h-6 w-1/2" />
          <div className="skeleton h-20 w-full" />
          <div className="skeleton h-14 w-full" />
        </div>
      </div>
    );
  }

  if (!item || !event) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Gavel className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-4 text-gray-500">Item not found</p>
          <Link href={`/events/${slug}/items`} className="mt-2 text-sm text-brand-600 hover:underline">
            Browse items
          </Link>
        </div>
      </div>
    );
  }

  const isActive = item.status === 'active';
  const isWinning = guestId && realtimeBidData?.winnerId === guestId;

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Photo Carousel */}
      <div className="relative bg-black">
        <div className="relative aspect-[4/3] sm:aspect-[16/9] max-h-[50vh]">
          {gallery.length > 0 ? (
            <Image
              src={gallery[galleryIndex]}
              alt={item.title}
              fill
              className="object-contain"
              priority
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gray-100">
              <Gavel className="h-16 w-16 text-gray-300" />
            </div>
          )}
        </div>

        {/* Carousel nav */}
        {gallery.length > 1 && (
          <>
            <button
              onClick={() => setGalleryIndex((i) => (i - 1 + gallery.length) % gallery.length)}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white backdrop-blur-sm touch-target"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => setGalleryIndex((i) => (i + 1) % gallery.length)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white backdrop-blur-sm touch-target"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
              {gallery.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setGalleryIndex(i)}
                  className={`h-2 w-2 rounded-full transition-colors ${
                    i === galleryIndex ? 'bg-white' : 'bg-white/40'
                  }`}
                />
              ))}
            </div>
          </>
        )}

        {/* Top bar */}
        <div className="absolute left-0 right-0 top-0 flex items-center justify-between p-3">
          <Link
            href={`/events/${slug}/items`}
            className="rounded-full bg-black/50 p-2 text-white backdrop-blur-sm touch-target"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <button
            onClick={() => setFavorited(!favorited)}
            className="rounded-full bg-black/50 p-2 backdrop-blur-sm touch-target"
          >
            <Heart
              className={`h-5 w-5 ${favorited ? 'fill-red-500 text-red-500' : 'text-white'}`}
            />
          </button>
        </div>
      </div>

      {/* Item Details */}
      <div className="px-4 pt-4 space-y-4">
        <div>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="neutral">Lot {item.lot_number}</Badge>
                <Badge variant={isActive ? 'success' : 'neutral'}>
                  {item.type}
                </Badge>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">{item.title}</h1>
            </div>
          </div>
          {item.donor_name && (
            <p className="mt-1 text-sm text-gray-400">
              Donated by {item.donor_name}
            </p>
          )}
        </div>

        {/* Current Bid Display */}
        <Card variant="bordered" className={isWinning ? 'ring-2 ring-green-500' : ''}>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-400">
                  {currentBid ? 'Current Bid' : 'Starting Bid'}
                </p>
                <p className="bid-amount">
                  {formatCurrency(currentBid || startingBid, event.currency)}
                </p>
                {item.bid_count > 0 && (
                  <p className="text-xs text-gray-400">{item.bid_count} bids</p>
                )}
              </div>
              <div className="text-right">
                {isActive && event.end_time && (
                  <>
                    <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Time Left</p>
                    <Countdown endsAt={event.end_time} />
                  </>
                )}
                {!isActive && (
                  <Badge variant="neutral" className="text-base">Closed</Badge>
                )}
              </div>
            </div>
            {isWinning && (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
                <ShieldCheck className="h-4 w-4" />
                You are the highest bidder!
              </div>
            )}
          </CardBody>
        </Card>

        {/* Description */}
        {item.description && (
          <div>
            <h2 className="mb-2 text-sm font-semibold text-gray-900">Description</h2>
            <p className="text-sm text-gray-600 leading-relaxed">{item.description}</p>
          </div>
        )}

        {/* Fair Market Value */}
        {item.fair_market_value && (
          <p className="text-sm text-gray-400">
            Fair Market Value: {formatCurrency(item.fair_market_value, event.currency)}
          </p>
        )}

        {/* Bid History */}
        {displayBids.length > 0 && (
          <div>
            <h2 className="mb-2 text-sm font-semibold text-gray-900">Recent Bids</h2>
            <div className="divide-y divide-gray-100 rounded-xl border border-gray-100 bg-white">
              {displayBids.slice(0, 10).map((bid, i) => (
                <div
                  key={bid.id}
                  className={`flex items-center justify-between px-3 py-2.5 ${
                    i === 0 ? 'bg-brand-50/50' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-600">
                      <User className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-sm text-gray-600">
                      {(bid as typeof bid & { guest?: Pick<Guest, 'first_name' | 'last_name' | 'paddle_number'> }).guest
                        ? `Paddle #${(bid as typeof bid & { guest: Pick<Guest, 'paddle_number'> }).guest.paddle_number || '?'}`
                        : `Bidder`}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold text-gray-900">
                      {formatCurrency(bid.amount, event.currency)}
                    </span>
                    <p className="text-xs text-gray-400">
                      {formatDate(bid.created_at, 'h:mm a')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Fixed Bottom Bid Bar */}
      {isActive && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white px-4 pb-[env(safe-area-inset-bottom,8px)] pt-3 shadow-lg">
          <div className="mx-auto max-w-lg">
            {/* Bid Amount Adjuster */}
            <div className="mb-3 flex items-center justify-between">
              <button
                onClick={() => adjustBid(-increment)}
                disabled={bidAmount <= minimumBid}
                className="flex h-12 w-12 items-center justify-center rounded-xl border border-gray-200 text-gray-600 transition-colors hover:bg-gray-50 active:bg-gray-100 disabled:opacity-30 touch-target"
              >
                <Minus className="h-5 w-5" />
              </button>
              <div className="text-center">
                <p className="text-xs text-gray-400">Your Bid</p>
                <p className="bid-amount">{formatCurrency(bidAmount, event.currency)}</p>
                <p className="text-xs text-gray-400">
                  Min: {formatCurrency(minimumBid, event.currency)}
                </p>
              </div>
              <button
                onClick={() => adjustBid(increment)}
                className="flex h-12 w-12 items-center justify-center rounded-xl border border-gray-200 text-gray-600 transition-colors hover:bg-gray-50 active:bg-gray-100 touch-target"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                onClick={handlePlaceBid}
                loading={placing}
                className="btn-bid flex-1"
                disabled={!guestId}
              >
                <Gavel className="h-5 w-5" />
                Place Bid
              </Button>
              <button
                onClick={() => {
                  setProxyMax(bidAmount * 2);
                  setShowProxyModal(true);
                }}
                className="flex h-14 w-14 items-center justify-center rounded-xl border-2 border-brand-200 text-brand-600 transition-colors hover:bg-brand-50 active:bg-brand-100 touch-target"
                title="Set Max Bid"
              >
                <Zap className="h-5 w-5" />
              </button>
            </div>

            {/* Buy Now */}
            {item.buy_now_price && (
              <Button
                variant="secondary"
                onClick={handleBuyNow}
                loading={placing}
                className="mt-2 w-full touch-target"
                disabled={!guestId}
              >
                Buy Now for {formatCurrency(item.buy_now_price, event.currency)}
              </Button>
            )}

            {!guestId && (
              <p className="mt-2 text-center text-xs text-gray-400">
                <Link href={`/events/${slug}/register`} className="text-brand-600 hover:underline">
                  Register
                </Link>{' '}
                to place bids
              </p>
            )}
          </div>
        </div>
      )}

      {/* Proxy Bid Modal */}
      <Modal
        open={showProxyModal}
        onClose={() => setShowProxyModal(false)}
        title="Set Max Bid"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            We&apos;ll automatically bid for you up to your maximum. You&apos;ll only pay the
            minimum needed to stay in the lead.
          </p>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Maximum Bid
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
              <input
                type="number"
                value={proxyMax / 100}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProxyMax(Math.round(parseFloat(e.target.value || '0') * 100))}
                min={minimumBid / 100}
                step={increment / 100}
                className="w-full rounded-lg border border-gray-300 py-3 pl-8 pr-4 text-lg font-bold text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
            <p className="mt-1 text-xs text-gray-400">
              Minimum: {formatCurrency(minimumBid, event.currency)}
            </p>
          </div>
          <Button
            onClick={handleProxyBid}
            loading={placingProxy}
            className="w-full touch-target"
            size="lg"
          >
            <Zap className="h-4 w-4" />
            Set Max Bid
          </Button>
        </div>
      </Modal>
    </div>
  );
}
