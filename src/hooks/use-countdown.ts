'use client';

import { useState, useEffect } from 'react';

type CountdownResult = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
  isUrgent: boolean;
  display: string;
};

export function useCountdown(endsAt: string | Date): CountdownResult {
  const [now, setNow] = useState(new Date());
  const end = typeof endsAt === 'string' ? new Date(endsAt) : endsAt;

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const diff = end.getTime() - now.getTime();

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true, isUrgent: false, display: 'Closed' };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  const isUrgent = diff < 5 * 60 * 1000; // Less than 5 minutes

  let display: string;
  if (days > 0) display = `${days}d ${hours}h`;
  else if (hours > 0) display = `${hours}h ${minutes}m`;
  else if (minutes > 0) display = `${minutes}m ${seconds}s`;
  else display = `${seconds}s`;

  return { days, hours, minutes, seconds, isExpired: false, isUrgent, display };
}
