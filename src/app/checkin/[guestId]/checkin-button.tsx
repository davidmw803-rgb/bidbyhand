'use client';

import { useState } from 'react';
import { CheckCircle } from 'lucide-react';

export function CheckInButton({
  guestId,
  eventId,
  isCheckedIn: initialCheckedIn,
}: {
  guestId: string;
  eventId: string;
  isCheckedIn: boolean;
}) {
  const [isCheckedIn, setIsCheckedIn] = useState(initialCheckedIn);
  const [isLoading, setIsLoading] = useState(false);

  async function handleCheckIn() {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}/guests/${guestId}/checkin`, {
        method: 'POST',
      });
      if (res.ok) {
        setIsCheckedIn(true);
      }
    } catch {
      // Error handling
    } finally {
      setIsLoading(false);
    }
  }

  if (isCheckedIn) {
    return (
      <div className="flex items-center justify-center gap-2 py-4 px-6 rounded-xl bg-green-500 text-white font-bold text-lg">
        <CheckCircle className="w-6 h-6" />
        Checked In
      </div>
    );
  }

  return (
    <button
      onClick={handleCheckIn}
      disabled={isLoading}
      className="w-full py-4 px-6 rounded-xl bg-brand-600 text-white font-bold text-lg hover:bg-brand-700 active:bg-brand-800 transition-colors disabled:opacity-50"
    >
      {isLoading ? 'Checking in...' : 'Check In Guest'}
    </button>
  );
}
