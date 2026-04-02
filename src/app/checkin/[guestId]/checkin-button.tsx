'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

type Props = {
  eventId: string;
  guestId: string;
};

export function CheckInButton({ eventId, guestId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleCheckIn() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/events/${eventId}/guests/${guestId}/checkin`,
        { method: 'POST' }
      );

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || 'Failed to check in');
      }

      setSuccess(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-lg bg-green-50 p-3">
        <svg
          className="h-5 w-5 text-green-600"
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
        <span className="text-sm font-semibold text-green-800">
          Checked In Successfully
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Button
        className="w-full"
        size="lg"
        loading={loading}
        onClick={handleCheckIn}
      >
        Check In Guest
      </Button>
      {error && (
        <p className="text-center text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
