'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import type { EventType } from '@/types';

const PAYMENT_CAPTURE_MODES = [
  { value: 'auto-charge', label: 'Auto-Charge — Automatically charge cards at checkout' },
  { value: 'card-on-file-approval', label: 'Card on File + Approval — Hold card, charge after approval' },
  { value: 'card-request-only', label: 'Card Request Only — Request card info, charge manually' },
];

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

export default function EventSettingsPage() {
  const router = useRouter();
  const params = useParams<{ eventId: string }>();
  const eventId = params.eventId;

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
    logo_url: '',
    theme_color: '#0074c5',
    custom_css: '',
    payment_capture_mode: 'auto-charge',
  });

  useEffect(() => {
    async function fetchEvent() {
      try {
        const res = await fetch(`/api/events/${eventId}`);
        if (!res.ok) return;
        const { data } = await res.json();
        setForm({
          name: data.name || '',
          type: data.type || 'silent',
          description: data.description || '',
          start_time: data.start_time
            ? new Date(data.start_time).toISOString().slice(0, 16)
            : '',
          end_time: data.end_time
            ? new Date(data.end_time).toISOString().slice(0, 16)
            : '',
          timezone: data.timezone || 'America/New_York',
          venue_name: data.venue_name || '',
          venue_address: data.venue_address || '',
          goal_amount: data.goal_amount
            ? (data.goal_amount / 100).toString()
            : '',
          cover_image_url: data.cover_image_url || '',
          logo_url: data.logo_url || '',
          theme_color: data.theme_color || '#0074c5',
          custom_css: data.custom_css || '',
          payment_capture_mode: data.payment_capture_mode || 'auto-charge',
        });
      } catch {
        // silently fail
      } finally {
        setFetching(false);
      }
    }
    fetchEvent();
  }, [eventId]);

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
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

      const res = await fetch(`/api/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error || 'Failed to update event');
      }

      setSaved(true);
      router.refresh();
    } catch (err) {
      setErrors({
        _form: err instanceof Error ? err.message : 'Something went wrong',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleArchive() {
    if (!confirm('Are you sure you want to archive this event?')) return;

    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'archived' }),
      });
      if (!res.ok) throw new Error('Failed to archive');
      router.push('/events');
    } catch {
      setErrors({ _form: 'Failed to archive event' });
    }
  }

  async function handleDelete() {
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete');
      router.push('/events');
    } catch {
      setErrors({ _form: 'Failed to delete event' });
    } finally {
      setShowDeleteConfirm(false);
    }
  }

  if (fetching) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">Event Settings</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {errors._form && (
          <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
            {errors._form}
          </div>
        )}
        {saved && (
          <div className="rounded-lg bg-green-50 p-4 text-sm text-green-700">
            Settings saved successfully.
          </div>
        )}

        <Card>
          <CardHeader>
            <h3 className="font-semibold text-gray-900">Basic Info</h3>
          </CardHeader>
          <CardBody className="space-y-4">
            <Input
              label="Event Name"
              name="name"
              value={form.name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('name', e.target.value)}
              error={errors.name}
            />
            <Input
              label="Event Type"
              name="type"
              variant="select"
              value={form.type}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('type', e.target.value)}
              options={EVENT_TYPES}
            />
            <Input
              label="Description"
              name="description"
              variant="textarea"
              value={form.description}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('description', e.target.value)}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="font-semibold text-gray-900">Date & Time</h3>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Start Date & Time"
                name="start_time"
                type="datetime-local"
                value={form.start_time}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('start_time', e.target.value)}
                error={errors.start_time}
              />
              <Input
                label="End Date & Time"
                name="end_time"
                type="datetime-local"
                value={form.end_time}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('end_time', e.target.value)}
                error={errors.end_time}
              />
            </div>
            <Input
              label="Timezone"
              name="timezone"
              variant="select"
              value={form.timezone}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('timezone', e.target.value)}
              options={TIMEZONES}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="font-semibold text-gray-900">Venue</h3>
          </CardHeader>
          <CardBody className="space-y-4">
            <Input
              label="Venue Name"
              name="venue_name"
              value={form.venue_name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('venue_name', e.target.value)}
            />
            <Input
              label="Venue Address"
              name="venue_address"
              value={form.venue_address}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('venue_address', e.target.value)}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="font-semibold text-gray-900">Goals & Branding</h3>
          </CardHeader>
          <CardBody className="space-y-4">
            <Input
              label="Fundraising Goal ($)"
              name="goal_amount"
              variant="number"
              value={form.goal_amount}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('goal_amount', e.target.value)}
              helperText="Leave blank for no goal"
            />
            <Input
              label="Banner Image URL"
              name="cover_image_url"
              value={form.cover_image_url}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('cover_image_url', e.target.value)}
              placeholder="https://..."
            />
            <Input
              label="Logo URL"
              name="logo_url"
              value={form.logo_url}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('logo_url', e.target.value)}
              placeholder="https://..."
            />
            <div>
              <label
                htmlFor="theme_color"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Theme Color
              </label>
              <input
                id="theme_color"
                type="color"
                value={form.theme_color}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('theme_color', e.target.value)}
                className="h-10 w-20 cursor-pointer rounded border border-gray-300"
              />
            </div>
            <Input
              label="Custom CSS"
              name="custom_css"
              variant="textarea"
              value={form.custom_css}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('custom_css', e.target.value)}
              placeholder=".auction-card { border-radius: 16px; }"
              helperText="Advanced: custom CSS for the public event page"
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="font-semibold text-gray-900">Checkout</h3>
          </CardHeader>
          <CardBody className="space-y-4">
            <Input
              label="Payment Capture Mode"
              name="payment_capture_mode"
              variant="select"
              value={form.payment_capture_mode}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('payment_capture_mode', e.target.value)}
              options={PAYMENT_CAPTURE_MODES}
            />
            <p className="text-xs text-gray-500">
              Controls how payments are captured when guests check out after the auction.
            </p>
          </CardBody>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="submit" loading={loading}>
            Save Settings
          </Button>
        </div>
      </form>

      {/* Danger zone */}
      <Card variant="bordered" className="border-red-200">
        <CardHeader className="bg-red-50">
          <h3 className="font-semibold text-red-900">Danger Zone</h3>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Archive Event</p>
              <p className="text-sm text-gray-500">
                Remove from active list. Data is preserved.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleArchive}>
              Archive Event
            </Button>
          </div>
          <div className="border-t border-gray-200 pt-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-red-900">Delete Event</p>
                <p className="text-sm text-gray-500">
                  Permanently delete this event and all associated data.
                </p>
              </div>
              <Button variant="danger" size="sm" onClick={() => setShowDeleteConfirm(true)}>
                Delete Event
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Delete confirmation modal */}
      <Modal
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Event"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to permanently delete this event and all
            associated data? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleDelete}>
              Yes, Delete Event
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
