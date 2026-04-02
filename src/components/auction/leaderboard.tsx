'use client';

import { formatCurrency, cn } from '@/lib/utils';
import { Trophy, TrendingUp } from 'lucide-react';

type LeaderboardEntry = {
  id: string;
  name: string;
  amount: number;
  rank: number;
};

type Props = {
  title: string;
  entries: LeaderboardEntry[];
  type: 'bidders' | 'items';
  className?: string;
};

export function Leaderboard({ title, entries, type, className }: Props) {
  const icon = type === 'bidders' ? Trophy : TrendingUp;
  const Icon = icon;

  return (
    <div className={cn('bg-white rounded-xl shadow-sm border border-gray-100 p-4', className)}>
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-5 h-5 text-brand-600" />
        <h3 className="font-semibold text-gray-900">{title}</h3>
      </div>

      <div className="space-y-2">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className={cn(
              'flex items-center gap-3 p-2 rounded-lg',
              entry.rank <= 3 ? 'bg-brand-50' : 'bg-gray-50'
            )}
          >
            <div
              className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold',
                entry.rank === 1 && 'bg-yellow-400 text-yellow-900',
                entry.rank === 2 && 'bg-gray-300 text-gray-700',
                entry.rank === 3 && 'bg-amber-600 text-white',
                entry.rank > 3 && 'bg-gray-200 text-gray-600'
              )}
            >
              {entry.rank}
            </div>
            <span className="flex-1 font-medium text-gray-700 truncate text-sm">
              {entry.name}
            </span>
            <span className="font-bold text-brand-700 text-sm">
              {formatCurrency(entry.amount)}
            </span>
          </div>
        ))}

        {entries.length === 0 && (
          <div className="text-center text-gray-400 py-4 text-sm">
            No activity yet
          </div>
        )}
      </div>
    </div>
  );
}
