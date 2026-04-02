'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Input } from '@/components/ui';
import { useToast } from '@/components/ui/toast';
import { ArrowRight } from 'lucide-react';

interface FormData {
  orgName: string;
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  orgName?: string;
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

function validate(data: FormData): FormErrors {
  const errors: FormErrors = {};
  if (!data.orgName.trim()) errors.orgName = 'Organization name is required';
  if (!data.name.trim()) errors.name = 'Your name is required';
  if (!data.email.trim()) errors.email = 'Email is required';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))
    errors.email = 'Please enter a valid email';
  if (!data.password) errors.password = 'Password is required';
  else if (data.password.length < 8)
    errors.password = 'Password must be at least 8 characters';
  if (data.password !== data.confirmPassword)
    errors.confirmPassword = 'Passwords do not match';
  return errors;
}

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<FormData>({
    orgName: '',
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  function update(field: keyof FormData) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: undefined }));
      }
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationErrors = validate(form);
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_name: form.orgName,
          name: form.name,
          email: form.email,
          password: form.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast('error', data.error || 'Registration failed');
        return;
      }

      toast('success', 'Account created! Redirecting to dashboard...');
      router.push('/dashboard');
    } catch {
      toast('error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="mb-2 text-center text-2xl font-bold text-gray-900">
        Create your account
      </h1>
      <p className="mb-6 text-center text-sm text-gray-500">
        Set up your organization and start running auctions in minutes.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Organization Name"
          name="orgName"
          placeholder="e.g. Hope Foundation"
          value={form.orgName}
          onChange={update('orgName')}
          error={errors.orgName}
        />
        <Input
          label="Your Name"
          name="name"
          placeholder="Jane Smith"
          value={form.name}
          onChange={update('name')}
          error={errors.name}
        />
        <Input
          label="Email"
          variant="email"
          name="email"
          placeholder="jane@hopefoundation.org"
          value={form.email}
          onChange={update('email')}
          error={errors.email}
        />
        <Input
          label="Password"
          name="password"
          type="password"
          placeholder="At least 8 characters"
          value={form.password}
          onChange={update('password')}
          error={errors.password}
        />
        <Input
          label="Confirm Password"
          name="confirmPassword"
          type="password"
          placeholder="Confirm your password"
          value={form.confirmPassword}
          onChange={update('confirmPassword')}
          error={errors.confirmPassword}
        />

        <Button type="submit" loading={loading} className="w-full">
          Create Account
          <ArrowRight className="h-4 w-4" />
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-brand-600 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
