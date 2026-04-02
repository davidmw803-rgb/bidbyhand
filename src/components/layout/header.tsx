'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotificationStore } from '@/lib/store';

type Props = {
  variant?: 'default' | 'event' | 'minimal';
  eventName?: string;
  eventSlug?: string;
};

export function Header({ variant = 'default', eventName, eventSlug }: Props) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { unreadCount } = useNotificationStore();

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">B</span>
            </div>
            {variant !== 'minimal' && (
              <span className="font-bold text-gray-900 hidden sm:block">BidByHand</span>
            )}
          </Link>

          {/* Event name (event variant) */}
          {variant === 'event' && eventName && (
            <div className="flex-1 text-center">
              <h1 className="font-semibold text-gray-900 truncate text-sm sm:text-base">
                {eventName}
              </h1>
            </div>
          )}

          {/* Navigation */}
          {variant === 'default' && (
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/events" className="text-sm text-gray-600 hover:text-gray-900">
                Events
              </Link>
              <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">
                Dashboard
              </Link>
              <Link
                href="/login"
                className="text-sm font-semibold text-brand-600 hover:text-brand-700"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="text-sm font-semibold bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700"
              >
                Get Started
              </Link>
            </nav>
          )}

          {/* Event navigation */}
          {variant === 'event' && eventSlug && (
            <div className="flex items-center gap-2">
              <button className="relative p-2 text-gray-500 hover:text-gray-700">
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            </div>
          )}

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-gray-500"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white animate-slide-down">
          <div className="px-4 py-4 space-y-3">
            {variant === 'default' && (
              <>
                <Link href="/events" className="block text-gray-600 py-2" onClick={() => setMobileMenuOpen(false)}>
                  Events
                </Link>
                <Link href="/dashboard" className="block text-gray-600 py-2" onClick={() => setMobileMenuOpen(false)}>
                  Dashboard
                </Link>
                <Link href="/login" className="block text-brand-600 font-semibold py-2" onClick={() => setMobileMenuOpen(false)}>
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="block text-center bg-brand-600 text-white py-2.5 rounded-lg font-semibold"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Get Started
                </Link>
              </>
            )}
            {variant === 'event' && eventSlug && (
              <>
                <Link href={`/events/${eventSlug}/items`} className="block text-gray-600 py-2" onClick={() => setMobileMenuOpen(false)}>
                  Browse Items
                </Link>
                <Link href={`/events/${eventSlug}/my-bids`} className="block text-gray-600 py-2" onClick={() => setMobileMenuOpen(false)}>
                  My Bids
                </Link>
                <Link href={`/events/${eventSlug}/donate`} className="block text-gray-600 py-2" onClick={() => setMobileMenuOpen(false)}>
                  Donate
                </Link>
                <Link href={`/events/${eventSlug}/leaderboard`} className="block text-gray-600 py-2" onClick={() => setMobileMenuOpen(false)}>
                  Leaderboard
                </Link>
                <Link href={`/events/${eventSlug}/checkout`} className="block text-gray-600 py-2" onClick={() => setMobileMenuOpen(false)}>
                  Checkout
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
