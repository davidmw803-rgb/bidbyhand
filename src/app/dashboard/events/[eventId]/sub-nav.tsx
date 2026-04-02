'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const tabs = [
  { label: 'Overview', segment: '' },
  { label: 'Items', segment: '/items' },
  { label: 'Tickets', segment: '/tickets' },
  { label: 'Guests', segment: '/guests' },
  { label: 'Donations', segment: '/donations' },
  { label: 'Live Dashboard', segment: '/live' },
  { label: 'Reports', segment: '/reports' },
  { label: 'Settings', segment: '/settings' },
];

interface EventSubNavProps {
  eventId: string;
}

export function EventSubNav({ eventId }: EventSubNavProps) {
  const pathname = usePathname();
  const basePath = `/dashboard/events/${eventId}`;

  return (
    <div className="flex border-b border-gray-200 overflow-x-auto" role="tablist">
      {tabs.map((tab) => {
        const href = `${basePath}${tab.segment}`;
        const isActive =
          tab.segment === ''
            ? pathname === basePath
            : pathname.startsWith(href);

        return (
          <Link
            key={tab.segment}
            href={href}
            role="tab"
            aria-selected={isActive}
            className={cn(
              'whitespace-nowrap px-4 py-2 text-sm font-medium transition-colors',
              'border-b-2 -mb-px',
              isActive
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
