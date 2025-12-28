import 'server-only';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from './supabaseServerClient';

export type PlatformAdminContext = {
  authUserId: string;
};

export async function requirePlatformAdmin(): Promise<PlatformAdminContext> {
  const supabase = createSupabaseServerClient();

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    redirect('/auth');
  }

  const authUserId = authData.user.id;

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('role')
    .eq('id', authUserId)
    .maybeSingle<{ role: string }>();

  if (profileError || !profile) {
    redirect('/auth');
  }

  if (profile.role !== 'PLATFORM_ADMIN') {
    redirect('/');
  }

  return { authUserId };
}


