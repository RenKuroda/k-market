'use client';

import type { User as SupabaseAuthUser } from '@supabase/supabase-js';
import { useCallback, useEffect, useState } from 'react';

import { supabase } from './supabaseClient';

export type UserRole = 'COMPANY_ADMIN' | 'COMPANY_MEMBER' | 'PLATFORM_ADMIN';
export type CompanyType = 'DEMAND' | 'SUPPLY' | 'BOTH';
export type CompanyStatus = 'ACTIVE' | 'INACTIVE';

export type UserProfileRow = {
  id: string;
  name: string;
  role: UserRole;
  company_id: string | null;
};

export type CompanyRow = {
  id: string;
  name: string;
  company_type: CompanyType;
  status: CompanyStatus;
};

export type Me = {
  authUser: SupabaseAuthUser;
  profile: UserProfileRow | null;
  company: CompanyRow | null;
};

type UseMeResult = {
  me: Me | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export function useMe(): UseMeResult {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) {
      setMe(null);
      setError(userError.message);
      setLoading(false);
      return;
    }

    const authUser = userData.user;
    if (!authUser) {
      setMe(null);
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from('users')
      .select('id, name, role, company_id')
      .eq('id', authUser.id)
      .maybeSingle<UserProfileRow>();

    if (!profile) {
      // Phase0 の罠: auth.users は存在するが public.users が未作成だと role/company が取れない
      setMe({ authUser, profile: null, company: null });
      setError(
        'public.users のプロフィールが見つかりません。Supabaseで companies/public.users/RLS を作成し、対象ユーザーの public.users レコード（role/company_id）を作成してください。',
      );
      setLoading(false);
      return;
    }

    let company: CompanyRow | null = null;
    if (profile.company_id) {
      const { data: companyRow } = await supabase
        .from('companies')
        .select('id, name, company_type, status')
        .eq('id', profile.company_id)
        .maybeSingle<CompanyRow>();

      company = companyRow ?? null;
      if (!company) {
        setError(
          'companies が取得できません（存在しない / INACTIVE で RLS により見えない可能性があります）。対象ユーザーの company_id と companies.status を確認してください。',
        );
      }
    } else if (profile.role !== 'PLATFORM_ADMIN') {
      setError(
        'public.users.company_id が未設定です。会社ユーザーは company_id が必須です（PLATFORM_ADMIN は NULL でOK）。',
      );
    }

    setMe({ authUser, profile, company });
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();

    const { data } = supabase.auth.onAuthStateChange(() => {
      refresh();
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, [refresh]);

  return { me, loading, error, refresh };
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { User as SupabaseAuthUser } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';

export type UserRole = 'COMPANY_ADMIN' | 'COMPANY_MEMBER' | 'PLATFORM_ADMIN';

export type CompanyType = 'DEMAND' | 'SUPPLY' | 'BOTH';
export type CompanyStatus = 'ACTIVE' | 'INACTIVE';

export type Company = {
  id: string;
  name: string;
  company_type: CompanyType;
  status: CompanyStatus;
  prefecture: string | null;
  city: string | null;
};

export type UserProfile = {
  id: string;
  name: string;
  role: UserRole;
  company_id: string | null;
  is_active: boolean;
  company?: Company | null;
};

export type Me = {
  authUser: SupabaseAuthUser;
  profile: UserProfile | null;
  company: Company | null;
};

type UseMeResult = {
  me: Me | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export function useMe(): UseMeResult {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr) {
      // 未ログイン時はエラーとして扱わない
      // supabase-js はセッションが無い場合に AuthSessionMissingError を返すことがある
      const isMissingSession =
        (userErr as any)?.name === 'AuthSessionMissingError' ||
        /Auth session missing/i.test(userErr.message);
      if (isMissingSession) {
        setMe(null);
        setLoading(false);
        setError(null);
        return;
      }
      setMe(null);
      setLoading(false);
      setError(userErr.message);
      return;
    }

    const authUser = userData.user;
    if (!authUser) {
      setMe(null);
      setLoading(false);
      return;
    }

    // public.users からプロフィール（role/company）を取得（RLS前提）
    const { data: profile, error: profileErr } = await supabase
      .from('users')
      .select(
        `
        id,
        name,
        role,
        company_id,
        is_active,
        company:companies (
          id,
          name,
          company_type,
          status,
          prefecture,
          city
        )
      `,
      )
      .eq('id', authUser.id)
      .maybeSingle();

    if (profileErr) {
      // ここで失敗しても「AuthはOKだが業務プロフィール未設定」なので、
      // 画面側で未設定として扱えるようにする
      setMe({ authUser, profile: null, company: null });
      setLoading(false);
      setError(profileErr.message);
      return;
    }

    const company = (profile?.company ?? null) as Company | null;

    setMe({
      authUser,
      profile: (profile ?? null) as unknown as UserProfile | null,
      company,
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      void load();
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, [load]);

  const result = useMemo(
    () => ({
      me,
      loading,
      error,
      refresh: load,
    }),
    [me, loading, error, load],
  );

  return result;
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

export type UserRole = 'COMPANY_ADMIN' | 'COMPANY_MEMBER' | 'PLATFORM_ADMIN';
export type CompanyType = 'DEMAND' | 'SUPPLY' | 'BOTH';

export type Company = {
  id: string;
  name: string;
  company_type: CompanyType;
  status: 'ACTIVE' | 'INACTIVE';
  prefecture: string | null;
  city: string | null;
};

export type UserProfile = {
  id: string; // auth.users.id
  name: string;
  role: UserRole;
  company_id: string | null;
  is_active: boolean;
};

export type Me = {
  userId: string;
  email: string | null;
  profile: UserProfile | null;
  company: Company | null;
  profileMissing: boolean;
};

export function useMe() {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) {
      setMe(null);
      setError(authError.message);
      setLoading(false);
      return;
    }

    const authUser = authData.user;
    if (!authUser) {
      setMe(null);
      setLoading(false);
      return;
    }

    const { data: profileData, error: profileError } = await supabase
      .from('users')
      .select('id,name,role,company_id,is_active')
      .eq('id', authUser.id)
      .maybeSingle();

    const profile = (profileData as UserProfile | null) ?? null;

    if (profileError) {
      setMe({
        userId: authUser.id,
        email: authUser.email ?? null,
        profile: null,
        company: null,
        profileMissing: true,
      });
      setError(profileError.message);
      setLoading(false);
      return;
    }

    if (!profile) {
      setMe({
        userId: authUser.id,
        email: authUser.email ?? null,
        profile: null,
        company: null,
        profileMissing: true,
      });
      setLoading(false);
      return;
    }

    let company: Company | null = null;
    if (profile.company_id) {
      const { data: companyDataRaw, error: companyError } = await supabase
        .from('companies')
        .select('id,name,company_type,status,prefecture,city')
        .eq('id', profile.company_id)
        .maybeSingle();

      if (companyError) {
        setError(companyError.message);
      } else {
        company = (companyDataRaw as Company | null) ?? null;
      }
    }

    setMe({
      userId: authUser.id,
      email: authUser.email ?? null,
      profile,
      company,
      profileMissing: false,
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      refresh();
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [refresh]);

  return { me, loading, error, refresh };
}

import { useCallback, useEffect, useState } from 'react';
import type { User as SupabaseAuthUser } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';

export type MeRole = 'COMPANY_ADMIN' | 'COMPANY_MEMBER' | 'PLATFORM_ADMIN';

export type MeProfile = {
  id: string;
  name: string;
  role: MeRole;
  company_id: string | null;
  is_active: boolean;
};

export type MeCompany = {
  id: string;
  name: string;
  company_type?: 'DEMAND' | 'SUPPLY' | 'BOTH';
  status?: 'ACTIVE' | 'INACTIVE';
  prefecture?: string | null;
  city?: string | null;
};

export type MeState = {
  isLoading: boolean;
  authUser: SupabaseAuthUser | null;
  profile: MeProfile | null;
  company: MeCompany | null;
  error: string | null;
  refresh: () => Promise<void>;
};

export function useMe(): MeState {
  const [isLoading, setIsLoading] = useState(true);
  const [authUser, setAuthUser] = useState<SupabaseAuthUser | null>(null);
  const [profile, setProfile] = useState<MeProfile | null>(null);
  const [company, setCompany] = useState<MeCompany | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) {
      setAuthUser(null);
      setProfile(null);
      setCompany(null);
      setError(authError.message);
      setIsLoading(false);
      return;
    }

    const user = authData.user ?? null;
    setAuthUser(user);

    if (!user) {
      setProfile(null);
      setCompany(null);
      setIsLoading(false);
      return;
    }

    const { data: profileRow, error: profileError } = await supabase
      .from('users')
      .select('id,name,role,company_id,is_active')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      setProfile(null);
      setCompany(null);
      setError(profileError.message);
      setIsLoading(false);
      return;
    }

    setProfile(profileRow as MeProfile | null);

    if (!profileRow?.company_id) {
      setCompany(null);
      setIsLoading(false);
      return;
    }

    const { data: companyRow, error: companyError } = await supabase
      .from('companies')
      .select('id,name,company_type,status,prefecture,city')
      .eq('id', profileRow.company_id)
      .maybeSingle();

    if (companyError) {
      setCompany(null);
      setError(companyError.message);
      setIsLoading(false);
      return;
    }

    setCompany(companyRow as MeCompany | null);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      refresh();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [refresh]);

  return { isLoading, authUser, profile, company, error, refresh };
}


