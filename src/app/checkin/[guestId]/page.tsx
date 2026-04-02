'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { formatDate } from '@/lib/utils';
import { Button, Card, CardBody, Badge } from '@/components/ui';
import { useToast } from '@/components/ui/toast';
import {
  UserCheck,
  CheckCircle,
  Ticket,
  Hash,
  Mail,
  Phone,
  AlertCircle,
  Heart,
} from 'lucide-react';
import type { Guest, TicketType, Event } from '@/types';

export default function CheckInPage() {
  const params = useParams();
  const guestIdParam = params.guestId as string;
  const { toast } = useToast();

  const [guest, setGuest] = useState<Guest | null>(null);
  const [ticketType, setTicketType] = useState<TicketType | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      const { data: guestData, error } = await supabase
        .from('guests')
        .select('*')
        .eq('id', guestIdParam)
        .single<Guest>();

      if (error || !guestData) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setGuest(guestData);

      // Fetch event and ticket info in parallel
      const [eventRes, ticketRes] = await Promise.all([
        supabase.from('events').select('*').eq('id', guestData.event_id).single<Event>(),
        guestData.ticket_type_id
          ? supabase.from('ticket_types').select('*').eq('id', guestData.ticket_type_id).single<TicketType>()
          : Promise.resolve({ data: null }),
      ]);

      if (eventRes.data) setEvent(eventRes.data);
      if (ticketRes.data) setTicketType(ticketRes.data);

      setLoading(false);
    }
    load();
  }, [guestIdParam]);

  async function handleCheckIn() {
    if (!guest) return;
    setChecking(true);

    try {
      const res = await fetch(
        `/api/events/${guest.event_id}/guests/${guest.id}/checkin`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const result = await res.json();
      if (!res.ok) {
        toast('error', result.error || 'Check-in failed');
        return;
      }

      setGuest((prev) =>
        prev
          ? { ...prev, checked_in: true, checked_in_at: new Date().toISOString() }
          : prev
      );
      toast('success', `${guest.first_name} ${guest.last_name} checked in!`);
    } catch {
      toast('error', 'Check-in failed. Please try again.');
    } finally {
      setChecking(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-sm space-y-4">
          <div className="skeleton h-10 w-48 mx-auto" />
          <div className="skeleton h-48 w-full" />
          <div className="skeleton h-14 w-full" />
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <Card variant="bordered" className="w-full max-w-sm">
          <CardBody className="text-center py-8">
            <AlertCircle className="mx-auto h-12 w-12 text-red-400 mb-3" />
            <h1 className="text-lg font-bold text-gray-900">Guest Not Found</h1>
            <p className="mt-2 text-sm text-gray-500">
              This QR code may be invalid or expired.
            </p>
          </CardBody>
        </Card>
      </div>
    );
  }

  const isCheckedIn = guest?.checked_in;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm space-y-4">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-2">
          <Heart className="h-6 w-6 text-brand-600" fill="currentColor" />
          <span className="text-lg font-bold text-gray-900">BidByHand</span>
        </div>

        {/* Event Info */}
        {event && (
          <p className="text-center text-sm text-gray-500">{event.name}</p>
        )}

        {/* Guest Card */}
        <Card variant="elevated">
          <CardBody className="space-y-4">
            {/* Status */}
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold text-gray-900">
                {guest?.first_name} {guest?.last_name}
              </h1>
              <Badge variant={isCheckedIn ? 'success' : 'warning'}>
                {isCheckedIn ? 'Checked In' : 'Not Checked In'}
              </Badge>
            </div>

            {/* Details */}
            <div className="space-y-2.5">
              {guest?.paddle_number && (
                <div className="flex items-center gap-3 text-sm">
                  <Hash className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-400">Paddle Number</p>
                    <p className="text-2xl font-bold text-brand-700">{guest.paddle_number}</p>
                  </div>
                </div>
              )}

              {ticketType && (
                <div className="flex items-center gap-3 text-sm">
                  <Ticket className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-400">Ticket Type</p>
                    <p className="font-medium text-gray-900">{ticketType.name}</p>
                  </div>
                </div>
              )}

              {guest?.email && (
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-400">Email</p>
                    <p className="text-gray-600">{guest.email}</p>
                  </div>
                </div>
              )}

              {guest?.phone && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-400">Phone</p>
                    <p className="text-gray-600">{guest.phone}</p>
                  </div>
                </div>
              )}

              {guest?.table_assignment && (
                <div className="flex items-center gap-3 text-sm">
                  <div className="flex h-4 w-4 items-center justify-center text-gray-400 text-xs font-bold">
                    T
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Table</p>
                    <p className="font-medium text-gray-900">{guest.table_assignment}</p>
                  </div>
                </div>
              )}

              {guest?.category && (
                <div className="flex items-center gap-3 text-sm">
                  <Badge
                    variant={
                      guest.category === 'vip'
                        ? 'warning'
                        : guest.category === 'sponsor'
                          ? 'info'
                          : 'neutral'
                    }
                  >
                    {guest.category.toUpperCase()}
                  </Badge>
                </div>
              )}
            </div>

            {/* Check-in time */}
            {isCheckedIn && guest?.checked_in_at && (
              <p className="text-xs text-gray-400">
                Checked in at {formatDate(guest.checked_in_at, 'h:mm a')}
              </p>
            )}

            {/* Notes */}
            {guest?.notes && (
              <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3">
                <p className="text-xs font-medium text-yellow-800">Notes</p>
                <p className="text-sm text-yellow-700">{guest.notes}</p>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Check In Button */}
        {isCheckedIn ? (
          <div className="flex items-center justify-center gap-2 rounded-xl bg-green-50 border border-green-200 py-4 text-green-700">
            <CheckCircle className="h-5 w-5" />
            <span className="font-semibold">Already Checked In</span>
          </div>
        ) : (
          <Button
            onClick={handleCheckIn}
            loading={checking}
            size="lg"
            className="w-full touch-target text-lg"
          >
            <UserCheck className="h-5 w-5" />
            Check In
          </Button>
        )}
      </div>
    </div>
  );
}
