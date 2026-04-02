'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Guest } from '@/types';

type GuestAuth = {
  guest: Guest | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, eventId: string) => Promise<void>;
  loginWithOTP: (phone: string, eventId: string) => Promise<void>;
  verifyOTP: (phone: string, token: string) => Promise<void>;
  logout: () => void;
};

export function useGuestAuth(eventId?: string): GuestAuth {
  const [guest, setGuest] = useState<Guest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check for stored guest session
    const stored = localStorage.getItem(`bbh_guest_${eventId}`);
    if (stored) {
      try {
        setGuest(JSON.parse(stored));
      } catch {
        localStorage.removeItem(`bbh_guest_${eventId}`);
      }
    }
    setIsLoading(false);
  }, [eventId]);

  const login = useCallback(async (email: string, eventIdParam: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      await supabase.auth.signInWithOtp({ email });
      // Magic link sent — user will be redirected back
    } catch (err) {
      setError('Failed to send login link');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loginWithOTP = useCallback(async (phone: string, eventIdParam: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      await supabase.auth.signInWithOtp({ phone });
    } catch {
      setError('Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const verifyOTP = useCallback(async (phone: string, token: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.verifyOtp({
        phone,
        token,
        type: 'sms',
      });
      if (authError) throw authError;

      // Fetch guest record
      if (eventId) {
        const { data: guestData } = await supabase
          .from('guests')
          .select('*')
          .eq('event_id', eventId)
          .eq('phone', phone)
          .single();

        if (guestData) {
          setGuest(guestData as Guest);
          localStorage.setItem(`bbh_guest_${eventId}`, JSON.stringify(guestData));
        }
      }
    } catch {
      setError('Invalid code');
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  const logout = useCallback(() => {
    setGuest(null);
    if (eventId) {
      localStorage.removeItem(`bbh_guest_${eventId}`);
    }
  }, [eventId]);

  return { guest, isLoading, error, login, loginWithOTP, verifyOTP, logout };
}
