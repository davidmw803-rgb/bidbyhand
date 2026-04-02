import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import { formatCurrency, formatDate, timeRemaining } from '@/lib/utils';
import { Button, Badge, ProgressBar, Card, CardBody } from '@/components/ui';
import {
  Calendar,
  MapPin,
  Clock,
  ArrowRight,
  Heart,
  Ticket,
  Gavel,
  Gift,
} from 'lucide-react';
import type { Event, TicketType, Item } from '@/types';
export const dynamic = 'force-dynamic';

export default async function EventPage({
  params,
}: {
  params: { eventId: string };
}) {
  const supabase = createServerSupabase();

  const { data: event } = await supabase
    .from('events')
    .select('*')
    .eq('slug', params.eventId)
    .in('status', ['published', 'active', 'closed'])
    .single<Event>();

  if (!event) notFound();

  const [{ data: ticketTypes }, { data: items }, { data: donations }] = await Promise.all([
    supabase
      .from('ticket_types')
      .select('*')
      .eq('event_id', event.id)
      .order('price', { ascending: true })
      .returns<TicketType[]>(),
    supabase
      .from('items')
      .select('*')
      .eq('event_id', event.id)
      .eq('is_visible', true)
      .in('status', ['active', 'closed'])
      .order('sort_order', { ascending: true })
      .limit(8)
      .returns<Item[]>(),
    supabase
      .from('donations')
      .select('amount')
      .eq('event_id', event.id),
  ]);

  const totalRaised =
    (donations || []).reduce((sum, d) => sum + d.amount, 0) +
    (items || []).reduce((sum, i) => sum + (i.current_bid || 0), 0);

  const isActive = event.status === 'active';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Banner */}
      <div className="relative h-48 sm:h-64 md:h-80 bg-gradient-to-br from-brand-600 to-brand-800">
        {event.cover_image_url && (
          <Image
            src={event.cover_image_url}
            alt={event.name}
            fill
            className="object-cover"
            priority
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
          <div className="mx-auto max-w-4xl">
            <Badge variant={isActive ? 'success' : 'neutral'} className="mb-2">
              {event.status === 'active' ? 'Live Now' : event.status === 'closed' ? 'Ended' : 'Upcoming'}
            </Badge>
            <h1 className="text-2xl font-bold text-white sm:text-4xl">
              {event.name}
            </h1>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-6 space-y-8">
        {/* Event Info */}
        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-gray-400" />
            {formatDate(event.start_time, 'EEEE, MMMM d, yyyy')}
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-gray-400" />
            {formatDate(event.start_time, 'h:mm a')} - {formatDate(event.end_time, 'h:mm a')}
          </div>
          {event.venue_name && (
            <div className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-gray-400" />
              {event.venue_name}
              {event.venue_address && `, ${event.venue_address}`}
            </div>
          )}
        </div>

        {event.description && (
          <p className="text-gray-600 leading-relaxed">{event.description}</p>
        )}

        {/* Fundraising Thermometer */}
        {event.goal_amount && (
          <Card variant="bordered">
            <CardBody>
              <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-900">
                <Heart className="h-5 w-5 text-brand-600" />
                Fundraising Progress
              </h2>
              <ProgressBar
                current={totalRaised / 100}
                goal={event.goal_amount / 100}
              />
            </CardBody>
          </Card>
        )}

        {/* Quick Action Buttons */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Link href={`/events/${params.eventId}/register`}>
            <Button variant="primary" className="w-full touch-target">
              <Ticket className="h-4 w-4" />
              Buy Tickets
            </Button>
          </Link>
          <Link href={`/events/${params.eventId}/items`}>
            <Button variant="outline" className="w-full touch-target">
              <Gavel className="h-4 w-4" />
              Browse Items
            </Button>
          </Link>
          <Link href={`/events/${params.eventId}/donate`}>
            <Button variant="outline" className="w-full touch-target">
              <Gift className="h-4 w-4" />
              Donate
            </Button>
          </Link>
          <Link href={`/events/${params.eventId}/my-bids`}>
            <Button variant="ghost" className="w-full touch-target">
              My Bids
            </Button>
          </Link>
        </div>

        {/* Ticket Types */}
        {ticketTypes && ticketTypes.length > 0 && (
          <section>
            <h2 className="mb-4 text-xl font-bold text-gray-900">Tickets</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {ticketTypes.map((tt) => {
                const available = tt.quantity ? tt.quantity - tt.sold_count : null;
                const soldOut = available !== null && available <= 0;
                return (
                  <Card key={tt.id} variant="bordered" className="flex flex-col">
                    <CardBody className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900">{tt.name}</h3>
                          {tt.description && (
                            <p className="mt-1 text-sm text-gray-500">{tt.description}</p>
                          )}
                          {tt.seats > 1 && (
                            <p className="mt-1 text-xs text-gray-400">{tt.seats} seats included</p>
                          )}
                        </div>
                        <span className="text-lg font-bold text-brand-700">
                          {tt.price === 0 ? 'Free' : formatCurrency(tt.price, event.currency)}
                        </span>
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        {available !== null && (
                          <span className="text-xs text-gray-400">
                            {soldOut ? 'Sold out' : `${available} remaining`}
                          </span>
                        )}
                        <Link href={`/events/${params.eventId}/register?ticket=${tt.id}`}>
                          <Button size="sm" disabled={soldOut}>
                            {soldOut ? 'Sold Out' : 'Select'}
                          </Button>
                        </Link>
                      </div>
                    </CardBody>
                  </Card>
                );
              })}
            </div>
          </section>
        )}

        {/* Item Catalog Preview */}
        {items && items.length > 0 && (
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Auction Items</h2>
              <Link
                href={`/events/${params.eventId}/items`}
                className="flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline"
              >
                View All <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {items.map((item) => (
                <Link
                  key={item.id}
                  href={
                    isActive
                      ? `/events/${params.eventId}/items/${item.id}`
                      : `/events/${params.eventId}/items`
                  }
                  className="card-auction group"
                >
                  <div className="relative aspect-square bg-gray-100">
                    {item.photo_url ? (
                      <Image
                        src={item.photo_url}
                        alt={item.title}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-gray-300">
                        <Gavel className="h-8 w-8" />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="truncate text-sm font-medium text-gray-900 group-hover:text-brand-600">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-sm font-bold text-brand-700">
                      {item.current_bid
                        ? formatCurrency(item.current_bid, event.currency)
                        : formatCurrency(item.starting_bid, event.currency)}
                    </p>
                    {item.current_bid ? (
                      <p className="text-xs text-gray-400">{item.bid_count} bids</p>
                    ) : (
                      <p className="text-xs text-gray-400">Starting bid</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Donation Section */}
        <section>
          <Card variant="bordered" className="overflow-visible">
            <CardBody className="text-center py-8">
              <Gift className="mx-auto h-10 w-10 text-brand-600 mb-3" />
              <h2 className="text-xl font-bold text-gray-900">
                Make a Donation
              </h2>
              <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
                Every dollar counts. Support this cause with a direct donation.
              </p>
              <Link href={`/events/${params.eventId}/donate`}>
                <Button size="lg" className="mt-6">
                  Donate Now
                  <Heart className="h-4 w-4" />
                </Button>
              </Link>
            </CardBody>
          </Card>
        </section>
      </div>
    </div>
  );
}
