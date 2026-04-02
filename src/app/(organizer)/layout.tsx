import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import type { Organization, OrgMember } from '@/types';
import { Avatar } from '@/components/ui/avatar';
import { OrgSidebar } from './sidebar';

export default async function OrganizerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: membership } = await supabase
    .from('org_members')
    .select('*, organization:org_id(*)')
    .eq('user_id', user.id)
    .single();

  if (!membership) {
    redirect('/onboarding');
  }

  const org = membership.organization as unknown as Organization;
  const member = membership as unknown as OrgMember;

  return (
    <div className="flex h-screen bg-gray-50">
      <OrgSidebar
        orgName={org.name}
        orgLogo={org.logo_url}
        userName={member.display_name}
        userEmail={member.email}
      />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
