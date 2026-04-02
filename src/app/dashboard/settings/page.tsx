'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Modal } from '@/components/ui/modal';
import type { OrgMemberRole } from '@/types';

type TeamMember = {
  id: string;
  display_name: string;
  email: string;
  role: OrgMemberRole;
  accepted_at: string | null;
};

const ROLES: { value: OrgMemberRole; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'staff', label: 'Staff' },
  { value: 'readonly', label: 'Read Only' },
];

const roleBadgeVariant: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  admin: 'danger',
  manager: 'warning',
  staff: 'info',
  readonly: 'neutral',
};

export default function OrgSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [showInvite, setShowInvite] = useState(false);

  const [form, setForm] = useState({
    name: '',
    logo_url: '',
    ein: '',
    website: '',
  });

  const [inviteForm, setInviteForm] = useState({
    email: '',
    display_name: '',
    role: 'staff' as OrgMemberRole,
  });

  useEffect(() => {
    async function fetchOrg() {
      try {
        const [orgRes, membersRes] = await Promise.all([
          fetch('/api/org'),
          fetch('/api/org/members'),
        ]);

        if (orgRes.ok) {
          const { data } = await orgRes.json();
          setForm({
            name: data.name || '',
            logo_url: data.logo_url || '',
            ein: data.ein || '',
            website: data.website || '',
          });
        }

        if (membersRes.ok) {
          const { data } = await membersRes.json();
          setMembers(data || []);
        }
      } catch {
        // silently fail
      } finally {
        setFetching(false);
      }
    }
    fetchOrg();
  }, []);

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setErrors({ name: 'Organization name is required' });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/org', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          logo_url: form.logo_url.trim() || null,
          website: form.website.trim() || null,
        }),
      });

      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error || 'Failed to update');
      }

      setSaved(true);
      router.refresh();
    } catch (err) {
      setErrors({
        _form: err instanceof Error ? err.message : 'Something went wrong',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteForm.email.trim()) return;

    try {
      const res = await fetch('/api/org/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteForm),
      });

      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error || 'Failed to invite');
      }

      const { data } = await res.json();
      setMembers((prev) => [...prev, data]);
      setInviteForm({ email: '', display_name: '', role: 'staff' });
      setShowInvite(false);
    } catch (err) {
      setErrors({
        _form: err instanceof Error ? err.message : 'Failed to invite member',
      });
    }
  }

  async function handleChangeRole(memberId: string, role: OrgMemberRole) {
    try {
      const res = await fetch(`/api/org/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });

      if (!res.ok) throw new Error('Failed to update role');

      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, role } : m))
      );
    } catch {
      setErrors({ _form: 'Failed to update member role' });
    }
  }

  async function handleRemoveMember(memberId: string) {
    if (!confirm('Remove this team member?')) return;

    try {
      const res = await fetch(`/api/org/members/${memberId}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to remove member');

      setMembers((prev) => prev.filter((m) => m.id !== memberId));
    } catch {
      setErrors({ _form: 'Failed to remove member' });
    }
  }

  async function handleStripeConnect() {
    try {
      const res = await fetch('/api/org/stripe/connect', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to start Stripe setup');
      const { url } = await res.json();
      window.location.href = url;
    } catch {
      setErrors({ _form: 'Failed to connect Stripe. Please try again.' });
    }
  }

  if (fetching) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">
        Organization Settings
      </h1>

      {errors._form && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {errors._form}
        </div>
      )}
      {saved && (
        <div className="rounded-lg bg-green-50 p-4 text-sm text-green-700">
          Settings saved successfully.
        </div>
      )}

      {/* Org details form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-900">
              Organization Details
            </h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <Input
              label="Organization Name"
              name="name"
              value={form.name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('name', e.target.value)}
              error={errors.name}
            />
            <Input
              label="Logo URL"
              name="logo_url"
              value={form.logo_url}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('logo_url', e.target.value)}
              placeholder="https://..."
            />
            <Input
              label="EIN (Tax ID)"
              name="ein"
              value={form.ein}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('ein', e.target.value)}
              placeholder="XX-XXXXXXX"
              helperText="Required for tax-deductible donation receipts"
            />
            <Input
              label="Website"
              name="website"
              value={form.website}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('website', e.target.value)}
              placeholder="https://yourorg.org"
            />
          </CardBody>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" loading={loading}>
            Save Settings
          </Button>
        </div>
      </form>

      {/* Stripe Connect */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-900">Payment Processing</h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <p className="text-sm text-gray-600">
            Connect your Stripe account to accept credit card payments and
            receive payouts directly to your bank account.
          </p>
          <Button variant="outline" onClick={handleStripeConnect}>
            Connect Stripe Account
          </Button>
        </CardBody>
      </Card>

      {/* Team members */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Team Members</h2>
            <Button size="sm" onClick={() => setShowInvite(true)}>
              Invite Member
            </Button>
          </div>
        </CardHeader>
        <div className="divide-y divide-gray-100">
          {members.length === 0 ? (
            <CardBody>
              <p className="text-sm text-gray-500">No team members yet.</p>
            </CardBody>
          ) : (
            members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between px-4 py-3 sm:px-6"
              >
                <div className="flex items-center gap-3">
                  <Avatar name={member.display_name} size="sm" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {member.display_name}
                    </p>
                    <p className="text-xs text-gray-500">{member.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={member.role}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      handleChangeRole(
                        member.id,
                        e.target.value as OrgMemberRole
                      )
                    }
                    className="rounded border border-gray-300 px-2 py-1 text-xs"
                  >
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                  {!member.accepted_at && (
                    <Badge variant="warning">Pending</Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveMember(member.id)}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Invite modal */}
      <Modal
        open={showInvite}
        onClose={() => setShowInvite(false)}
        title="Invite Team Member"
      >
        <form onSubmit={handleInvite} className="space-y-4">
          <Input
            label="Email Address"
            name="invite_email"
            variant="email"
            value={inviteForm.email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setInviteForm((prev) => ({ ...prev, email: e.target.value }))
            }
            placeholder="team@example.com"
          />
          <Input
            label="Display Name"
            name="invite_name"
            value={inviteForm.display_name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setInviteForm((prev) => ({
                ...prev,
                display_name: e.target.value,
              }))
            }
            placeholder="Jane Smith"
          />
          <Input
            label="Role"
            name="invite_role"
            variant="select"
            value={inviteForm.role}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setInviteForm((prev) => ({
                ...prev,
                role: e.target.value as OrgMemberRole,
              }))
            }
            options={ROLES}
          />
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowInvite(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Send Invite</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
