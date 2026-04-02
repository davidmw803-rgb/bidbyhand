'use client';

import { useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useBidStore } from '@/lib/store';
import type { Bid } from '@/types';

/** Subscribe to real-time bid updates for an item */
export function useRealtimeBids(itemId: string) {
  const { addBid, setCurrentBid } = useBidStore();

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`bids:${itemId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bids',
          filter: `item_id=eq.${itemId}`,
        },
        (payload) => {
          const bid = payload.new as Bid;
          addBid(itemId, bid);
          if (bid.is_winning) {
            setCurrentBid(itemId, bid.amount, bid.guest_id);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bids',
          filter: `item_id=eq.${itemId}`,
        },
        (payload) => {
          const bid = payload.new as Bid;
          if (bid.status === 'voided') {
            // Refresh bids on void
            addBid(itemId, bid);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [itemId, addBid, setCurrentBid]);
}

/** Subscribe to real-time bid updates for ALL items in an event (dashboard view) */
export function useRealtimeEventBids(eventId: string) {
  const { addBid, setCurrentBid } = useBidStore();

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`event-bids:${eventId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bids',
        },
        (payload) => {
          const bid = payload.new as Bid;
          addBid(bid.item_id, bid);
          if (bid.is_winning) {
            setCurrentBid(bid.item_id, bid.amount, bid.guest_id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, addBid, setCurrentBid]);
}

/** Subscribe to item status changes (open/close/pause) */
export function useRealtimeItemStatus(eventId: string, onStatusChange: (itemId: string, status: string) => void) {
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`item-status:${eventId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'items',
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          const item = payload.new as { id: string; status: string };
          onStatusChange(item.id, item.status);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, onStatusChange]);
}
