import { createServiceSupabase } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, org_name } = body;

    if (!email || !password || !org_name) {
      return NextResponse.json(
        { error: 'email, password, and org_name are required' },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 },
      );
    }

    const supabase = createServiceSupabase();

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      // Handle duplicate email
      if (authError.message.includes('already') || authError.message.includes('duplicate')) {
        return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
      }
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const userId = authData.user.id;

    // Create organization
    const orgSlug = org_name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: org_name,
        slug: `${orgSlug}-${Date.now().toString(36)}`,
        created_by: userId,
      })
      .select()
      .single();

    if (orgError) {
      // Clean up: delete the auth user if org creation fails
      await supabase.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: orgError.message }, { status: 500 });
    }

    // Create org_member record (owner role)
    const { error: memberError } = await supabase
      .from('org_members')
      .insert({
        org_id: org.id,
        user_id: userId,
        role: 'owner',
      });

    if (memberError) {
      // Clean up
      await supabase.from('organizations').delete().eq('id', org.id);
      await supabase.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: memberError.message }, { status: 500 });
    }

    return NextResponse.json({
      data: {
        user: {
          id: userId,
          email: authData.user.email,
        },
        organization: org,
      },
    }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
