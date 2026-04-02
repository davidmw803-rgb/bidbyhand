'use client';

import Link from 'next/link';
import Image from 'next/image';
import { formatCurrency, cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Countdown } from '@/components/ui/countdown';
import { Heart, Gavel } from 'lucide-react';
import type { Item } from '@/types';
import { useState } from 'react';

type Props = {
  item: Item;
  eventSlug: string;
  showBidButton?: boolean;
  className?: string;
};

export function ItemCard({ item, eventSlug, showBidButton = true, className }: Props) {
  const [isFavorite, setIsFavorite] = useState(false);
  const photos = (item.photos as string[]) || [];
  const mainPhoto = photos[0];

  const displayBid = item.current_bid || item.starting_bid;
  const hasBids = (item.current_bid ?? 0) > 0;

  return (
    <div className={cn(
      'bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden transition-shadow hover:shadow-md',
      className
    )}>
      {/* Image */}
      <div className="relative aspect-[4/3] bg-gray-100">
        {mainPhoto ? (
          <Image
            src={mainPhoto}
            alt={item.title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
            <Gavel className="w-12 h-12" />
          </div>
        )}

        {/* Category badge */}
        {item.category && (
          <div className="absolute top-2 left-2">
            <Badge variant="info">{item.category}</Badge>
          </div>
        )}

        {/* Favorite button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            setIsFavorite(!isFavorite);
          }}
          className="absolute top-2 right-2 p-2 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white transition-colors"
        >
          <Heart
            className={cn('w-5 h-5', isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-400')}
          />
        </button>

        {/* Status overlay */}
        {item.status === 'closed' && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="text-white font-bold text-lg">CLOSED</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 truncate">{item.title}</h3>

        <div className="mt-2 flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-500 uppercase">
              {hasBids ? 'Current Bid' : 'Starting Bid'}
            </div>
            <div className="text-xl font-bold text-brand-700">
              {formatCurrency(displayBid)}
            </div>
          </div>

          {item.closes_at && item.status === 'active' && (
            <Countdown endsAt={item.closes_at} className="text-sm" />
          )}
        </div>

        {item.buy_now_price && item.status === 'active' && (
          <div className="mt-1 text-xs text-gray-500">
            Buy Now: {formatCurrency(item.buy_now_price)}
          </div>
        )}

        {showBidButton && item.status === 'active' && (
          <Link
            href={`/events/${eventSlug}/items/${item.id}`}
            className="mt-3 block w-full text-center py-2.5 px-4 bg-brand-600 text-white font-semibold rounded-lg hover:bg-brand-700 active:bg-brand-800 transition-colors"
          >
            {item.item_type === 'buy_now' ? 'Buy Now' : 'Bid Now'}
          </Link>
        )}
      </div>
    </div>
  );
}
