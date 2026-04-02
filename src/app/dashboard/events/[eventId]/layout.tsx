import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import type { Event } from '@/types';
import { Badge } from '@/components/ui/badge';
import { EventSubNav } from './sub-nav';
export const dynamic = 'force-dynamic';

const statusBadgeVariant: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  draft: 'neutral',
  published: 'info',
  active: 'success',
  closed: 'warning',
  archived: 'danger',
};

export default async function EventDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { eventId: string };
}) {
  const supabase = createServerSupabase();

  const { data: event } = await supabase
    .from('events')
    .select('*')
    .eq('id', params.eventId)
    .single();

  if (!event) redirect('/events');

  const ev = event as Event;

  return (
    <div className="space-y-6">
      {/* Event header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">{ev.name}</h1>
          <Badge variant={statusBadgeVariant[ev.status] || 'neutral'}>
            {ev.status}
          </Badge>
        </div>
      </div>

      {/* Sub-navigation tabs */}
      <EventSubNav eventId={params.eventId} />

      {/* Page content */}
      {children}
    </div>
  );
}
