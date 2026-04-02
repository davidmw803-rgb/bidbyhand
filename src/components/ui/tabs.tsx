'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';

export interface TabItem {
  label: string;
  content: React.ReactNode;
}

export interface TabsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  items: TabItem[];
  defaultIndex?: number;
}

function Tabs({ items, defaultIndex = 0, className, ...props }: TabsProps) {
  const [activeIndex, setActiveIndex] = useState(defaultIndex);

  return (
    <div className={cn('w-full', className)} {...props}>
      <div
        className="flex border-b border-gray-200 overflow-x-auto"
        role="tablist"
      >
        {items.map((item, index) => (
          <button
            key={item.label}
            role="tab"
            aria-selected={index === activeIndex}
            onClick={() => setActiveIndex(index)}
            className={cn(
              'whitespace-nowrap px-4 py-2 text-sm font-medium transition-colors',
              'border-b-2 -mb-px',
              index === activeIndex
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="py-4" role="tabpanel">
        {items[activeIndex]?.content}
      </div>
    </div>
  );
}

export { Tabs };
