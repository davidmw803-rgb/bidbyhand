'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Search, Grid3X3, Heart, Trophy, Receipt, Radio } from 'lucide-react';

type Props = {
  eventSlug: string;
  className?: string;
};

export function EventNav({ eventSlug, className }: Props) {
  const pathname = usePathname();
  const base = `/events/${eventSlug}`;

  const links = [
    { href: `${base}/items`, label: 'Items', icon: Grid3X3 },
    { href: `${base}/my-bids`, label: 'My Bids', icon: Search },
    { href: `${base}/donate`, label: 'Donate', icon: Heart },
    { href: `${base}/leaderboard`, label: 'Leaders', icon: Trophy },
    { href: `${base}/checkout`, label: 'Checkout', icon: Receipt },
  ];

  return (
    <nav className={cn('fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 safe-area-bottom', className)}>
      <div className="flex items-center justify-around">
        {links.map((link) => {
          const isActive = pathname === link.href || pathname.startsWith(link.href + '/');
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'flex flex-col items-center py-2 px-3 text-xs transition-colors',
                isActive ? 'text-brand-600' : 'text-gray-400 hover:text-gray-600'
              )}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span className="font-medium">{link.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
