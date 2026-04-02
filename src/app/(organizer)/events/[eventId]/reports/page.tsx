import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import { formatCurrency } from '@/lib/utils';
import type { Item, Guest, Bid, Donation, Payment, Invoice } from '@/types';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs } from '@/components/ui/tabs';
import { DataTable, type Column } from '@/components/ui/data-table';
import { ReportsClient } from './reports-client';

export default async function ReportsPage({
  params,
}: {
  params: { eventId: string };
}) {
  const supabase = createServerSupabase();

  const { data: event } = await supabase
    .from('events')
    .select('id, name, goal_amount')
    .eq('id', params.eventId)
    .single();

  if (!event) redirect('/events');

  // Fetch all data in parallel
  const [itemsRes, bidsRes, guestsRes, donationsRes, invoicesRes, paymentsRes] =
    await Promise.all([
      supabase
        .from('items')
        .select('*')
        .eq('event_id', params.eventId)
        .order('sort_order', { ascending: true }),
      supabase
        .from('bids')
        .select('*')
        .in(
          'item_id',
          (
            await supabase
              .from('items')
              .select('id')
              .eq('event_id', params.eventId)
          ).data?.map((i) => i.id) || []
        ),
      supabase
        .from('guests')
        .select('*')
        .eq('event_id', params.eventId),
      supabase
        .from('donations')
        .select('*, guest:guest_id(first_name, last_name), fundraising_page:fundraising_page_id(title)')
        .eq('event_id', params.eventId),
      supabase
        .from('invoices')
        .select('*')
        .eq('event_id', params.eventId),
      supabase
        .from('payments')
        .select('*, invoice:invoice_id(guest_id, invoice_number)')
        .in(
          'invoice_id',
          (
            await supabase
              .from('invoices')
              .select('id')
              .eq('event_id', params.eventId)
          ).data?.map((i) => i.id) || []
        ),
    ]);

  const items = (itemsRes.data || []) as Item[];
  const bids = (bidsRes.data || []) as Bid[];
  const guests = (guestsRes.data || []) as Guest[];
  const donations = (donationsRes.data || []) as (Donation & {
    guest?: { first_name: string; last_name: string } | null;
    fundraising_page?: { title: string } | null;
  })[];
  const invoices = (invoicesRes.data || []) as Invoice[];
  const payments = (paymentsRes.data || []) as (Payment & {
    invoice?: { guest_id: string; invoice_number: string } | null;
  })[];

  // Compute summary stats
  const totalItemRevenue = items.reduce(
    (sum, i) => sum + (i.current_bid || 0),
    0
  );
  const totalDonations = donations.reduce((sum, d) => sum + d.amount, 0);
  const totalRaised = totalItemRevenue + totalDonations;
  const itemsSold = items.filter(
    (i) => i.status === 'closed' && i.current_bid
  ).length;
  const avgSalePrice =
    itemsSold > 0
      ? Math.round(
          items
            .filter((i) => i.status === 'closed' && i.current_bid)
            .reduce((sum, i) => sum + (i.current_bid || 0), 0) / itemsSold
        )
      : 0;
  const uniqueBidders = new Set(bids.map((b) => b.guest_id)).size;
  const itemsWithReserve = items.filter((i) => i.fair_market_value);
  const metReserve = itemsWithReserve.filter(
    (i) => (i.current_bid || 0) >= (i.fair_market_value || 0)
  ).length;
  const reservePct =
    itemsWithReserve.length > 0
      ? Math.round((metReserve / itemsWithReserve.length) * 100)
      : 0;

  // Build bidder summary
  const bidderMap = new Map<
    string,
    { guest: Guest; bidsPlaced: number; itemsWon: number; totalSpent: number }
  >();

  for (const guest of guests) {
    bidderMap.set(guest.id, {
      guest,
      bidsPlaced: 0,
      itemsWon: 0,
      totalSpent: 0,
    });
  }

  for (const bid of bids) {
    const entry = bidderMap.get(bid.guest_id);
    if (entry) entry.bidsPlaced++;
  }

  for (const item of items) {
    if (item.winner_id && item.current_bid) {
      const entry = bidderMap.get(item.winner_id);
      if (entry) {
        entry.itemsWon++;
        entry.totalSpent += item.current_bid;
      }
    }
  }

  const bidderSummary = Array.from(bidderMap.values())
    .filter((b) => b.bidsPlaced > 0)
    .sort((a, b) => b.totalSpent - a.totalSpent);

  // Winner map for item reports
  const guestMap = Object.fromEntries(
    guests.map((g) => [g.id, `${g.first_name} ${g.last_name}`])
  );

  // Donation summary by campaign
  const campaignMap = new Map<string, number>();
  for (const d of donations) {
    const key = d.fundraising_page?.title || 'General';
    campaignMap.set(key, (campaignMap.get(key) || 0) + d.amount);
  }
  const campaignSummary = Array.from(campaignMap.entries())
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total);

  // Build payment rows with guest name
  const paymentRows = payments.map((p) => {
    const guestId = p.invoice?.guest_id;
    const guestName = guestId ? guestMap[guestId] || '--' : '--';
    return {
      id: p.id,
      guestName,
      invoiceNumber: p.invoice?.invoice_number || '--',
      method: p.method,
      status: p.status,
      amount: p.amount,
      createdAt: p.created_at,
    };
  });

  // Build individual donation rows
  const donationRows = donations.map((d) => ({
    id: d.id,
    donorName: d.guest
      ? `${d.guest.first_name} ${d.guest.last_name}`
      : d.anonymous
      ? 'Anonymous'
      : '--',
    amount: d.amount,
    campaign: d.fundraising_page?.title || 'General',
    message: d.message || '',
    anonymous: d.anonymous,
    createdAt: d.created_at,
  }));

  return (
    <ReportsClient
      eventId={params.eventId}
      goalAmount={event.goal_amount}
      summary={{
        totalRaised,
        itemsSold,
        avgSalePrice,
        uniqueBidders,
        donationCount: donations.length,
        donationTotal: totalDonations,
        reservePct,
      }}
      items={items.map((i) => ({
        id: i.id,
        title: `#${i.lot_number} ${i.title}`,
        starting_bid: i.starting_bid,
        current_bid: i.current_bid,
        fair_market_value: i.fair_market_value,
        pctOverFmv:
          i.fair_market_value && i.current_bid
            ? Math.round(
                ((i.current_bid - i.fair_market_value) /
                  i.fair_market_value) *
                  100
              )
            : null,
        winner: i.winner_id ? guestMap[i.winner_id] || '--' : '--',
      }))}
      bidders={bidderSummary.map((b) => ({
        id: b.guest.id,
        name: `${b.guest.first_name} ${b.guest.last_name}`,
        email: b.guest.email,
        bidsPlaced: b.bidsPlaced,
        itemsWon: b.itemsWon,
        totalSpent: b.totalSpent,
      }))}
      campaigns={campaignSummary}
      donations={donationRows}
      payments={paymentRows}
    />
  );
}
