'use client';

import { create } from 'zustand';
import type { Bid } from '@/types';

type BidState = {
  /** Map of itemId -> array of recent bids */
  bidsByItem: Record<string, Bid[]>;
  /** Map of itemId -> current highest bid amount */
  currentBids: Record<string, { amount: number; winnerId: string }>;
  /** Bid ticker — last N bids across all items */
  recentBids: Bid[];
  addBid: (itemId: string, bid: Bid) => void;
  setCurrentBid: (itemId: string, amount: number, winnerId: string) => void;
  initBids: (itemId: string, bids: Bid[]) => void;
  clearBids: () => void;
};

export const useBidStore = create<BidState>((set) => ({
  bidsByItem: {},
  currentBids: {},
  recentBids: [],

  addBid: (itemId, bid) =>
    set((state) => ({
      bidsByItem: {
        ...state.bidsByItem,
        [itemId]: [bid, ...(state.bidsByItem[itemId] || [])].slice(0, 50),
      },
      recentBids: [bid, ...state.recentBids].slice(0, 20),
    })),

  setCurrentBid: (itemId, amount, winnerId) =>
    set((state) => ({
      currentBids: {
        ...state.currentBids,
        [itemId]: { amount, winnerId },
      },
    })),

  initBids: (itemId, bids) =>
    set((state) => ({
      bidsByItem: {
        ...state.bidsByItem,
        [itemId]: bids,
      },
    })),

  clearBids: () => set({ bidsByItem: {}, currentBids: {}, recentBids: [] }),
}));

type NotificationState = {
  notifications: Array<{
    id: string;
    type: 'outbid' | 'won' | 'invoice' | 'info';
    title: string;
    message: string;
    itemId?: string;
    read: boolean;
    createdAt: string;
  }>;
  unreadCount: number;
  addNotification: (notification: Omit<NotificationState['notifications'][0], 'id' | 'read' | 'createdAt'>) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
};

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,

  addNotification: (notification) =>
    set((state) => {
      const newNotif = {
        ...notification,
        id: crypto.randomUUID(),
        read: false,
        createdAt: new Date().toISOString(),
      };
      return {
        notifications: [newNotif, ...state.notifications].slice(0, 50),
        unreadCount: state.unreadCount + 1,
      };
    }),

  markRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    })),

  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    })),
}));
