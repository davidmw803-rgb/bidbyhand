'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, timeRemaining } from '@/lib/utils';
import { Button, Badge, Countdown, EmptyState } from '@/components/ui';
import {
  Search,
  Gavel,
  ArrowLeft,
  Grid3x3,
  List,
} from 'lucide-react';
import type { Event, Item } from '@/types';

export default function ItemCatalogPage() {
  const params = useParams();
  const slug = params.eventId as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: evt } = await supabase
        .from('events')
        .select('*')
        .eq('slug', slug)
        .single<Event>();

      if (evt) {
        setEvent(evt);
        const { data } = await supabase
          .from('items')
          .select('*')
          .eq('event_id', evt.id)
          .eq('is_visible', true)
          .in('status', ['active', 'closed'])
          .order('sort_order', { ascending: true })
          .returns<Item[]>();
        setItems(data || []);
      }
      setLoading(false);
    }
    load();
  }, [slug]);

  const categories = useMemo(() => {
    const types = new Set(items.map((i) => i.type));
    return ['all', ...Array.from(types)];
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const matchCategory = category === 'all' || item.type === category;
      const matchSearch =
        !search ||
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        (item.description || '').toLowerCase().includes(search.toLowerCase()) ||
        item.lot_number.toLowerCase().includes(search.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [items, category, search]);

  const categoryLabels: Record<string, string> = {
    all: 'All Items',
    silent: 'Silent',
    live: 'Live',
    buy_now: 'Buy Now',
    donation: 'Donations',
    paddle_raise: 'Paddle Raise',
    raffle: 'Raffle',
    merchandise: 'Merch',
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="mx-auto max-w-4xl">
          <div className="skeleton mb-4 h-10 w-full" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="skeleton aspect-square w-full" />
                <div className="skeleton h-4 w-3/4" />
                <div className="skeleton h-4 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto max-w-4xl px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href={`/events/${slug}`}>
              <ArrowLeft className="h-5 w-5 text-gray-500" />
            </Link>
            <h1 className="flex-1 text-lg font-bold text-gray-900">
              {event?.name || 'Auction Items'}
            </h1>
            <button
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"
            >
              {viewMode === 'grid' ? <List className="h-5 w-5" /> : <Grid3x3 className="h-5 w-5" />}
            </button>
          </div>

          {/* Search */}
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search items..."
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          {/* Category Pills */}
          <div className="mt-3 -mx-4 px-4 overflow-x-auto scrollbar-hide">
            <div className="flex gap-2 pb-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`pill whitespace-nowrap ${
                    category === cat ? 'pill-active' : 'pill-inactive'
                  }`}
                >
                  {categoryLabels[cat] || cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Items */}
      <div className="mx-auto max-w-4xl px-4 py-4">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<Gavel className="h-10 w-10" />}
            title="No items found"
            description={search ? 'Try a different search term' : 'No items in this category'}
          />
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {filtered.map((item) => (
              <ItemGridCard key={item.id} item={item} slug={slug} currency={event?.currency || 'USD'} endTime={event?.end_time || ''} />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((item) => (
              <ItemListCard key={item.id} item={item} slug={slug} currency={event?.currency || 'USD'} endTime={event?.end_time || ''} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ItemGridCard({
  item,
  slug,
  currency,
  endTime,
}: {
  item: Item;
  slug: string;
  currency: string;
  endTime: string;
}) {
  const isActive = item.status === 'active';
  return (
    <Link
      href={`/events/${slug}/items/${item.id}`}
      className="card-auction group animate-fade-in"
    >
      <div className="relative aspect-square bg-gray-100">
        {item.photo_url ? (
          <Image src={item.photo_url} alt={item.title} fill className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-300">
            <Gavel className="h-8 w-8" />
          </div>
        )}
        <Badge
          variant={isActive ? 'success' : 'neutral'}
          className="absolute left-2 top-2"
        >
          Lot {item.lot_number}
        </Badge>
        {item.buy_now_price && isActive && (
          <Badge variant="warning" className="absolute right-2 top-2">
            Buy Now
          </Badge>
        )}
      </div>
      <div className="p-3">
        <h3 className="truncate text-sm font-medium text-gray-900 group-hover:text-brand-600">
          {item.title}
        </h3>
        <p className="mt-1 text-lg font-bold text-brand-700">
          {item.current_bid
            ? formatCurrency(item.current_bid, currency)
            : formatCurrency(item.starting_bid, currency)}
        </p>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-xs text-gray-400">
            {item.current_bid ? `${item.bid_count} bids` : 'Starting bid'}
          </span>
          {isActive && endTime && (
            <span className="text-xs text-gray-400">{timeRemaining(endTime)}</span>
          )}
        </div>
        {isActive && (
          <Button size="sm" className="mt-2 w-full">
            Bid Now
          </Button>
        )}
      </div>
    </Link>
  );
}

function ItemListCard({
  item,
  slug,
  currency,
  endTime,
}: {
  item: Item;
  slug: string;
  currency: string;
  endTime: string;
}) {
  const isActive = item.status === 'active';
  return (
    <Link
      href={`/events/${slug}/items/${item.id}`}
      className="card-auction flex animate-fade-in"
    >
      <div className="relative h-24 w-24 flex-shrink-0 bg-gray-100 sm:h-28 sm:w-28">
        {item.photo_url ? (
          <Image src={item.photo_url} alt={item.title} fill className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-300">
            <Gavel className="h-6 w-6" />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col justify-between p-3">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-medium text-gray-900">{item.title}</h3>
            <Badge variant={isActive ? 'success' : 'neutral'} className="flex-shrink-0">
              Lot {item.lot_number}
            </Badge>
          </div>
          <p className="mt-0.5 text-xs text-gray-400">
            {item.current_bid ? `${item.bid_count} bids` : 'No bids yet'}
            {isActive && endTime && ` · ${timeRemaining(endTime)}`}
          </p>
        </div>
        <div className="flex items-end justify-between">
          <span className="text-lg font-bold text-brand-700">
            {item.current_bid
              ? formatCurrency(item.current_bid, currency)
              : formatCurrency(item.starting_bid, currency)}
          </span>
          {isActive && (
            <Button size="sm">Bid</Button>
          )}
        </div>
      </div>
    </Link>
  );
}
