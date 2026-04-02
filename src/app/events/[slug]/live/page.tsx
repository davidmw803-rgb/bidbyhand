'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { formatCurrency } from '@/lib/utils';
import { Radio, Loader2 } from 'lucide-react';
import { FundraisingThermometer } from '@/components/auction/fundraising-thermometer';
import { BidTicker } from '@/components/auction/bid-ticker';

export default function LiveEventPage() {
  const params = useParams();
  const [event, setEvent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchEvent() {
      try {
        const res = await fetch(`/api/events/${params.slug}`);
        if (res.ok) {
          const data = await res.json();
          setEvent(data.data);
        }
      } catch {
        // Error handling
      } finally {
        setIsLoading(false);
      }
    }
    fetchEvent();
    const interval = setInterval(fetchEvent, 15000);
    return () => clearInterval(interval);
  }, [params.slug]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="max-w-lg mx-auto p-4">
        {/* Live indicator */}
        <div className="flex items-center gap-2 mb-4">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
          </span>
          <span className="text-sm font-semibold text-red-600 uppercase tracking-wide">Live</span>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-6">{event?.name || 'Live Event'}</h1>

        {/* Livestream embed */}
        {event?.livestream_url && (
          <div className="mb-6 rounded-xl overflow-hidden bg-black aspect-video">
            <iframe
              src={event.livestream_url}
              className="w-full h-full"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}

        {/* Fundraising progress */}
        {event?.goal_amount > 0 && (
          <div className="mb-6">
            <FundraisingThermometer
              currentAmount={event.total_raised || 0}
              goalAmount={event.goal_amount}
            />
          </div>
        )}

        {/* Total raised */}
        <div className="bg-brand-600 text-white rounded-xl p-6 text-center mb-6">
          <p className="text-sm text-brand-200 uppercase tracking-wide">Total Raised</p>
          <p className="text-4xl font-bold mt-1">
            {formatCurrency(event?.total_raised || 0)}
          </p>
        </div>

        {/* Recent bid activity */}
        <div className="mb-6">
          <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Radio className="w-4 h-4 text-brand-600" />
            Recent Activity
          </h2>
          <BidTicker />
        </div>
      </div>
    </div>
  );
}
