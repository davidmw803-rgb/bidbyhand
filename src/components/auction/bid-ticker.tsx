'use client';

import { useBidStore } from '@/lib/store';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';

export function BidTicker({ className }: { className?: string }) {
  const { recentBids } = useBidStore();

  if (recentBids.length === 0) {
    return (
      <div className={cn('bg-gray-100 rounded-lg p-4 text-center text-gray-500', className)}>
        No bids yet — be the first!
      </div>
    );
  }

  return (
    <div className={cn('space-y-2 overflow-hidden', className)}>
      {recentBids.map((bid, i) => (
        <div
          key={bid.id}
          className={cn(
            'flex items-center justify-between px-3 py-2 rounded-lg text-sm animate-slide-up',
            i === 0 ? 'bg-brand-50 border border-brand-200' : 'bg-gray-50'
          )}
        >
          <span className="font-medium text-gray-700 truncate">
            Paddle #{bid.guest_id.slice(0, 4)}
          </span>
          <span className="font-bold text-brand-700">
            {formatCurrency(bid.amount)}
          </span>
        </div>
      ))}
    </div>
  );
}
