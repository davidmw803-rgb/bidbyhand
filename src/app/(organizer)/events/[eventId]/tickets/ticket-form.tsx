'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import type { TicketTypeKind } from '@/types';

const TICKET_KINDS: { value: TicketTypeKind; label: string }[] = [
  { value: 'individual', label: 'Individual' },
  { value: 'table', label: 'Table' },
  { value: 'sponsorship', label: 'Sponsorship' },
  { value: 'comp', label: 'Complimentary' },
];

export function TicketFormSection({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    name: '',
    kind: 'individual' as TicketTypeKind,
    price: '',
    quantity: '',
    seats: '1',
    description: '',
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
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!form.price || parseFloat(form.price) < 0) {
      errs.price = 'Price is required';
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
        event_id: eventId,
        name: form.name.trim(),
        kind: form.kind,
        price: Math.round(parseFloat(form.price) * 100),
        quantity: form.quantity ? parseInt(form.quantity, 10) : null,
        seats: parseInt(form.seats, 10) || 1,
        description: form.description.trim() || null,
      };

      const res = await fetch(`/api/events/${eventId}/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error || 'Failed to create ticket type');
      }

      setForm({
        name: '',
        kind: 'individual',
        price: '',
        quantity: '',
        seats: '1',
        description: '',
      });
      setShowForm(false);
      router.refresh();
    } catch (err) {
      setErrors({
        _form: err instanceof Error ? err.message : 'Something went wrong',
      });
    } finally {
      setLoading(false);
    }
  }

  if (!showForm) {
    return (
      <Button onClick={() => setShowForm(true)}>Add Ticket Type</Button>
    );
  }

  return (
    <Card>
      <CardHeader>
        <h3 className="font-semibold text-gray-900">Add Ticket Type</h3>
      </CardHeader>
      <CardBody>
        <form onSubmit={handleSubmit} className="space-y-4">
          {errors._form && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {errors._form}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Name"
              name="name"
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              error={errors.name}
              placeholder="General Admission"
            />
            <Input
              label="Type"
              name="kind"
              variant="select"
              value={form.kind}
              onChange={(e) => updateField('kind', e.target.value)}
              options={TICKET_KINDS}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              label="Price ($)"
              name="price"
              variant="number"
              value={form.price}
              onChange={(e) => updateField('price', e.target.value)}
              error={errors.price}
              placeholder="100"
            />
            <Input
              label="Quantity Available"
              name="quantity"
              variant="number"
              value={form.quantity}
              onChange={(e) => updateField('quantity', e.target.value)}
              placeholder="Unlimited"
              helperText="Leave blank for unlimited"
            />
            <Input
              label="Seats per Ticket"
              name="seats"
              variant="number"
              value={form.seats}
              onChange={(e) => updateField('seats', e.target.value)}
              placeholder="1"
              helperText="e.g. 10 for a table"
            />
          </div>

          <Input
            label="Description / Benefits"
            name="description"
            variant="textarea"
            value={form.description}
            onChange={(e) => updateField('description', e.target.value)}
            placeholder="Includes dinner, open bar, and premium seating..."
          />

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Add Ticket Type
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
