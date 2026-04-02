'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useRealtimeEventBids } from '@/hooks';
import { useBidStore } from '@/lib/store';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { FundraisingThermometer } from '@/components/auction/fundraising-thermometer';
import { BidTicker } from '@/components/auction/bid-ticker';
import { Leaderboard } from '@/components/auction/leaderboard';

type EventData = {
  name: string;
  goal_amount: number | null;
  status: string;
};

type ItemSummary = {
  id: string;
  title: string;
  lot_number: string;
  current_bid: number | null;
  bid_count: number;
};

type BidderSummary = {
  id: string;
  first_name: string;
  last_name: string;
  paddle_number: number | null;
  total_spent: number;
};

export default function LiveDashboardPage() {
  const params = useParams<{ eventId: string }>();
  const eventId = params.eventId;

  const [event, setEvent] = useState<EventData | null>(null);
  const [topItems, setTopItems] = useState<ItemSummary[]>([]);
  const [topBidders, setTopBidders] = useState<BidderSummary[]>([]);
  const [totalRaised, setTotalRaised] = useState(0);
  const [activeBidders, setActiveBidders] = useState(0);
  const [totalBidsCount, setTotalBidsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Modals
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Animated total
  const [displayTotal, setDisplayTotal] = useState(0);

  // Subscribe to real-time bids
  useRealtimeEventBids(eventId);
  const { recentBids } = useBidStore();

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/reports?type=summary`);
      if (!res.ok) return;
      const { data } = await res.json();
      setEvent(data.event);
      setTopItems((data.topItems || []).slice(0, 10));
      setTopBidders((data.topBidders || []).slice(0, 10));
      setTotalRaised(data.totalRaised || 0);
      setActiveBidders(data.activeBidders || 0);
      setTotalBidsCount(data.totalBids || 0);
    } catch {
      // silently fail on live refresh
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Refresh data when new realtime bids come in
  useEffect(() => {
    if (recentBids.length > 0) {
      fetchData();
    }
  }, [recentBids.length, fetchData]);

  // Animate total raised counter
  useEffect(() => {
    if (totalRaised === displayTotal) return;
    const diff = totalRaised - displayTotal;
    const step = Math.max(1, Math.ceil(Math.abs(diff) / 30));
    const timer = setInterval(() => {
      setDisplayTotal((prev) => {
        const next = diff > 0 ? Math.min(prev + step, totalRaised) : Math.max(prev - step, totalRaised);
        if (next === totalRaised) clearInterval(timer);
        return next;
      });
    }, 20);
    return () => clearInterval(timer);
  }, [totalRaised, displayTotal]);

  async function handleAction(action: string, payload?: Record<string, string>) {
    setActionLoading(true);
    try {
      await fetch(`/api/events/${eventId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...payload }),
      });
      fetchData();
    } catch {
      // silently fail
    } finally {
      setActionLoading(false);
    }
  }

  async function sendNotification() {
    if (!notificationMessage.trim()) return;
    await handleAction('send_notification', { message: notificationMessage });
    setNotificationMessage('');
    setNotificationOpen(false);
  }

  async function confirmCloseAuction() {
    await handleAction('close_auction');
    setConfirmCloseOpen(false);
  }

  // Build leaderboard entries
  const itemLeaderboard = topItems.map((item, i) => ({
    id: item.id,
    name: `#${item.lot_number} ${item.title}`,
    amount: item.current_bid || 0,
    rank: i + 1,
  }));

  const bidderLeaderboard = topBidders.map((b, i) => ({
    id: b.id,
    name: `${b.first_name} ${b.last_name}${b.paddle_number ? ` (#${b.paddle_number})` : ''}`,
    amount: b.total_spent,
    rank: i + 1,
  }));

  if (loading) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center bg-gray-950">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-400 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="-m-4 min-h-screen bg-gray-950 p-4 sm:-m-6 sm:p-6 lg:-m-8 lg:p-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-white sm:text-2xl">
            {event?.name || 'Live Dashboard'}
          </h1>
          <Badge variant="success">
            <span className="mr-1.5 inline-block h-2 w-2 animate-pulse rounded-full bg-green-400" />
            Live
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            className="border-gray-600 bg-gray-800 text-gray-200 hover:bg-gray-700"
            onClick={() => setNotificationOpen(true)}
          >
            Send Push Notification
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-gray-600 bg-gray-800 text-gray-200 hover:bg-gray-700"
            loading={actionLoading}
            onClick={() => handleAction('extend_all')}
          >
            Extend All Items +5 min
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => setConfirmCloseOpen(true)}
          >
            Close Auction
          </Button>
        </div>
      </div>

      {/* Fundraising Thermometer - prominent */}
      {event?.goal_amount && (
        <div className="mb-8 rounded-2xl border border-gray-800 bg-gray-900 p-6 sm:p-8">
          <FundraisingThermometer
            currentAmount={totalRaised}
            goalAmount={event.goal_amount}
            animated
            className="[&_div.text-3xl]:text-5xl [&_div.text-3xl]:text-emerald-400 [&_div.text-3xl]:drop-shadow-[0_0_12px_rgba(52,211,153,0.5)] [&_div.text-sm]:text-gray-400 [&_div.text-lg]:text-gray-300"
          />
        </div>
      )}

      {/* Glowing total raised */}
      <div className="mb-8 text-center">
        <p className="text-sm font-medium uppercase tracking-widest text-gray-500">
          Total Raised
        </p>
        <p className="mt-2 text-5xl font-extrabold tabular-nums text-emerald-400 drop-shadow-[0_0_20px_rgba(52,211,153,0.6)] sm:text-6xl lg:text-7xl">
          {formatCurrency(displayTotal)}
        </p>
      </div>

      {/* Stats row */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Active Bidders
          </p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-white">
            {activeBidders}
          </p>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Total Bids
          </p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-white">
            {totalBidsCount}
          </p>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Top Items
          </p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-white">
            {topItems.length}
          </p>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Goal Progress
          </p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-emerald-400">
            {event?.goal_amount
              ? `${Math.round((totalRaised / event.goal_amount) * 100)}%`
              : '--'}
          </p>
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Bid Ticker */}
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 lg:col-span-1">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400">
            Live Bid Feed
          </h3>
          <div className="max-h-[500px] overflow-y-auto">
            <BidTicker
              className="[&>div]:border-gray-700 [&>div]:bg-gray-800 [&_span.text-gray-700]:text-gray-300 [&_span.text-brand-700]:text-emerald-400 [&>div:first-child]:bg-gray-800 [&>div:first-child]:border-emerald-700"
            />
          </div>
        </div>

        {/* Leaderboards */}
        <div className="space-y-6 lg:col-span-2">
          <Leaderboard
            title="Top 10 Items by Current Bid"
            entries={itemLeaderboard}
            type="items"
            className="border-gray-800 bg-gray-900 [&_h3]:text-white [&_div.bg-gray-50]:bg-gray-800 [&_div.bg-brand-50]:bg-gray-800/80 [&_span.text-gray-700]:text-gray-300 [&_span.text-brand-700]:text-emerald-400 [&_span.text-brand-600]:text-emerald-400"
          />
          <Leaderboard
            title="Top 10 Bidders by Total Spend"
            entries={bidderLeaderboard}
            type="bidders"
            className="border-gray-800 bg-gray-900 [&_h3]:text-white [&_div.bg-gray-50]:bg-gray-800 [&_div.bg-brand-50]:bg-gray-800/80 [&_span.text-gray-700]:text-gray-300 [&_span.text-brand-700]:text-emerald-400 [&_span.text-brand-600]:text-emerald-400"
          />
        </div>
      </div>

      {/* Send Notification Modal */}
      <Modal
        open={notificationOpen}
        onClose={() => setNotificationOpen(false)}
        title="Send Push Notification"
      >
        <div className="space-y-4">
          <Input
            label="Message"
            name="notification-message"
            variant="textarea"
            placeholder="Type your announcement message..."
            value={notificationMessage}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setNotificationMessage(e.target.value)
            }
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setNotificationOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              loading={actionLoading}
              disabled={!notificationMessage.trim()}
              onClick={sendNotification}
            >
              Send Notification
            </Button>
          </div>
        </div>
      </Modal>

      {/* Close Auction Confirmation Modal */}
      <Modal
        open={confirmCloseOpen}
        onClose={() => setConfirmCloseOpen(false)}
        title="Close Auction"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to close the auction? This will end bidding on
            all items. This action cannot be easily undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setConfirmCloseOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={actionLoading}
              onClick={confirmCloseAuction}
            >
              Yes, Close Auction
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
