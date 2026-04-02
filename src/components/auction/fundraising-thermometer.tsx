'use client';

import { formatCurrency, cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

type Props = {
  currentAmount: number;
  goalAmount: number;
  className?: string;
  showLabels?: boolean;
  animated?: boolean;
};

export function FundraisingThermometer({
  currentAmount,
  goalAmount,
  className,
  showLabels = true,
  animated = true,
}: Props) {
  const [displayPercent, setDisplayPercent] = useState(animated ? 0 : Math.min((currentAmount / goalAmount) * 100, 100));
  const percent = Math.min((currentAmount / goalAmount) * 100, 100);

  useEffect(() => {
    if (!animated) return;
    const timer = setTimeout(() => setDisplayPercent(percent), 100);
    return () => clearTimeout(timer);
  }, [percent, animated]);

  return (
    <div className={cn('w-full', className)}>
      {showLabels && (
        <div className="flex justify-between items-end mb-2">
          <div>
            <div className="text-3xl font-bold text-brand-700">
              {formatCurrency(currentAmount)}
            </div>
            <div className="text-sm text-gray-500">raised</div>
          </div>
          <div className="text-right">
            <div className="text-lg font-semibold text-gray-600">
              {formatCurrency(goalAmount)}
            </div>
            <div className="text-sm text-gray-500">goal</div>
          </div>
        </div>
      )}

      <div className="relative w-full h-6 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-400 transition-all duration-1000 ease-out"
          style={{ width: `${displayPercent}%` }}
        />
        {percent > 5 && (
          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow">
            {Math.round(percent)}%
          </span>
        )}
      </div>

      {percent >= 100 && (
        <div className="mt-2 text-center text-success-700 font-bold text-sm">
          Goal reached!
        </div>
      )}
    </div>
  );
}
