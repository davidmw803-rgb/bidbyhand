'use client';

import React from 'react';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs } from '@/components/ui/tabs';
import { ProgressBar } from '@/components/ui/progress-bar';
import { DataTable, type Column } from '@/components/ui/data-table';

type ItemReport = {
  id: string;
  title: string;
  starting_bid: number;
  current_bid: number | null;
  fair_market_value: number | null;
  pctOverFmv: number | null;
  winner: string;
};

type BidderReport = {
  id: string;
  name: string;
  email: string;
  bidsPlaced: number;
  itemsWon: number;
  totalSpent: number;
};

type CampaignReport = {
  name: string;
  total: number;
};

type DonationReport = {
  id: string;
  donorName: string;
  amount: number;
  campaign: string;
  message: string;
  anonymous: boolean;
  createdAt: string;
};

type PaymentReport = {
  id: string;
  guestName: string;
  invoiceNumber: string;
  method: string;
  status: string;
  amount: number;
  createdAt: string;
};

interface ReportsClientProps {
  eventId: string;
  goalAmount: number | null;
  summary: {
    totalRaised: number;
    itemsSold: number;
    avgSalePrice: number;
    uniqueBidders: number;
    donationCount: number;
    donationTotal: number;
    reservePct: number;
  };
  items: ItemReport[];
  bidders: BidderReport[];
  campaigns: CampaignReport[];
  donations: DonationReport[];
  payments: PaymentReport[];
}

function downloadCSV(filename: string, headers: string[], rows: string[][]) {
  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ReportsClient({
  eventId,
  goalAmount,
  summary,
  items,
  bidders,
  campaigns,
  donations,
  payments,
}: ReportsClientProps) {
  const itemColumns: Column<ItemReport>[] = [
    { key: 'title', header: 'Item Name', sortable: true },
    {
      key: 'starting_bid',
      header: 'Starting Bid',
      sortable: true,
      render: (i) => formatCurrency(i.starting_bid),
    },
    {
      key: 'current_bid',
      header: 'Final Price',
      sortable: true,
      render: (i) => (i.current_bid ? formatCurrency(i.current_bid) : '--'),
    },
    {
      key: 'fair_market_value',
      header: 'FMV',
      hideMobile: true,
      render: (i) =>
        i.fair_market_value ? formatCurrency(i.fair_market_value) : '--',
    },
    {
      key: 'pctOverFmv',
      header: '% Over FMV',
      sortable: true,
      hideMobile: true,
      render: (i) =>
        i.pctOverFmv !== null ? (
          <Badge variant={i.pctOverFmv >= 0 ? 'success' : 'danger'}>
            {i.pctOverFmv >= 0 ? '+' : ''}
            {i.pctOverFmv}%
          </Badge>
        ) : (
          '--'
        ),
    },
    { key: 'winner', header: 'Winner Name', sortable: true },
  ];

  const bidderColumns: Column<BidderReport>[] = [
    { key: 'name', header: 'Name', sortable: true },
    { key: 'email', header: 'Email', sortable: true, hideMobile: true },
    { key: 'bidsPlaced', header: 'Bids Placed', sortable: true },
    { key: 'itemsWon', header: 'Items Won', sortable: true },
    {
      key: 'totalSpent',
      header: 'Total Spent',
      sortable: true,
      render: (b) => formatCurrency(b.totalSpent),
    },
  ];

  const donationColumns: Column<DonationReport>[] = [
    { key: 'donorName', header: 'Donor', sortable: true },
    {
      key: 'amount',
      header: 'Amount',
      sortable: true,
      render: (d) => formatCurrency(d.amount),
    },
    { key: 'campaign', header: 'Campaign', sortable: true },
    {
      key: 'anonymous',
      header: 'Anonymous',
      hideMobile: true,
      render: (d) =>
        d.anonymous ? (
          <Badge variant="neutral">Yes</Badge>
        ) : (
          'No'
        ),
    },
    {
      key: 'createdAt',
      header: 'Date',
      sortable: true,
      hideMobile: true,
      render: (d) => formatDateTime(d.createdAt),
    },
  ];

  const paymentColumns: Column<PaymentReport>[] = [
    { key: 'guestName', header: 'Guest Name', sortable: true },
    {
      key: 'amount',
      header: 'Amount',
      sortable: true,
      render: (p) => formatCurrency(p.amount),
    },
    {
      key: 'method',
      header: 'Method',
      render: (p) => (
        <Badge variant="neutral">{p.method}</Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (p) => (
        <Badge
          variant={
            p.status === 'succeeded'
              ? 'success'
              : p.status === 'failed'
              ? 'danger'
              : p.status === 'refunded'
              ? 'warning'
              : 'neutral'
          }
        >
          {p.status}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      header: 'Date',
      sortable: true,
      hideMobile: true,
      render: (p) => formatDateTime(p.createdAt),
    },
  ];

  const summaryTab = (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Card>
          <CardBody>
            <p className="text-sm font-medium text-gray-500">Total Raised</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {formatCurrency(summary.totalRaised)}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-sm font-medium text-gray-500">Items Sold</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {summary.itemsSold}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-sm font-medium text-gray-500">Avg Sale Price</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {formatCurrency(summary.avgSalePrice)}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-sm font-medium text-gray-500">Unique Bidders</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {summary.uniqueBidders}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-sm font-medium text-gray-500">Donations</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {summary.donationCount}
            </p>
            <p className="text-xs text-gray-400">
              {formatCurrency(summary.donationTotal)} total
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-sm font-medium text-gray-500">Met Reserve</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {summary.reservePct}%
            </p>
          </CardBody>
        </Card>
      </div>

      {goalAmount && (
        <Card>
          <CardBody>
            <h3 className="mb-3 text-sm font-semibold text-gray-900">
              Goal Progress
            </h3>
            <ProgressBar
              current={summary.totalRaised / 100}
              goal={goalAmount / 100}
            />
            <p className="mt-2 text-sm text-gray-500">
              {Math.round((summary.totalRaised / goalAmount) * 100)}% of{' '}
              {formatCurrency(goalAmount)} goal
            </p>
          </CardBody>
        </Card>
      )}

      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            downloadCSV(
              'summary.csv',
              ['Metric', 'Value'],
              [
                ['Total Raised', (summary.totalRaised / 100).toString()],
                ['Items Sold', summary.itemsSold.toString()],
                ['Avg Sale Price', (summary.avgSalePrice / 100).toString()],
                ['Unique Bidders', summary.uniqueBidders.toString()],
                ['Donations', summary.donationCount.toString()],
                ['Donation Total', (summary.donationTotal / 100).toString()],
                ['Met Reserve %', summary.reservePct.toString()],
              ]
            )
          }
        >
          Export CSV
        </Button>
      </div>
    </div>
  );

  const itemsTab = (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            downloadCSV(
              'items-report.csv',
              ['Item Name', 'Starting Bid', 'Final Price', 'FMV', '% Over FMV', 'Winner Name'],
              items.map((i) => [
                `"${i.title}"`,
                (i.starting_bid / 100).toString(),
                i.current_bid ? (i.current_bid / 100).toString() : '',
                i.fair_market_value ? (i.fair_market_value / 100).toString() : '',
                i.pctOverFmv?.toString() || '',
                `"${i.winner}"`,
              ])
            )
          }
        >
          Export CSV
        </Button>
      </div>
      <DataTable
        columns={itemColumns}
        data={items}
        keyExtractor={(i) => i.id}
        emptyTitle="No items"
        emptyDescription="No auction items have been created yet."
      />
    </div>
  );

  const biddersTab = (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            downloadCSV(
              'bidders-report.csv',
              ['Name', 'Email', 'Bids Placed', 'Items Won', 'Total Spent'],
              bidders.map((b) => [
                `"${b.name}"`,
                b.email,
                b.bidsPlaced.toString(),
                b.itemsWon.toString(),
                (b.totalSpent / 100).toString(),
              ])
            )
          }
        >
          Export CSV
        </Button>
      </div>
      <DataTable
        columns={bidderColumns}
        data={bidders}
        keyExtractor={(b) => b.id}
        emptyTitle="No bidders"
        emptyDescription="No guests have placed bids yet."
      />
    </div>
  );

  const donationsTab = (
    <div className="space-y-6">
      {/* Campaign summary cards */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-gray-900">
          By Campaign
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((c) => (
            <Card key={c.name}>
              <CardBody>
                <p className="text-sm font-medium text-gray-500">{c.name}</p>
                <p className="mt-1 text-xl font-bold text-gray-900">
                  {formatCurrency(c.total)}
                </p>
              </CardBody>
            </Card>
          ))}
          {campaigns.length === 0 && (
            <p className="col-span-full py-4 text-center text-sm text-gray-500">
              No donations recorded.
            </p>
          )}
        </div>
      </div>

      {/* Individual donations table */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">
            Individual Donations ({donations.length})
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              downloadCSV(
                'donations-report.csv',
                ['Donor', 'Amount', 'Campaign', 'Anonymous', 'Message', 'Date'],
                donations.map((d) => [
                  `"${d.donorName}"`,
                  (d.amount / 100).toString(),
                  `"${d.campaign}"`,
                  d.anonymous ? 'Yes' : 'No',
                  `"${d.message}"`,
                  d.createdAt,
                ])
              )
            }
          >
            Export CSV
          </Button>
        </div>
        <DataTable
          columns={donationColumns}
          data={donations}
          keyExtractor={(d) => d.id}
          emptyTitle="No donations"
          emptyDescription="No donations have been received yet."
        />
      </div>
    </div>
  );

  const paymentsTab = (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            downloadCSV(
              'payments-report.csv',
              ['Guest Name', 'Amount', 'Method', 'Status', 'Date'],
              payments.map((p) => [
                `"${p.guestName}"`,
                (p.amount / 100).toString(),
                p.method,
                p.status,
                p.createdAt,
              ])
            )
          }
        >
          Export CSV
        </Button>
      </div>
      <DataTable
        columns={paymentColumns}
        data={payments}
        keyExtractor={(p) => p.id}
        emptyTitle="No payments"
        emptyDescription="No payments have been recorded yet."
      />
    </div>
  );

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">Reports</h2>
      <Tabs
        items={[
          { label: 'Summary', content: summaryTab },
          { label: 'Items', content: itemsTab },
          { label: 'Bidders', content: biddersTab },
          { label: 'Donations', content: donationsTab },
          { label: 'Payments', content: paymentsTab },
        ]}
      />
    </div>
  );
}
