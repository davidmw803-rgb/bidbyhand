'use client';

import React, { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import type { ItemType } from '@/types';
import { parseCSV } from '@/lib/utils';

const ITEM_TYPES: { value: ItemType; label: string }[] = [
  { value: 'silent', label: 'Silent Auction' },
  { value: 'live', label: 'Live Auction' },
  { value: 'buy_now', label: 'Buy Now' },
  { value: 'donation', label: 'Donation' },
  { value: 'paddle_raise', label: 'Paddle Raise' },
  { value: 'raffle', label: 'Raffle' },
  { value: 'merchandise', label: 'Merchandise' },
];

const CATEGORY_PRESETS = [
  'Art & Collectibles',
  'Experiences',
  'Gift Cards',
  'Home & Garden',
  'Jewelry & Accessories',
  'Sports & Recreation',
  'Technology',
  'Travel & Getaways',
  'Wine & Dining',
  'Other',
];

export default function AddItemPage() {
  const router = useRouter();
  const params = useParams<{ eventId: string }>();
  const eventId = params.eventId;

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [csvImporting, setCsvImporting] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    type: 'silent' as ItemType,
    lot_number: '',
    photo_url: '',
    gallery_urls: '',
    fair_market_value: '',
    starting_bid: '',
    bid_increment: '',
    reserve_price: '',
    buy_now_price: '',
    quantity: '1',
    closes_at: '',
    donor_name: '',
    donor_email: '',
  });

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!form.title.trim()) errs.title = 'Title is required';
    if (!form.lot_number.trim()) errs.lot_number = 'Lot number is required';
    if (!form.starting_bid || parseFloat(form.starting_bid) <= 0) {
      errs.starting_bid = 'Starting bid must be greater than 0';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const galleryUrls = form.gallery_urls
        .split('\n')
        .map((u) => u.trim())
        .filter(Boolean);

      const body = {
        event_id: eventId,
        title: form.title.trim(),
        lot_number: form.lot_number.trim(),
        description: form.description.trim() || null,
        type: form.type,
        photo_url: form.photo_url.trim() || null,
        gallery_urls: galleryUrls,
        fair_market_value: form.fair_market_value
          ? Math.round(parseFloat(form.fair_market_value) * 100)
          : null,
        starting_bid: Math.round(parseFloat(form.starting_bid) * 100),
        bid_increment: form.bid_increment
          ? Math.round(parseFloat(form.bid_increment) * 100)
          : null,
        buy_now_price: form.buy_now_price
          ? Math.round(parseFloat(form.buy_now_price) * 100)
          : null,
        donor_name: form.donor_name.trim() || null,
        donor_email: form.donor_email.trim() || null,
      };

      const res = await fetch(`/api/events/${eventId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error || 'Failed to create item');
      }

      const { data } = await res.json();
      router.push(`/dashboard/events/${eventId}/items/${data.id}`);
    } catch (err) {
      setErrors({
        _form: err instanceof Error ? err.message : 'Something went wrong',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleCsvImport() {
    if (!csvText.trim()) return;
    setCsvImporting(true);

    try {
      const rows = parseCSV(csvText);
      if (rows.length === 0) {
        throw new Error('No valid rows found in CSV');
      }

      const res = await fetch(`/api/events/${eventId}/items/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: rows }),
      });

      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error || 'Import failed');
      }

      router.push(`/dashboard/events/${eventId}/items`);
    } catch (err) {
      setErrors({
        _form: err instanceof Error ? err.message : 'Import failed',
      });
    } finally {
      setCsvImporting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Add Item</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowCsvImport(!showCsvImport)}
        >
          {showCsvImport ? 'Manual Entry' : 'CSV Import'}
        </Button>
      </div>

      {errors._form && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {errors._form}
        </div>
      )}

      {showCsvImport ? (
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-gray-900">CSV Import</h3>
          </CardHeader>
          <CardBody className="space-y-4">
            <p className="text-sm text-gray-500">
              Paste CSV with headers: lot_number, title, description, type,
              starting_bid, fair_market_value, buy_now_price, donor_name
            </p>
            <Input
              label="CSV Data"
              name="csv"
              variant="textarea"
              value={csvText}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCsvText(e.target.value)}
              placeholder="lot_number,title,description,type,starting_bid&#10;001,Painting,Beautiful art,silent,100"
            />
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowCsvImport(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleCsvImport} loading={csvImporting}>
                Import Items
              </Button>
            </div>
          </CardBody>
        </Card>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-gray-900">Basic Info</h3>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Lot Number"
                  name="lot_number"
                  value={form.lot_number}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('lot_number', e.target.value)}
                  error={errors.lot_number}
                  placeholder="001"
                />
                <Input
                  label="Item Type"
                  name="type"
                  variant="select"
                  value={form.type}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('type', e.target.value)}
                  options={ITEM_TYPES}
                />
              </div>
              <Input
                label="Title"
                name="title"
                value={form.title}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('title', e.target.value)}
                error={errors.title}
                placeholder="Weekend Getaway Package"
              />
              <Input
                label="Description"
                name="description"
                variant="textarea"
                value={form.description}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('description', e.target.value)}
                placeholder="Describe the item..."
              />
              <Input
                label="Category"
                name="category"
                variant="select"
                value={form.category}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('category', e.target.value)}
                options={[
                  { value: '', label: 'Select a category' },
                  ...CATEGORY_PRESETS.map((c) => ({ value: c, label: c })),
                ]}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="font-semibold text-gray-900">Photos</h3>
            </CardHeader>
            <CardBody className="space-y-4">
              <Input
                label="Primary Photo URL"
                name="photo_url"
                value={form.photo_url}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('photo_url', e.target.value)}
                placeholder="https://..."
              />
              <Input
                label="Additional Photo URLs (one per line)"
                name="gallery_urls"
                variant="textarea"
                value={form.gallery_urls}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('gallery_urls', e.target.value)}
                placeholder="https://...&#10;https://..."
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="font-semibold text-gray-900">Pricing</h3>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Fair Market Value ($)"
                  name="fair_market_value"
                  variant="number"
                  value={form.fair_market_value}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    updateField('fair_market_value', e.target.value)
                  }
                  placeholder="500"
                />
                <Input
                  label="Starting Bid ($)"
                  name="starting_bid"
                  variant="number"
                  value={form.starting_bid}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('starting_bid', e.target.value)}
                  error={errors.starting_bid}
                  placeholder="100"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Bid Increment ($)"
                  name="bid_increment"
                  variant="number"
                  value={form.bid_increment}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('bid_increment', e.target.value)}
                  placeholder="25"
                  helperText="Leave blank to use event default"
                />
                <Input
                  label="Buy Now Price ($)"
                  name="buy_now_price"
                  variant="number"
                  value={form.buy_now_price}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('buy_now_price', e.target.value)}
                  placeholder="1000"
                  helperText="Optional instant purchase price"
                />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="font-semibold text-gray-900">Donor Info</h3>
            </CardHeader>
            <CardBody className="space-y-4">
              <Input
                label="Donor / Consignment Name"
                name="donor_name"
                value={form.donor_name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('donor_name', e.target.value)}
                placeholder="Jane Smith"
              />
              <Input
                label="Donor Email"
                name="donor_email"
                variant="email"
                value={form.donor_email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('donor_email', e.target.value)}
                placeholder="jane@example.com"
              />
            </CardBody>
          </Card>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Add Item
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
