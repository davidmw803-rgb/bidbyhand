import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createServerSupabase } from '@/lib/supabase/server';
import { formatDateTime } from '@/lib/utils';
import type { Guest, TicketType, Event } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Card, CardBody } from '@/components/ui/card';
import { CheckInButton } from './checkin-button';

export default async function CheckInPage({
  params,
}: {
  params: { guestId: string };
}) {
  const supabase = createServerSupabase();

  const { data: guest } = await supabase
    .from('guests')
    .select('*')
    .eq('id', params.guestId)
    .single();

  if (!guest) redirect('/');
  const g = guest as Guest;

  // Fetch event and ticket type in parallel
  const [eventRes, ticketRes] = await Promise.all([
    supabase.from('events').select('*').eq('id', g.event_id).single(),
    g.ticket_type_id
      ? supabase
          .from('ticket_types')
          .select('*')
          .eq('id', g.ticket_type_id)
          .single()
      : Promise.resolve({ data: null }),
  ]);

  const event = eventRes.data as Event | null;
  const ticketType = ticketRes.data as TicketType | null;

  if (!event) redirect('/');

  const fullName = `${g.first_name} ${g.last_name}`;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 sm:py-10">
      <div className="mx-auto max-w-md space-y-6">
        {/* Event context */}
        <div className="text-center">
          <p className="text-sm font-medium text-gray-500">{event.name}</p>
          <h1 className="mt-1 text-sm text-gray-400">Guest Check-In</h1>
        </div>

        {/* Guest card */}
        <Card variant="elevated">
          <CardBody className="space-y-6">
            {/* Avatar and name */}
            <div className="flex flex-col items-center text-center">
              <Avatar name={fullName} size="lg" className="mb-3" />
              <h2 className="text-2xl font-bold text-gray-900">{fullName}</h2>
              <p className="text-sm text-gray-500">{g.email}</p>
              {g.phone && (
                <p className="text-sm text-gray-400">{g.phone}</p>
              )}
            </div>

            {/* Details */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Ticket Type
                </p>
                <p className="mt-1 text-sm font-medium text-gray-900">
                  {ticketType?.name || 'General'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Paddle Number
                </p>
                <p className="mt-1 text-sm font-medium text-gray-900">
                  {g.paddle_number ? `#${g.paddle_number}` : 'Not assigned'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Category
                </p>
                <Badge
                  variant={
                    g.category === 'vip'
                      ? 'warning'
                      : g.category === 'sponsor'
                      ? 'info'
                      : 'neutral'
                  }
                  className="mt-1"
                >
                  {g.category}
                </Badge>
              </div>
              {g.table_assignment && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Table
                  </p>
                  <p className="mt-1 text-sm font-medium text-gray-900">
                    {g.table_assignment}
                  </p>
                </div>
              )}
            </div>

            {/* Check-in status */}
            <div className="rounded-lg border p-4">
              {g.checked_in ? (
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100">
                    <svg
                      className="h-6 w-6 text-green-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-green-800">
                      Checked In
                    </p>
                    {g.checked_in_at && (
                      <p className="text-xs text-gray-500">
                        {formatDateTime(g.checked_in_at)}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-gray-500 text-center">
                    This guest has not been checked in yet.
                  </p>
                  <CheckInButton
                    eventId={g.event_id}
                    guestId={g.id}
                  />
                </div>
              )}
            </div>

            {/* Notes */}
            {g.notes && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Notes
                </p>
                <p className="mt-1 rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
                  {g.notes}
                </p>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Back link */}
        <div className="text-center">
          <Link
            href={`/events/${g.event_id}/guests`}
            className="text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            Back to Guest List
          </Link>
        </div>
      </div>
    </div>
  );
}
