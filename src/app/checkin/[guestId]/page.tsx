import { createServerSupabase } from '@/lib/supabase/server';
import { formatDateTime } from '@/lib/utils';
import { CheckCircle, XCircle, User, Ticket } from 'lucide-react';
import { CheckInButton } from './checkin-button';

export default async function CheckInPage({
  params,
}: {
  params: { guestId: string };
}) {
  const supabase = createServerSupabase();

  const { data: guest } = await supabase
    .from('guests')
    .select(`
      *,
      ticket_type:ticket_types(*),
      event:events(id, name, slug, org_id)
    `)
    .eq('id', params.guestId)
    .single();

  if (!guest) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-md w-full">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900">Guest Not Found</h1>
          <p className="text-gray-500 mt-2">This QR code is not valid or has expired.</p>
        </div>
      </div>
    );
  }

  const isCheckedIn = guest.checked_in;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full">
        {/* Status indicator */}
        <div className="text-center mb-6">
          {isCheckedIn ? (
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
          ) : (
            <User className="w-16 h-16 text-brand-600 mx-auto" />
          )}
        </div>

        {/* Guest name */}
        <h1 className="text-3xl font-bold text-gray-900 text-center">
          {guest.first_name} {guest.last_name}
        </h1>

        {/* Details */}
        <div className="mt-6 space-y-3">
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-gray-500 text-sm">Event</span>
            <span className="font-medium text-gray-900">{(guest as any).event?.name}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-gray-500 text-sm">Ticket</span>
            <span className="font-medium text-gray-900">
              <Ticket className="w-4 h-4 inline mr-1" />
              {(guest as any).ticket_type?.name || 'General'}
            </span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-gray-500 text-sm">Paddle #</span>
            <span className="text-2xl font-bold text-brand-700">
              {guest.paddle_number || '—'}
            </span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-gray-500 text-sm">Category</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              guest.category === 'vip' ? 'bg-purple-100 text-purple-700' :
              guest.category === 'sponsor' ? 'bg-yellow-100 text-yellow-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {(guest.category || 'general').toUpperCase()}
            </span>
          </div>
          {guest.dietary_restrictions && (
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-500 text-sm">Dietary</span>
              <span className="text-gray-900">{guest.dietary_restrictions}</span>
            </div>
          )}
          {isCheckedIn && guest.checked_in_at && (
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-500 text-sm">Checked in at</span>
              <span className="text-green-600 font-medium">
                {formatDateTime(guest.checked_in_at)}
              </span>
            </div>
          )}
        </div>

        {/* Payment status */}
        <div className="mt-4 p-3 rounded-lg bg-green-50 text-center">
          <p className="text-sm text-green-700 font-medium">
            {guest.payment_method_id ? 'Card on file' : 'No card on file'}
          </p>
        </div>

        {/* Check-in button */}
        <div className="mt-6">
          <CheckInButton
            guestId={guest.id}
            eventId={(guest as any).event?.id}
            isCheckedIn={isCheckedIn}
          />
        </div>
      </div>
    </div>
  );
}
