'use client';

import { useState } from 'react';
import { formatCurrency, cn } from '@/lib/utils';
import { Heart, Gift } from 'lucide-react';

type Props = {
  eventId: string;
  campaignName?: string;
  presetAmounts?: number[];
  onDonate?: (amount: number, isAnonymous: boolean, tributeName?: string) => Promise<void>;
  className?: string;
};

const DEFAULT_AMOUNTS = [2500, 5000, 10000, 25000, 50000, 100000]; // in cents

export function DonationButtons({
  eventId,
  campaignName = 'General Fund',
  presetAmounts = DEFAULT_AMOUNTS,
  onDonate,
  className,
}: Props) {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [tributeName, setTributeName] = useState('');
  const [showTribute, setShowTribute] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const finalAmount = selectedAmount || (customAmount ? Math.round(parseFloat(customAmount) * 100) : 0);

  async function handleDonate() {
    if (!finalAmount || finalAmount <= 0) return;
    setIsSubmitting(true);

    try {
      if (onDonate) {
        await onDonate(finalAmount, isAnonymous, tributeName || undefined);
      } else {
        await fetch(`/api/events/${eventId}/donations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: finalAmount,
            campaign_name: campaignName,
            is_anonymous: isAnonymous,
            tribute_name: tributeName || null,
          }),
        });
      }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      setSelectedAmount(null);
      setCustomAmount('');
    } catch {
      // Error handling via toast in production
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={cn('bg-white rounded-xl shadow-sm border border-gray-100 p-6', className)}>
      <div className="flex items-center gap-2 mb-4">
        <Heart className="w-5 h-5 text-red-500" />
        <h3 className="font-semibold text-lg text-gray-900">{campaignName}</h3>
      </div>

      {/* Preset amounts */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {presetAmounts.map((amount) => (
          <button
            key={amount}
            onClick={() => {
              setSelectedAmount(amount);
              setCustomAmount('');
            }}
            className={cn(
              'py-3 px-4 rounded-lg font-semibold text-sm transition-all',
              selectedAmount === amount
                ? 'bg-brand-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
          >
            {formatCurrency(amount)}
          </button>
        ))}
      </div>

      {/* Custom amount */}
      <div className="mb-4">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
          <input
            type="number"
            placeholder="Other amount"
            value={customAmount}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setCustomAmount(e.target.value);
              setSelectedAmount(null);
            }}
            className="w-full pl-8 pr-4 py-3 rounded-lg border border-gray-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none"
            min="1"
            step="1"
          />
        </div>
      </div>

      {/* Options */}
      <div className="space-y-2 mb-4">
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={isAnonymous}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIsAnonymous(e.target.checked)}
            className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
          />
          Make donation anonymous
        </label>

        <button
          onClick={() => setShowTribute(!showTribute)}
          className="flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700"
        >
          <Gift className="w-4 h-4" />
          {showTribute ? 'Remove tribute' : 'Add tribute / in memory of'}
        </button>

        {showTribute && (
          <input
            type="text"
            placeholder="In honor / memory of..."
            value={tributeName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTributeName(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none text-sm"
          />
        )}
      </div>

      {/* Submit */}
      <button
        onClick={handleDonate}
        disabled={!finalAmount || isSubmitting}
        className={cn(
          'w-full py-3 px-4 rounded-lg font-bold text-lg transition-all',
          finalAmount > 0
            ? 'bg-red-500 text-white hover:bg-red-600 active:bg-red-700 shadow-md'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
        )}
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Processing...
          </span>
        ) : success ? (
          'Thank you!'
        ) : (
          `Donate ${finalAmount > 0 ? formatCurrency(finalAmount) : ''}`
        )}
      </button>
    </div>
  );
}
