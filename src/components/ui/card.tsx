import React from 'react';
import { cn } from '@/lib/utils';

const variantStyles = {
  default: 'bg-white shadow-sm',
  elevated: 'bg-white shadow-md',
  bordered: 'bg-white border border-gray-200',
} as const;

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: keyof typeof variantStyles;
}

function Card({ className, variant = 'default', ...props }: CardProps) {
  return (
    <div
      className={cn('rounded-xl overflow-hidden', variantStyles[variant], className)}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-100', className)}
      {...props}
    />
  );
}

function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('px-4 py-4 sm:px-6', className)} {...props} />
  );
}

function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'px-4 py-3 sm:px-6 sm:py-4 border-t border-gray-100 bg-gray-50',
        className
      )}
      {...props}
    />
  );
}

export { Card, CardHeader, CardBody, CardFooter };
