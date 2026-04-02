'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

export interface CountdownProps extends React.HTMLAttributes<HTMLDivElement> {
  endsAt: string;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

function calcTimeLeft(endsAt: string): TimeLeft {
  const total = new Date(endsAt).getTime() - Date.now();
  if (total <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
  }
  return {
    days: Math.floor(total / (1000 * 60 * 60 * 24)),
    hours: Math.floor((total / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((total / (1000 * 60)) % 60),
    seconds: Math.floor((total / 1000) % 60),
    total,
  };
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function Countdown({ endsAt, className, ...props }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => calcTimeLeft(endsAt));

  useEffect(() => {
    const timer = setInterval(() => {
      const tl = calcTimeLeft(endsAt);
      setTimeLeft(tl);
      if (tl.total <= 0) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [endsAt]);

  if (timeLeft.total <= 0) {
    return (
      <div
        className={cn('text-sm font-semibold text-gray-500', className)}
        {...props}
      >
        Closed
      </div>
    );
  }

  const isUrgent = timeLeft.total < 5 * 60 * 1000;

  const segments = [
    { label: 'Days', value: timeLeft.days },
    { label: 'Hrs', value: timeLeft.hours },
    { label: 'Min', value: timeLeft.minutes },
    { label: 'Sec', value: timeLeft.seconds },
  ];

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 text-sm font-mono',
        isUrgent ? 'text-red-600' : 'text-gray-900',
        className
      )}
      {...props}
    >
      {segments.map((seg, i) => (
        <React.Fragment key={seg.label}>
          {i > 0 && <span className="text-gray-400">:</span>}
          <span className="flex flex-col items-center">
            <span className="text-base font-bold leading-none">
              {pad(seg.value)}
            </span>
            <span className="text-[10px] font-normal uppercase text-gray-500">
              {seg.label}
            </span>
          </span>
        </React.Fragment>
      ))}
    </div>
  );
}

export { Countdown };
