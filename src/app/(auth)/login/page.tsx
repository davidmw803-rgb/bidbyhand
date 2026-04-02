'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button, Input, Tabs } from '@/components/ui';
import { useToast } from '@/components/ui/toast';
import { Mail, Phone, ArrowRight } from 'lucide-react';

function OrganizerLogin() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const newErrors: typeof errors = {};
    if (!email) newErrors.email = 'Email is required';
    if (!password) newErrors.password = 'Password is required';
    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast('error', error.message);
        return;
      }
      toast('success', 'Welcome back!');
      router.push('/dashboard');
    } catch {
      toast('error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Email"
        variant="email"
        name="email"
        placeholder="you@organization.org"
        value={email}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
        error={errors.email}
      />
      <Input
        label="Password"
        name="password"
        type="password"
        placeholder="Enter your password"
        value={password}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
        error={errors.password}
      />
      <div className="flex items-center justify-between">
        <Link href="/forgot-password" className="text-sm text-brand-600 hover:underline">
          Forgot password?
        </Link>
      </div>
      <Button type="submit" loading={loading} className="w-full">
        Sign In
        <ArrowRight className="h-4 w-4" />
      </Button>
      <p className="text-center text-sm text-gray-500">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="font-medium text-brand-600 hover:underline">
          Sign up
        </Link>
      </p>
    </form>
  );
}

function BidderLogin() {
  const { toast } = useToast();
  const [mode, setMode] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [verifying, setVerifying] = useState(false);

  async function handleSendLink(e: React.FormEvent) {
    e.preventDefault();
    if (mode === 'email' && !email) {
      toast('error', 'Please enter your email');
      return;
    }
    if (mode === 'phone' && !phone) {
      toast('error', 'Please enter your phone number');
      return;
    }
    setLoading(true);

    try {
      const supabase = createClient();
      if (mode === 'email') {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { shouldCreateUser: true },
        });
        if (error) {
          toast('error', error.message);
          return;
        }
        toast('success', 'Check your email for a login link');
      } else {
        const { error } = await supabase.auth.signInWithOtp({ phone });
        if (error) {
          toast('error', error.message);
          return;
        }
        toast('success', 'Check your phone for a verification code');
      }
      setSent(true);
    } catch {
      toast('error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!otp) {
      toast('error', 'Please enter the verification code');
      return;
    }
    setVerifying(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.verifyOtp({
        phone,
        token: otp,
        type: 'sms',
      });
      if (error) {
        toast('error', error.message);
        return;
      }
      toast('success', 'Logged in successfully');
      // Redirect back to the event the user came from, or home
      const params = new URLSearchParams(window.location.search);
      const redirect = params.get('redirect') || '/';
      window.location.href = redirect;
    } catch {
      toast('error', 'Verification failed. Please try again.');
    } finally {
      setVerifying(false);
    }
  }

  if (sent && mode === 'email') {
    return (
      <div className="text-center py-4">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-50">
          <Mail className="h-7 w-7 text-brand-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">Check your email</h3>
        <p className="mt-2 text-sm text-gray-500">
          We sent a magic link to <span className="font-medium text-gray-700">{email}</span>.
          Click the link to sign in.
        </p>
        <button
          onClick={() => setSent(false)}
          className="mt-6 text-sm text-brand-600 hover:underline"
        >
          Use a different email
        </button>
      </div>
    );
  }

  if (sent && mode === 'phone') {
    return (
      <form onSubmit={handleVerifyOtp} className="space-y-4">
        <div className="text-center mb-2">
          <p className="text-sm text-gray-500">
            Enter the code sent to <span className="font-medium text-gray-700">{phone}</span>
          </p>
        </div>
        <Input
          label="Verification Code"
          name="otp"
          placeholder="123456"
          value={otp}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOtp((e.target as HTMLInputElement).value)}
          className="text-center text-2xl tracking-widest"
        />
        <Button type="submit" loading={verifying} className="w-full">
          Verify Code
        </Button>
        <button
          type="button"
          onClick={() => setSent(false)}
          className="w-full text-center text-sm text-brand-600 hover:underline"
        >
          Use a different number
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSendLink} className="space-y-4">
      <div className="flex gap-2 mb-2">
        <button
          type="button"
          onClick={() => setMode('email')}
          className={`pill flex-1 justify-center ${mode === 'email' ? 'pill-active' : 'pill-inactive'}`}
        >
          <Mail className="mr-1.5 h-4 w-4" />
          Email
        </button>
        <button
          type="button"
          onClick={() => setMode('phone')}
          className={`pill flex-1 justify-center ${mode === 'phone' ? 'pill-active' : 'pill-inactive'}`}
        >
          <Phone className="mr-1.5 h-4 w-4" />
          Phone
        </button>
      </div>

      {mode === 'email' ? (
        <Input
          label="Email Address"
          variant="email"
          name="bidder-email"
          placeholder="your@email.com"
          value={email}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
        />
      ) : (
        <Input
          label="Phone Number"
          variant="phone"
          name="bidder-phone"
          placeholder="+1 (555) 123-4567"
          value={phone}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPhone((e.target as HTMLInputElement).value)}
        />
      )}

      <Button type="submit" loading={loading} className="w-full">
        {mode === 'email' ? 'Send Magic Link' : 'Send Code'}
        <ArrowRight className="h-4 w-4" />
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div>
      <h1 className="mb-6 text-center text-2xl font-bold text-gray-900">
        Sign In
      </h1>
      <Tabs
        items={[
          { label: 'Organizer', content: <OrganizerLogin /> },
          { label: 'Bidder / Guest', content: <BidderLogin /> },
        ]}
      />
    </div>
  );
}
