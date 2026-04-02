'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { Button, Input, Card, CardBody } from '@/components/ui';
import { useToast } from '@/components/ui/toast';
import {
  Ticket,
  User,
  CreditCard,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  Heart,
} from 'lucide-react';
import type { Event, TicketType } from '@/types';

const STEPS = [
  { id: 'ticket', label: 'Ticket', icon: Ticket },
  { id: 'info', label: 'Your Info', icon: User },
  { id: 'payment', label: 'Payment', icon: CreditCard },
  { id: 'confirm', label: 'Confirm', icon: CheckCircle },
] as const;

interface GuestInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dietary: string;
}

export default function EventRegisterPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const slug = params.eventId as string;

  const [step, setStep] = useState(0);
  const [event, setEvent] = useState<Event | null>(null);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<string | null>(
    searchParams.get('ticket')
  );
  const [guestInfo, setGuestInfo] = useState<GuestInfo>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dietary: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof GuestInfo, string>>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [registrationId, setRegistrationId] = useState<string | null>(null);

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
        const { data: tickets } = await supabase
          .from('ticket_types')
          .select('*')
          .eq('event_id', evt.id)
          .order('price', { ascending: true })
          .returns<TicketType[]>();
        setTicketTypes(tickets || []);
      }
      setLoading(false);
    }
    load();
  }, [slug]);

  function validateInfo(): boolean {
    const newErrors: typeof errors = {};
    if (!guestInfo.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!guestInfo.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!guestInfo.email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestInfo.email))
      newErrors.email = 'Invalid email address';
    if (!guestInfo.phone.trim()) newErrors.phone = 'Phone number is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleNext() {
    if (step === 0 && !selectedTicket) {
      toast('error', 'Please select a ticket type');
      return;
    }
    if (step === 1 && !validateInfo()) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function handleBack() {
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handlePaymentSubmit() {
    if (!event) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/events/${event.id}/guests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: event.id,
          first_name: guestInfo.firstName,
          last_name: guestInfo.lastName,
          email: guestInfo.email,
          phone: guestInfo.phone,
          ticket_type_id: selectedTicket,
          notes: guestInfo.dietary ? `Dietary: ${guestInfo.dietary}` : null,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        toast('error', result.error || 'Registration failed');
        return;
      }

      setRegistrationId(result.data?.id || 'confirmed');
      setStep(3);
      toast('success', 'Registration complete!');
    } catch {
      toast('error', 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const selectedTicketType = ticketTypes.find((t) => t.id === selectedTicket);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="mx-auto max-w-lg space-y-4">
          <div className="skeleton h-8 w-48" />
          <div className="skeleton h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <Card variant="bordered">
          <CardBody className="text-center py-8">
            <p className="text-gray-500">Event not found</p>
            <Link href="/" className="mt-4 text-brand-600 hover:underline text-sm">
              Go home
            </Link>
          </CardBody>
        </Card>
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
          <div>
            <p className="text-xs text-gray-400">Register for</p>
            <h1 className="text-sm font-semibold text-gray-900">{event.name}</h1>
          </div>
        </div>
      </header>

      {/* Progress */}
      <div className="border-b border-gray-100 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-lg justify-between">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex flex-col items-center gap-1">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                  i < step
                    ? 'bg-brand-600 text-white'
                    : i === step
                      ? 'bg-brand-100 text-brand-700 ring-2 ring-brand-600'
                      : 'bg-gray-100 text-gray-400'
                }`}
              >
                {i < step ? <CheckCircle className="h-4 w-4" /> : i + 1}
              </div>
              <span className={`text-xs ${i === step ? 'font-medium text-brand-700' : 'text-gray-400'}`}>
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="mx-auto max-w-lg px-4 py-6">
        {/* Step 1: Select Ticket */}
        {step === 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-gray-900">Select a ticket</h2>
            {ticketTypes.length === 0 ? (
              <p className="text-sm text-gray-500">No tickets available for this event.</p>
            ) : (
              ticketTypes.map((tt) => {
                const available = tt.quantity ? tt.quantity - tt.sold_count : null;
                const soldOut = available !== null && available <= 0;
                const isSelected = selectedTicket === tt.id;
                return (
                  <button
                    key={tt.id}
                    disabled={soldOut}
                    onClick={() => setSelectedTicket(tt.id)}
                    className={`w-full rounded-xl border-2 p-4 text-left transition-all touch-target ${
                      isSelected
                        ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-600'
                        : soldOut
                          ? 'border-gray-100 bg-gray-50 opacity-60'
                          : 'border-gray-200 bg-white hover:border-brand-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">{tt.name}</h3>
                        {tt.description && (
                          <p className="mt-1 text-sm text-gray-500">{tt.description}</p>
                        )}
                        {tt.seats > 1 && (
                          <p className="mt-1 text-xs text-gray-400">{tt.seats} seats</p>
                        )}
                        {available !== null && (
                          <p className="mt-1 text-xs text-gray-400">
                            {soldOut ? 'Sold out' : `${available} remaining`}
                          </p>
                        )}
                      </div>
                      <span className="text-lg font-bold text-brand-700">
                        {tt.price === 0 ? 'Free' : formatCurrency(tt.price, event.currency)}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}

        {/* Step 2: Guest Info */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Your information</h2>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="First Name"
                name="firstName"
                placeholder="Jane"
                value={guestInfo.firstName}
                onChange={(e) =>
                  setGuestInfo((g) => ({ ...g, firstName: (e.target as HTMLInputElement).value }))
                }
                error={errors.firstName}
              />
              <Input
                label="Last Name"
                name="lastName"
                placeholder="Smith"
                value={guestInfo.lastName}
                onChange={(e) =>
                  setGuestInfo((g) => ({ ...g, lastName: (e.target as HTMLInputElement).value }))
                }
                error={errors.lastName}
              />
            </div>
            <Input
              label="Email"
              variant="email"
              name="email"
              placeholder="jane@example.com"
              value={guestInfo.email}
              onChange={(e) =>
                setGuestInfo((g) => ({ ...g, email: (e.target as HTMLInputElement).value }))
              }
              error={errors.email}
            />
            <Input
              label="Phone"
              variant="phone"
              name="phone"
              placeholder="+1 (555) 123-4567"
              value={guestInfo.phone}
              onChange={(e) =>
                setGuestInfo((g) => ({ ...g, phone: (e.target as HTMLInputElement).value }))
              }
              error={errors.phone}
            />
            <Input
              label="Dietary Restrictions"
              name="dietary"
              placeholder="Optional"
              helperText="Let us know about any dietary needs"
              value={guestInfo.dietary}
              onChange={(e) =>
                setGuestInfo((g) => ({ ...g, dietary: (e.target as HTMLInputElement).value }))
              }
            />
          </div>
        )}

        {/* Step 3: Payment */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Payment</h2>
            {selectedTicketType && (
              <Card variant="bordered">
                <CardBody>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{selectedTicketType.name}</p>
                      <p className="text-sm text-gray-500">1 ticket</p>
                    </div>
                    <span className="text-lg font-bold text-gray-900">
                      {selectedTicketType.price === 0
                        ? 'Free'
                        : formatCurrency(selectedTicketType.price, event.currency)}
                    </span>
                  </div>
                </CardBody>
              </Card>
            )}

            {selectedTicketType && selectedTicketType.price > 0 ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <p className="mb-3 text-sm font-medium text-gray-700">Card Details</p>
                  {/* Stripe Elements would mount here */}
                  <div className="rounded-lg border border-gray-300 bg-white p-3 text-sm text-gray-400">
                    Card input (Stripe Elements)
                  </div>
                  <p className="mt-2 text-xs text-gray-400">
                    Your card will be saved for checkout when the auction ends.
                  </p>
                </div>
                <Button
                  onClick={handlePaymentSubmit}
                  loading={submitting}
                  className="w-full touch-target"
                  size="lg"
                >
                  Pay {formatCurrency(selectedTicketType.price, event.currency)} & Register
                </Button>
              </div>
            ) : (
              <Button
                onClick={handlePaymentSubmit}
                loading={submitting}
                className="w-full touch-target"
                size="lg"
              >
                Complete Registration
              </Button>
            )}
          </div>
        )}

        {/* Step 4: Confirmation */}
        {step === 3 && (
          <div className="text-center py-6 space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">You&apos;re registered!</h2>
            <p className="text-sm text-gray-500">
              Check your email at <span className="font-medium text-gray-700">{guestInfo.email}</span> for
              your ticket and QR code.
            </p>

            {/* QR Code placeholder */}
            <div className="mx-auto mt-6 flex h-48 w-48 items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-white">
              <div className="text-center">
                <Ticket className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                <p className="text-xs text-gray-400">QR Ticket</p>
                {registrationId && (
                  <p className="text-xs text-gray-300 mt-1 font-mono">{registrationId.slice(0, 8)}</p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-4">
              <Link href={`/events/${slug}/items`}>
                <Button className="w-full">
                  Browse Auction Items
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href={`/events/${slug}`}>
                <Button variant="ghost" className="w-full">
                  Back to Event
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Navigation */}
        {step < 2 && (
          <div className="mt-6 flex gap-3">
            {step > 0 && (
              <Button variant="outline" onClick={handleBack} className="flex-1 touch-target">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            )}
            <Button onClick={handleNext} className="flex-1 touch-target">
              Continue
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
