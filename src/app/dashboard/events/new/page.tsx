'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { slugify } from '@/lib/utils';
import type { EventType } from '@/types';

const EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: 'silent', label: 'Silent Auction' },
  { value: 'live', label: 'Live Auction' },
  { value: 'hybrid', label: 'Hybrid Auction' },
  { value: 'virtual', label: 'Virtual Auction' },
  { value: 'gala', label: 'Gala' },
];

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time' },
  { value: 'America/Chicago', label: 'Central Time' },
  { value: 'America/Denver', label: 'Mountain Time' },
  { value: 'America/Los_Angeles', label: 'Pacific Time' },
  { value: 'America/Anchorage', label: 'Alaska Time' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time' },
];

export default function CreateEventPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    name: '',
    type: 'silent' as EventType,
    description: '',
    start_time: '',
    end_time: '',
    timezone: 'America/New_York',
    venue_name: '',
    venue_address: '',
    goal_amount: '',
    cover_image_url: '',
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
    if (!form.name.trim()) errs.name = 'Event name is required';
    if (!form.start_time) errs.start_time = 'Start date is required';
    if (!form.end_time) errs.end_time = 'End date is required';
    if (form.start_time && form.end_time && form.end_time <= form.start_time) {
      errs.end_time = 'End date must be after start date';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const body = {
        name: form.name.trim(),
        slug: slugify(form.name),
        type: form.type,
        description: form.description.trim() || null,
        start_time: new Date(form.start_time).toISOString(),
        end_time: new Date(form.end_time).toISOString(),
        timezone: form.timezone,
        venue_name: form.venue_name.trim() || null,
        venue_address: form.venue_address.trim() || null,
        goal_amount: form.goal_amount
          ? Math.round(parseFloat(form.goal_amount) * 100)
          : null,
        cover_image_url: form.cover_image_url.trim() || null,
      };

      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error || 'Failed to create event');
      }

      const { data } = await res.json();
      router.push(`/dashboard/events/${data.id}`);
    } catch (err) {
      setErrors({
        _form: err instanceof Error ? err.message : 'Something went wrong',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Create Event</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {errors._form && (
          <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
            {errors._form}
          </div>
        )}

        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-900">Basic Info</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <Input
              label="Event Name"
              name="name"
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              error={errors.name}
              placeholder="Annual Charity Gala 2026"
            />
            <Input
              label="Event Type"
              name="type"
              variant="select"
              value={form.type}
              onChange={(e) => updateField('type', e.target.value)}
              options={EVENT_TYPES}
            />
            <Input
              label="Description"
              name="description"
              variant="textarea"
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Tell guests what this event is about..."
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-900">Date & Time</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Start Date & Time"
                name="start_time"
                type="datetime-local"
                value={form.start_time}
                onChange={(e) => updateField('start_time', e.target.value)}
                error={errors.start_time}
              />
              <Input
                label="End Date & Time"
                name="end_time"
                type="datetime-local"
                value={form.end_time}
                onChange={(e) => updateField('end_time', e.target.value)}
                error={errors.end_time}
              />
            </div>
            <Input
              label="Timezone"
              name="timezone"
              variant="select"
              value={form.timezone}
              onChange={(e) => updateField('timezone', e.target.value)}
              options={TIMEZONES}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-900">Venue</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <Input
              label="Venue Name"
              name="venue_name"
              value={form.venue_name}
              onChange={(e) => updateField('venue_name', e.target.value)}
              placeholder="Grand Ballroom"
            />
            <Input
              label="Venue Address"
              name="venue_address"
              value={form.venue_address}
              onChange={(e) => updateField('venue_address', e.target.value)}
              placeholder="123 Main St, City, State"
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-900">Goals & Media</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <Input
              label="Fundraising Goal ($)"
              name="goal_amount"
              variant="number"
              value={form.goal_amount}
              onChange={(e) => updateField('goal_amount', e.target.value)}
              placeholder="50000"
              helperText="Leave blank for no goal"
            />
            <Input
              label="Banner Image URL"
              name="cover_image_url"
              value={form.cover_image_url}
              onChange={(e) => updateField('cover_image_url', e.target.value)}
              placeholder="https://..."
              helperText="Direct URL to a banner image"
            />
          </CardBody>
        </Card>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            Create Event
          </Button>
        </div>
      </form>
    </div>
  );
}
