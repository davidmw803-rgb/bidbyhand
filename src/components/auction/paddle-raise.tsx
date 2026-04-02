'use client';

import { useState } from 'react';
import { formatCurrency, cn } from '@/lib/utils';
import { Hand, Check } from 'lucide-react';

type Props = {
  eventId: string;
  amounts?: number[];
  guestId?: string;
  onPledge?: (amount: number) => Promise<void>;
  className?: string;
};

const DEFAULT_PADDLE_AMOUNTS = [100000, 50000, 25000, 10000, 5000, 2500, 1000]; // cents

export function PaddleRaise({
  eventId,
  amounts = DEFAULT_PADDLE_AMOUNTS,
  guestId,
  onPledge,
  className,
}: Props) {
  const [pledgedAmount, setPledgedAmount] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handlePledge(amount: number) {
    setIsSubmitting(true);
    try {
      if (onPledge) {
        await onPledge(amount);
      } else {
        await fetch(`/api/events/${eventId}/donations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount,
            campaign_name: 'Paddle Raise',
            guest_id: guestId,
          }),
        });
      }
      setPledgedAmount(amount);
    } catch {
      // Error handling
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className="text-center mb-6">
        <Hand className="w-10 h-10 text-brand-600 mx-auto mb-2" />
        <h2 className="text-xl font-bold text-gray-900">Fund-a-Need</h2>
        <p className="text-sm text-gray-500 mt-1">Raise your paddle to make a difference</p>
      </div>

      <div className="space-y-2">
        {amounts.map((amount) => (
          <button
            key={amount}
            onClick={() => handlePledge(amount)}
            disabled={isSubmitting || pledgedAmount !== null}
            className={cn(
              'w-full py-4 px-6 rounded-xl font-bold text-lg transition-all flex items-center justify-between',
              pledgedAmount === amount
                ? 'bg-success-500 text-white'
                : pledgedAmount !== null
                ? 'bg-gray-100 text-gray-400'
                : 'bg-white border-2 border-gray-200 text-gray-900 hover:border-brand-500 hover:bg-brand-50 active:bg-brand-100'
            )}
          >
            <span>{formatCurrency(amount)}</span>
            {pledgedAmount === amount && <Check className="w-6 h-6" />}
          </button>
        ))}
      </div>

      {pledgedAmount && (
        <div className="text-center p-4 bg-success-50 rounded-xl">
          <p className="text-success-700 font-semibold">
            Thank you for your {formatCurrency(pledgedAmount)} pledge!
          </p>
        </div>
      )}
    </div>
  );
}
