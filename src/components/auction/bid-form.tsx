'use client';

import { useState } from 'react';
import { formatCurrency, getNextBidAmount, isValidBid, cn } from '@/lib/utils';
import { Minus, Plus, Gavel, Zap, Shield } from 'lucide-react';

type Props = {
  itemId: string;
  currentBid: number;
  startingBid: number;
  bidIncrement: number;
  buyNowPrice?: number;
  reservePrice?: number;
  guestId: string;
  onBidPlaced?: () => void;
  className?: string;
};

export function BidForm({
  itemId,
  currentBid,
  startingBid,
  bidIncrement,
  buyNowPrice,
  reservePrice,
  guestId,
  onBidPlaced,
  className,
}: Props) {
  const minimumBid = getNextBidAmount(currentBid, startingBid, bidIncrement);
  const [bidAmount, setBidAmount] = useState(minimumBid);
  const [proxyMax, setProxyMax] = useState<number | null>(null);
  const [showProxy, setShowProxy] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function incrementBid() {
    setBidAmount((prev) => prev + bidIncrement);
  }

  function decrementBid() {
    setBidAmount((prev) => Math.max(minimumBid, prev - bidIncrement));
  }

  async function placeBid(amount: number, isBuyNow = false) {
    if (!isValidBid(amount, currentBid, startingBid, bidIncrement) && !isBuyNow) {
      setError(`Minimum bid is ${formatCurrency(minimumBid)}`);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/bids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: itemId,
          guest_id: guestId,
          amount,
          proxy_max: showProxy ? proxyMax : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to place bid');
        return;
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
      setBidAmount(amount + bidIncrement);
      onBidPlaced?.();
    } catch {
      setError('Network error. Your bid has been queued.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Current bid display */}
      <div className="text-center">
        <div className="text-sm text-gray-500 uppercase tracking-wide">
          {currentBid > 0 ? 'Current Bid' : 'Starting Bid'}
        </div>
        <div className="text-4xl font-bold text-brand-700 mt-1">
          {formatCurrency(currentBid || startingBid)}
        </div>
        {reservePrice && currentBid < reservePrice && (
          <div className="text-xs text-warning-700 mt-1 flex items-center justify-center gap-1">
            <Shield className="w-3 h-3" />
            Reserve not met
          </div>
        )}
      </div>

      {/* Bid amount selector */}
      <div className="flex items-center gap-3 justify-center">
        <button
          onClick={decrementBid}
          disabled={bidAmount <= minimumBid}
          className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 disabled:opacity-30 active:bg-gray-300 transition-colors"
        >
          <Minus className="w-5 h-5" />
        </button>

        <div className="text-3xl font-bold text-gray-900 min-w-[160px] text-center">
          {formatCurrency(bidAmount)}
        </div>

        <button
          onClick={incrementBid}
          className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 active:bg-gray-300 transition-colors"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="text-center text-xs text-gray-400">
        Minimum bid: {formatCurrency(minimumBid)} (increment: {formatCurrency(bidIncrement)})
      </div>

      {/* Place bid button */}
      <button
        onClick={() => placeBid(bidAmount)}
        disabled={isSubmitting || bidAmount < minimumBid}
        className={cn(
          'w-full py-4 px-6 rounded-xl font-bold text-lg transition-all shadow-lg active:scale-[0.98]',
          success
            ? 'bg-success-500 text-white'
            : 'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800',
          (isSubmitting || bidAmount < minimumBid) && 'opacity-50 cursor-not-allowed'
        )}
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Placing bid...
          </span>
        ) : success ? (
          <span className="flex items-center justify-center gap-2">
            ✓ Bid placed!
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <Gavel className="w-5 h-5" />
            Place Bid — {formatCurrency(bidAmount)}
          </span>
        )}
      </button>

      {/* Proxy bid toggle */}
      <div>
        <button
          onClick={() => setShowProxy(!showProxy)}
          className="text-sm text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1"
        >
          <Zap className="w-4 h-4" />
          {showProxy ? 'Hide auto-bid' : 'Set max auto-bid'}
        </button>

        {showProxy && (
          <div className="mt-2 p-3 bg-brand-50 rounded-lg">
            <label className="text-xs text-brand-700 font-medium">
              Maximum amount (system bids for you automatically)
            </label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
              <input
                type="number"
                value={proxyMax ? proxyMax / 100 : ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProxyMax(Math.round(parseFloat(e.target.value) * 100))}
                placeholder="Enter max amount"
                className="w-full pl-8 pr-4 py-2 rounded-lg border border-brand-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none text-sm"
                min={minimumBid / 100}
                step={bidIncrement / 100}
              />
            </div>
            <p className="text-xs text-brand-600 mt-1">
              We'll automatically bid the minimum needed to keep you winning, up to your max.
            </p>
          </div>
        )}
      </div>

      {/* Buy Now button */}
      {buyNowPrice && (
        <button
          onClick={() => placeBid(buyNowPrice, true)}
          disabled={isSubmitting}
          className="w-full py-3 px-4 rounded-xl font-semibold border-2 border-success-500 text-success-700 hover:bg-success-50 active:bg-success-100 transition-all"
        >
          Buy Now — {formatCurrency(buyNowPrice)}
        </button>
      )}

      {/* Error display */}
      {error && (
        <div className="p-3 bg-danger-50 border border-red-200 rounded-lg text-red-700 text-sm text-center">
          {error}
        </div>
      )}
    </div>
  );
}
