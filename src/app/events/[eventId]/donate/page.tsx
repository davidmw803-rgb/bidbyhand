'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { Button, Card, CardBody, Input, ProgressBar } from '@/components/ui';
import { useToast } from '@/components/ui/toast';
import { ArrowLeft, Heart, Gift, CheckCircle } from 'lucide-react';
import type { Event } from '@/types';

const PRESET_AMOUNTS = [2500, 5000, 10000, 25000, 50000, 100000]; // in cents

export default function DonatePage() {
  const params = useParams();
  const slug = params.eventId as string;
  const { toast } = useToast();

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [donated, setDonated] = useState(false);
  const [totalRaised, setTotalRaised] = useState(0);
  const [guestId, setGuestId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: guest } = await supabase
          .from('guests')
          .select('id, first_name, last_name')
          .eq('user_id', user.id)
          .single();
        if (guest) {
          setGuestId(guest.id);
          setName(`${guest.first_name} ${guest.last_name}`);
        }
      }

      const { data: evt } = await supabase
        .from('events')
        .select('*')
        .eq('slug', slug)
        .single<Event>();

      if (evt) {
        setEvent(evt);
        const { data: donations } = await supabase
          .from('donations')
          .select('amount')
          .eq('event_id', evt.id);
        setTotalRaised((donations || []).reduce((sum, d) => sum + d.amount, 0));
      }
      setLoading(false);
    }
    load();
  }, [slug]);

  function getSelectedAmount(): number {
    if (amount) return amount;
    const parsed = parseFloat(customAmount);
    return isNaN(parsed) ? 0 : Math.round(parsed * 100);
  }

  async function handleDonate() {
    const donationAmount = getSelectedAmount();
    if (donationAmount <= 0) {
      toast('error', 'Please select or enter a donation amount');
      return;
    }
    if (!event) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/events/${event.id}/donations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: event.id,
          guest_id: guestId,
          amount: donationAmount,
          anonymous,
          message: message || null,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        toast('error', result.error || 'Donation failed');
        return;
      }

      setTotalRaised((prev) => prev + donationAmount);
      setDonated(true);
      toast('success', `Thank you for your ${formatCurrency(donationAmount)} donation!`);
    } catch {
      toast('error', 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

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

  if (donated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="mx-auto max-w-sm text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Thank you!</h1>
          <p className="text-gray-500">
            Your donation of{' '}
            <span className="font-semibold text-gray-900">
              {formatCurrency(getSelectedAmount(), event?.currency)}
            </span>{' '}
            makes a difference.
          </p>

          {event?.goal_amount && (
            <ProgressBar
              current={totalRaised / 100}
              goal={event.goal_amount / 100}
              className="mt-6"
            />
          )}

          <div className="flex flex-col gap-2 pt-4">
            <Button onClick={() => setDonated(false)} variant="outline" className="w-full">
              Donate Again
            </Button>
            <Link href={`/events/${slug}`}>
              <Button variant="ghost" className="w-full">
                Back to Event
              </Button>
            </Link>
          </div>
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
          <div>
            <p className="text-xs text-gray-400">Donate to</p>
            <h1 className="text-sm font-semibold text-gray-900">{event?.name}</h1>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 py-6 space-y-6">
        {/* Thermometer */}
        {event?.goal_amount && (
          <Card variant="bordered">
            <CardBody>
              <div className="flex items-center gap-2 mb-3">
                <Heart className="h-5 w-5 text-brand-600" />
                <h2 className="font-semibold text-gray-900">Fundraising Progress</h2>
              </div>
              <ProgressBar
                current={totalRaised / 100}
                goal={event.goal_amount / 100}
              />
            </CardBody>
          </Card>
        )}

        {/* Preset Amounts */}
        <div>
          <h2 className="mb-3 text-lg font-bold text-gray-900">
            <Gift className="mr-2 inline h-5 w-5 text-brand-600" />
            Choose an amount
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {PRESET_AMOUNTS.map((preset) => (
              <button
                key={preset}
                onClick={() => {
                  setAmount(preset);
                  setCustomAmount('');
                }}
                className={`rounded-xl border-2 py-4 text-center font-bold transition-all touch-target ${
                  amount === preset
                    ? 'border-brand-600 bg-brand-50 text-brand-700 ring-1 ring-brand-600'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-brand-300'
                }`}
              >
                {formatCurrency(preset, event?.currency)}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Amount */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Or enter a custom amount
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-gray-400">$</span>
            <input
              type="number"
              placeholder="0.00"
              value={customAmount}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setCustomAmount(e.target.value);
                setAmount(null);
              }}
              min="1"
              step="1"
              className="w-full rounded-xl border-2 border-gray-200 py-4 pl-10 pr-4 text-xl font-bold text-gray-900 placeholder:text-gray-300 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
        </div>

        {/* Optional Details */}
        <div className="space-y-3">
          <Input
            label="Your Name (optional)"
            name="donor-name"
            placeholder="Your name"
            value={name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName((e.target as HTMLInputElement).value)}
          />
          <Input
            label="Message (optional)"
            name="message"
            variant="textarea"
            placeholder="Leave a message of support..."
            value={message}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMessage((e.target as HTMLTextAreaElement).value)}
          />
          <label className="flex items-center gap-3 cursor-pointer touch-target">
            <input
              type="checkbox"
              checked={anonymous}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAnonymous(e.target.checked)}
              className="h-5 w-5 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
            />
            <span className="text-sm text-gray-700">Make my donation anonymous</span>
          </label>
        </div>

        {/* Donate Button */}
        <Button
          onClick={handleDonate}
          loading={submitting}
          size="lg"
          className="btn-bid w-full"
          disabled={getSelectedAmount() <= 0}
        >
          <Heart className="h-5 w-5" />
          Donate {getSelectedAmount() > 0 ? formatCurrency(getSelectedAmount(), event?.currency) : ''}
        </Button>
      </div>
    </div>
  );
}
