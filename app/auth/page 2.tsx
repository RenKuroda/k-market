'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { supabase } from '../../lib/supabaseClient';
import { useMe } from '../../lib/useMe';

type Mode = 'login' | 'signup';

export default function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = useMemo(() => searchParams.get('redirect') ?? '/', [searchParams]);

  const { me, loading: meLoading, error: meError } = useMe();
  const isLoggedIn = !!me?.authUser;

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    if (mode === 'login') {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setSubmitting(false);
        return;
      }

      setMessage('ログインしました。');
      setSubmitting(false);
      router.push(redirectTo);
      return;
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      setError(signUpError.message);
      setSubmitting(false);
      return;
    }

    // Email確認ONの場合、data.sessionはnullになり得る
    if (data.session) {
      setMessage('登録しました。');
      setSubmitting(false);
      router.push(redirectTo);
      return;
    }

    setMessage(
      '登録を受け付けました。Supabaseの設定でEmail確認がONの場合、メールの確認後にログインしてください。',
    );
    setSubmitting(false);
  };

  const handleLogout = async () => {
    setSubmitting(true);
    setError(null);
    setMessage(null);

    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      setError(signOutError.message);
      setSubmitting(false);
      return;
    }

    setMessage('ログアウトしました。');
    setSubmitting(false);
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="bg-slate-900 text-white px-2 py-1 rounded-lg font-black tracking-tighter">
              K-M
            </span>
            <span className="font-bold text-slate-900">K-Market</span>
          </Link>
          <Link href="/" className="text-xs font-bold text-slate-500 hover:text-slate-900">
            戻る
          </Link>
        </div>

        <h1 className="text-2xl font-black text-slate-900 mb-1">
          {mode === 'login' ? 'ログイン' : '新規登録'}
        </h1>
        <p className="text-xs text-slate-500 mb-6">Email / Password（OAuthなし）</p>

        {(meLoading || isLoggedIn) && (
          <div className="mb-6 bg-slate-50 border border-slate-200 rounded-xl p-4">
            <p className="text-xs font-bold text-slate-600 mb-3">現在のログイン状態</p>

            {meLoading ? (
              <p className="text-sm text-slate-600">確認中…</p>
            ) : isLoggedIn ? (
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">
                    User ID
                  </p>
                  <p className="text-xs font-mono text-slate-800 break-all">{me?.authUser.id}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">
                      Role
                    </p>
                    <p className="text-sm font-bold text-slate-900">{me?.profile?.role ?? '未設定'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">
                      Company
                    </p>
                    <p className="text-sm font-bold text-slate-900">{me?.company?.name ?? '未設定'}</p>
                  </div>
                </div>

                {!!meError && (
                  <div className="bg-yellow-50 border border-yellow-200 text-yellow-900 text-sm rounded-xl p-3">
                    {meError}
                  </div>
                )}

                <button
                  className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-60"
                  disabled={submitting}
                  onClick={handleLogout}
                >
                  ログアウト
                </button>
              </div>
            ) : (
              <p className="text-sm text-slate-600">未ログイン</p>
            )}
          </div>
        )}

        {!isLoggedIn && (
          <>
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-colors ${
                  mode === 'login'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
                onClick={() => setMode('login')}
              >
                ログイン
              </button>
              <button
                type="button"
                className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-colors ${
                  mode === 'signup'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
                onClick={() => setMode('signup')}
              >
                新規登録
              </button>
            </div>

            <form className="space-y-3" onSubmit={handleSubmit}>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="********"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  ※ Supabase Authの設定により、登録後にメール確認が必要な場合があります。
                </p>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-60"
              >
                {submitting ? '処理中…' : mode === 'login' ? 'ログイン' : '登録する'}
              </button>
            </form>
          </>
        )}

        {(message || error) && (
          <div className="mt-4 space-y-2">
            {!!message && (
              <div className="bg-green-50 border border-green-200 text-green-900 text-sm rounded-xl p-3">
                {message}
              </div>
            )}
            {!!error && (
              <div className="bg-red-50 border border-red-200 text-red-800 text-sm rounded-xl p-3">
                {error}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

'use client';

import React, { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import { useMe } from '../../lib/useMe';

type Mode = 'login' | 'signup';

export default function AuthPage() {
  const { me, loading: meLoading, error: meError } = useMe();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const isLoggedIn = !!me?.authUser;

  const canSubmit = useMemo(() => {
    return email.trim().length > 0 && password.length >= 8 && !busy;
  }, [email, password, busy]);

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setBusy(true);
      setMessage(null);
      setActionError(null);

      try {
        if (mode === 'login') {
          const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (error) throw error;
          setMessage('ログインしました。');
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;

        if (!data.session) {
          setMessage(
            '登録を受け付けました。メール確認が必要な設定の場合は、届いたメールを確認してからログインしてください。',
          );
        } else {
          setMessage('登録してログインしました。');
        }
      } catch (err: any) {
        setActionError(err?.message ?? '認証に失敗しました。');
      } finally {
        setBusy(false);
      }
    },
    [mode, email, password],
  );

  const onLogout = useCallback(async () => {
    setBusy(true);
    setMessage(null);
    setActionError(null);
    const { error } = await supabase.auth.signOut();
    if (error) setActionError(error.message);
    setBusy(false);
  }, []);

  return (
    <div className="min-h-screen px-4 py-10">
      <div className="mx-auto w-full max-w-xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">認証</h1>
            <p className="text-sm text-slate-500">Email / Password（Supabase Auth）</p>
          </div>
          <Link href="/" className="text-sm font-bold text-blue-600 hover:underline">
            ← ホーム
          </Link>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-black text-slate-900">ログイン状態</h2>

          {meLoading ? (
            <p className="text-sm text-slate-500">読み込み中...</p>
          ) : isLoggedIn ? (
            <div className="space-y-2 text-sm">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-slate-500">ユーザーID（auth.uid）</span>
                <code className="break-all rounded bg-slate-50 px-2 py-1 text-xs">{me?.authUser.id}</code>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-slate-500">role（public.users.role）</span>
                <span className="font-bold text-slate-900">
                  {me?.profile?.role ?? '（未設定）'}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-slate-500">company.name</span>
                <span className="font-bold text-slate-900">
                  {me?.company?.name ?? '（未設定）'}
                </span>
              </div>

              <div className="pt-3">
                <button
                  onClick={onLogout}
                  disabled={busy}
                  className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  ログアウト
                </button>
              </div>

              {meError && (
                <p className="text-xs text-amber-700">
                  注意: public.users / companies の取得でエラーが出ています（未作成/未設定 or RLS）。<br />
                  {meError}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-500">未ログインです。</p>
          )}
        </div>

        {!isLoggedIn && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex gap-2">
              <button
                type="button"
                onClick={() => setMode('login')}
                className={`flex-1 rounded-xl px-4 py-2 text-sm font-black ${
                  mode === 'login'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                ログイン
              </button>
              <button
                type="button"
                onClick={() => setMode('signup')}
                className={`flex-1 rounded-xl px-4 py-2 text-sm font-black ${
                  mode === 'signup'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                新規登録
              </button>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-500">Email</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  autoComplete="email"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-200"
                  placeholder="you@example.com"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-500">Password</label>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-200"
                  placeholder="8文字以上"
                  minLength={8}
                  required
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  ※ Supabase Auth の設定により、メール確認が必要な場合があります。
                </p>
              </div>

              {message && <p className="text-sm font-bold text-emerald-700">{message}</p>}
              {actionError && <p className="text-sm font-bold text-red-600">{actionError}</p>}

              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {mode === 'login' ? 'ログイン' : '新規登録'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import { useMe } from '../../lib/useMe';

type Mode = 'login' | 'signup';

export default function AuthPage() {
  const router = useRouter();
  const { me, loading: meLoading, error: meError } = useMe();

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submitLabel = useMemo(() => (mode === 'login' ? 'ログイン' : '新規登録'), [mode]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    setError(null);

    if (!email || !password) {
      setError('メールアドレスとパスワードを入力してください。');
      setBusy(false);
      return;
    }

    try {
      if (mode === 'login') {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        router.push('/');
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) throw signUpError;

      if (!data.session) {
        setMessage('確認メールを送信しました。メール内のリンクから認証してください。');
        setBusy(false);
        return;
      }

      router.push('/');
    } catch (err: any) {
      setError(err?.message ?? 'エラーが発生しました。');
    } finally {
      setBusy(false);
    }
  }

  async function onLogout() {
    setBusy(true);
    setMessage(null);
    setError(null);
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) setError(signOutError.message);
    setBusy(false);
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
        <div className="mb-6">
          <h1 className="text-xl font-black text-slate-900">K-Market 認証</h1>
          <p className="text-xs text-slate-500 mt-1">Email / Password のみ（OAuthなし）</p>
        </div>

        {/* Logged-in status */}
        <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-bold text-slate-700 mb-2">ログイン状態</p>
          {meLoading ? (
            <p className="text-xs text-slate-600">確認中…</p>
          ) : me ? (
            <div className="space-y-1 text-[11px] text-slate-700">
              <div>
                <span className="font-bold">user.id</span>: <span className="font-mono">{me.userId}</span>
              </div>
              <div>
                <span className="font-bold">role</span>: {me.profile?.role ?? '（未設定）'}
              </div>
              <div>
                <span className="font-bold">company</span>: {me.company?.name ?? '（未設定）'}
              </div>
              {me.profileMissing && (
                <div className="pt-2 text-[11px] text-amber-700">
                  public.users / companies が未作成、またはRLSで取得できません。Supabase側のSQL適用とデータ作成を確認してください。
                </div>
              )}
              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => router.push('/')}
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold hover:bg-slate-50"
                >
                  トップへ
                </button>
                <button
                  type="button"
                  onClick={onLogout}
                  disabled={busy}
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold disabled:opacity-60"
                >
                  ログアウト
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-600">未ログイン</p>
          )}
          {!!meError && <p className="mt-2 text-[11px] text-amber-700">me取得: {meError}</p>}
        </div>

        {/* Mode tabs */}
        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold border ${
              mode === 'login' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200'
            }`}
          >
            ログイン
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold border ${
              mode === 'signup' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200'
            }`}
          >
            新規登録
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">メールアドレス</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">パスワード</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
              placeholder="********"
            />
          </div>

          {!!message && <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl p-3">{message}</div>}
          {!!error && <div className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-xl p-3">{error}</div>}

          <button
            type="submit"
            disabled={busy}
            className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl disabled:opacity-60"
          >
            {busy ? '処理中…' : submitLabel}
          </button>
        </form>

        <p className="text-[11px] text-slate-500 mt-4">
          うまくいかない場合は、Supabase側の Auth設定（Email確認の有無）と RLS/データ作成状況を確認してください。
        </p>
      </div>
    </main>
  );
}

'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import { useMe } from '../../lib/useMe';

type AuthMode = 'login' | 'signup';
type CompanyType = 'DEMAND' | 'SUPPLY' | 'BOTH';

export default function AuthPage() {
  const router = useRouter();
  const me = useMe();

  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Sign up fields (MVP: B2Bなので会社情報も最小で取得)
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyType, setCompanyType] = useState<CompanyType>('DEMAND');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    if (!email || !password) return false;
    if (mode === 'login') return true;
    return !!name && !!companyName;
  }, [companyName, email, mode, name, password]);

  useEffect(() => {
    if (me.authUser) router.replace('/');
  }, [me.authUser, router]);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    router.replace('/');
  };

  const handleSignUp = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    // Email確認がONの場合、sessionがnullになることがある（その場合はログイン後にプロファイル作成が必要）
    if (!data.session || !data.user) {
      setMessage(
        'サインアップを受け付けました。確認メールが届く設定の場合は、メール確認後にログインしてください。',
      );
      setLoading(false);
      return;
    }

    // 会社レコード作成（RLSのINSERT許可が必要）
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert({
        name: companyName,
        company_type: companyType,
      })
      .select('id,name,company_type,status')
      .single();

    if (companyError || !company) {
      setError(
        companyError?.message ??
          '会社情報の作成に失敗しました。RLSのINSERTポリシーとテーブル作成を確認してください。',
      );
      setLoading(false);
      return;
    }

    // public.users プロファイル作成（RLSのINSERT許可が必要）
    const { error: profileError } = await supabase.from('users').insert({
      id: data.user.id,
      name,
      role: 'COMPANY_ADMIN',
      company_id: company.id,
    });

    if (profileError) {
      setError(
        profileError.message ??
          'ユーザープロファイルの作成に失敗しました。RLSのINSERTポリシーと制約を確認してください。',
      );
      setLoading(false);
      return;
    }

    router.replace('/');
  };

  const onSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    if (mode === 'login') return handleLogin();
    return handleSignUp();
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-slate-900 text-white px-2 py-1 rounded-lg font-black tracking-tighter">
              K-M
            </div>
            <h1 className="text-lg font-bold tracking-tight">K-Market</h1>
          </div>
          <p className="text-sm text-slate-500">
            メールアドレスとパスワードでログイン / 新規登録できます。
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            type="button"
            className={`py-2 rounded-lg text-sm font-bold border ${
              mode === 'login'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-200'
            }`}
            onClick={() => setMode('login')}
          >
            ログイン
          </button>
          <button
            type="button"
            className={`py-2 rounded-lg text-sm font-bold border ${
              mode === 'signup'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-200'
            }`}
            onClick={() => setMode('signup')}
          >
            新規登録
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-800 text-sm rounded-xl p-3">
            {error}
          </div>
        )}
        {message && (
          <div className="mb-4 bg-blue-50 border border-blue-200 text-blue-800 text-sm rounded-xl p-3">
            {message}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          {mode === 'signup' && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  お名前（担当者）
                </label>
                <input
                  className="w-full border border-slate-200 rounded-lg p-3 text-sm"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例：黒田 レン"
                  autoComplete="name"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  会社名
                </label>
                <input
                  className="w-full border border-slate-200 rounded-lg p-3 text-sm"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="例：株式会社 山田解体"
                  autoComplete="organization"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  会社タイプ
                </label>
                <select
                  className="w-full border border-slate-200 rounded-lg p-3 text-sm"
                  value={companyType}
                  onChange={(e) => setCompanyType(e.target.value as CompanyType)}
                >
                  <option value="DEMAND">需要側（借りたい/買いたい）</option>
                  <option value="SUPPLY">供給側（貸したい/売りたい）</option>
                  <option value="BOTH">両方</option>
                </select>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">
              メールアドレス
            </label>
            <input
              className="w-full border border-slate-200 rounded-lg p-3 text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              type="email"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">
              パスワード
            </label>
            <input
              className="w-full border border-slate-200 rounded-lg p-3 text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>

          <button
            type="submit"
            disabled={!canSubmit || loading}
            className="w-full bg-slate-900 disabled:bg-slate-400 text-white font-bold py-3 rounded-xl"
          >
            {loading ? '処理中...' : mode === 'login' ? 'ログイン' : '新規登録'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            className="text-sm font-bold text-slate-600 hover:text-slate-900 underline"
            onClick={() => router.push('/')}
          >
            トップに戻る
          </button>
        </div>
      </div>
    </div>
  );
}


