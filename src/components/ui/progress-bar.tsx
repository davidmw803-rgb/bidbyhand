import React from 'react';
import { cn } from '@/lib/utils';

export interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  current: number;
  goal: number;
  color?: string;
  showLabel?: boolean;
  formatValue?: (value: number) => string;
}

const defaultFormat = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

function ProgressBar({
  current,
  goal,
  color = 'bg-brand-600',
  showLabel = true,
  formatValue = defaultFormat,
  className,
  ...props
}: ProgressBarProps) {
  const percentage = goal > 0 ? Math.min((current / goal) * 100, 100) : 0;

  return (
    <div className={cn('w-full', className)} {...props}>
      {showLabel && (
        <div className="mb-1 flex items-center justify-between text-sm">
          <span className="font-semibold text-gray-900">
            {formatValue(current)}
          </span>
          <span className="text-gray-500">of {formatValue(goal)}</span>
        </div>
      )}
      <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500 ease-out',
            color
          )}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={current}
          aria-valuemin={0}
          aria-valuemax={goal}
        />
      </div>
      {showLabel && (
        <p className="mt-1 text-right text-xs text-gray-500">
          {Math.round(percentage)}% funded
        </p>
      )}
    </div>
  );
}

export { ProgressBar };
