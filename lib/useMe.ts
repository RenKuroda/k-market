'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from './supabaseClient';

export type UserRole = 'COMPANY_ADMIN' | 'COMPANY_MEMBER' | 'PLATFORM_ADMIN';
export type CompanyType = 'DEMAND' | 'SUPPLY' | 'BOTH';
export type CompanyStatus = 'ACTIVE' | 'INACTIVE';

export type UserProfile = {
  id: string; // auth.users.id と同じ UUID
  name: string;
  role: UserRole;
  company_id: string | null;
  is_active: boolean;
};

export type Company = {
  id: string;
  name: string;
  company_type: CompanyType;
  status: CompanyStatus;
  prefecture: string | null;
  city: string | null;
  phone: string | null;
};

export type Me = {
  authUserId: string;
  email: string | null;
  profile: UserProfile | null;
  company: Company | null;
  avatarUrl?: string | null;
  displayName?: string | null;
};

export type UseMeResult = {
  isLoading: boolean;
  me: Me | null;
  error: string | null;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

function isMissingSessionError(err: unknown): boolean {
  const name = (err as any)?.name as string | undefined;
  const message = (err as any)?.message as string | undefined;
  return name === 'AuthSessionMissingError' || /Auth session missing/i.test(message ?? '');
}

export function useMe(): UseMeResult {
  const [isLoading, setIsLoading] = useState(true);
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) {
      // 未ログイン（セッション無し）はエラー扱いしない
      if (isMissingSessionError(authError)) {
        setMe(null);
        setError(null);
        setIsLoading(false);
        return;
      }

      setMe(null);
      setError(authError.message);
      setIsLoading(false);
      return;
    }

    const authUser = authData.user;
    if (!authUser) {
      setMe(null);
      setIsLoading(false);
      return;
    }

    // 1) public.users（業務プロフィール）
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('id, name, role, company_id, is_active')
      .eq('id', authUser.id)
      .maybeSingle<UserProfile>();

    if (profileError) {
      // RLS/未作成など（AuthはOK）
      setMe({
        authUserId: authUser.id,
        email: authUser.email ?? null,
        profile: null,
        company: null,
      });
      setError(profileError.message);
      setIsLoading(false);
      return;
    }

    // 2) companies（所属企業）
    let company: Company | null = null;
    if (profile?.company_id) {
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('id, name, company_type, status, prefecture, city, phone')
        .eq('id', profile.company_id)
        .maybeSingle<Company>();

      if (companyError) {
        setMe({
          authUserId: authUser.id,
          email: authUser.email ?? null,
          profile,
          company: null,
        });
        setError(companyError.message);
        setIsLoading(false);
        return;
      }
      company = companyData ?? null;
    }

    const meta = (authUser.user_metadata ?? {}) as any;

    setMe({
      authUserId: authUser.id,
      email: authUser.email ?? null,
      profile: profile ?? null,
      company,
      avatarUrl: meta?.avatar_url ?? null,
      displayName: meta?.display_name ?? null,
    });
    setIsLoading(false);
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setMe(null);
  }, []);

  useEffect(() => {
    void refresh();

    const { data } = supabase.auth.onAuthStateChange(() => {
      void refresh();
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, [refresh]);

  return useMemo(
    () => ({
      isLoading,
      me,
      error,
      refresh,
      signOut,
    }),
    [isLoading, me, error, refresh, signOut],
  );
}


