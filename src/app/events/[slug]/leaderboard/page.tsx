'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { useRealtimeEventBids } from '@/hooks/use-realtime-bids';
import { Card, CardBody, Badge, Tabs } from '@/components/ui';
import {
  ArrowLeft,
  Trophy,
  TrendingUp,
  Crown,
  Flame,
} from 'lucide-react';
import type { Event } from '@/types';

interface TopBidder {
  id: string;
  first_name: string;
  last_name: string;
  paddle_number: number | null;
  total_spent: number;
  bid_count: number;
}

interface TopItem {
  id: string;
  title: string;
  lot_number: string;
  current_bid: number | null;
  bid_count: number;
}

export default function LeaderboardPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [topBidders, setTopBidders] = useState<TopBidder[]>([]);
  const [topItems, setTopItems] = useState<TopItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();

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

      // Fetch top items by current bid
      const { data: items } = await supabase
        .from('items')
        .select('id, title, lot_number, current_bid, bid_count')
        .eq('event_id', evt.id)
        .not('current_bid', 'is', null)
        .order('current_bid', { ascending: false })
        .limit(10);

      setTopItems((items as TopItem[]) || []);

      // Fetch top bidders via RPC or aggregation
      const { data: bidders } = await supabase.rpc('get_top_bidders', {
        p_event_id: evt.id,
        p_limit: 10,
      });

      setTopBidders((bidders as TopBidder[]) || []);
      setLoading(false);
    }
    load();
  }, [slug]);

  // Real-time updates
  useRealtimeEventBids(event?.id || '');

  const medalColors = ['text-yellow-500', 'text-gray-400', 'text-amber-700'];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="mx-auto max-w-lg space-y-3">
          <div className="skeleton h-8 w-48" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton h-16 w-full" />
          ))}
        </div>
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
          <Trophy className="h-5 w-5 text-brand-600" />
          <h1 className="text-lg font-bold text-gray-900">Leaderboard</h1>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 py-4">
        <Tabs
          items={[
            {
              label: 'Top Bidders',
              content: (
                <div className="space-y-2">
                  {topBidders.length === 0 ? (
                    <p className="py-8 text-center text-sm text-gray-400">
                      No bids yet. Be the first!
                    </p>
                  ) : (
                    topBidders.map((bidder, i) => (
                      <Card key={bidder.id} variant="bordered">
                        <CardBody className="flex items-center gap-3 py-3">
                          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center">
                            {i < 3 ? (
                              <Crown className={`h-6 w-6 ${medalColors[i]}`} />
                            ) : (
                              <span className="text-lg font-bold text-gray-300">
                                {i + 1}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="truncate font-medium text-gray-900">
                              {bidder.first_name} {bidder.last_name.charAt(0)}.
                            </p>
                            <p className="text-xs text-gray-400">
                              {bidder.paddle_number
                                ? `Paddle #${bidder.paddle_number}`
                                : `${bidder.bid_count} bids`}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-brand-700">
                              {formatCurrency(bidder.total_spent, event?.currency)}
                            </p>
                          </div>
                        </CardBody>
                      </Card>
                    ))
                  )}
                </div>
              ),
            },
            {
              label: 'Hot Items',
              content: (
                <div className="space-y-2">
                  {topItems.length === 0 ? (
                    <p className="py-8 text-center text-sm text-gray-400">
                      No active items yet.
                    </p>
                  ) : (
                    topItems.map((item, i) => (
                      <Link key={item.id} href={`/events/${slug}/items/${item.id}`}>
                        <Card variant="bordered" className="hover:shadow-md transition-shadow">
                          <CardBody className="flex items-center gap-3 py-3">
                            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center">
                              {i < 3 ? (
                                <Flame className={`h-6 w-6 ${medalColors[i]}`} />
                              ) : (
                                <span className="text-lg font-bold text-gray-300">
                                  {i + 1}
                                </span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="truncate font-medium text-gray-900">
                                {item.title}
                              </p>
                              <p className="text-xs text-gray-400">
                                Lot {item.lot_number} &middot; {item.bid_count} bids
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-brand-700">
                                {formatCurrency(item.current_bid || 0, event?.currency)}
                              </p>
                              <Badge variant="success" className="mt-0.5">
                                <TrendingUp className="mr-1 h-3 w-3" />
                                Active
                              </Badge>
                            </div>
                          </CardBody>
                        </Card>
                      </Link>
                    ))
                  )}
                </div>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}
