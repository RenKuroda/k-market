'use client';

import Link from 'next/link';
import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import { useMe } from '../../lib/useMe';
import { signUpWithCompany } from './actions';

type Mode = 'login' | 'signup' | 'reset';
type CompanyType = 'DEMAND' | 'SUPPLY' | 'BOTH';

export default function AuthPage() {
  const router = useRouter();
  const { me, isLoading, error: meError, refresh, signOut } = useMe();

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // signup fields（MVP最小）
  const [userName, setUserName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyType, setCompanyType] = useState<CompanyType | ''>('');
  const [prefecture, setPrefecture] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');

  const [message, setMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isLoggedIn = !!me?.authUserId;

  const isLoginMode = mode === 'login';
  const isSignupMode = mode === 'signup';
  const isResetMode = mode === 'reset';

  const roleLabel = useMemo(() => me?.profile?.role ?? '未設定', [me]);
  const companyLabel = useMemo(() => me?.company?.name ?? '未設定', [me]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setFormError(null);
    setSubmitting(true);

    try {
      if (isResetMode) {
        const targetEmail = email.trim().toLowerCase();
        if (!targetEmail) {
          throw new Error('パスワードを再設定するメールアドレスを入力してください。');
        }

        // Supabase Auth の「パスワードリセットメール」を送信
        // Supabase 側の Auth 設定で、`<サイトURL>/auth/reset-password` を「許可されたリダイレクトURL」に追加してください。
        const origin =
          typeof window !== 'undefined' && window.location.origin
            ? window.location.origin
            : '';
        const redirectTo = origin ? `${origin}/auth/reset-password` : undefined;

        const { error } = await supabase.auth.resetPasswordForEmail(targetEmail, {
          redirectTo,
        });

        if (error) throw error;

        setMessage('パスワード再設定用のメールを送信しました。メールボックスをご確認ください。');
        return;
      }

      if (isLoginMode) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        setMessage('ログインしました。');
        await refresh();
        router.push('/');
        return;
      }

      // signup: Server Action（Service Role）で companies / public.users を自動作成
      if (!companyType) {
        throw new Error('「どちらで登録しますか？」を選択してください。');
      }
      if (!phone.trim()) {
        throw new Error('電話番号を入力してください。');
      }

      const result = await signUpWithCompany({
        email,
        password,
        userName,
        companyName,
        companyType: companyType as CompanyType,
        prefecture,
        city,
        phone,
      });
      if (!result.ok) throw new Error(result.error);

      // 作成後、クライアント側でログイン（セッション生成）
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) throw signInError;

      setMessage('登録が完了しました（会社・プロフィール作成済み）。');
      await refresh();
      // 新規登録完了後は、まず表示名を設定するためにマイページへ遷移
      router.push('/me?onboarding=displayName');
    } catch (err: any) {
      setFormError(err?.message ?? 'エラーが発生しました');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 px-4 h-16 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-slate-900 text-white p-1.5 rounded-lg font-black tracking-tighter">K-M</div>
          <h1 className="text-lg font-bold tracking-tight hidden sm:block">K-Market</h1>
        </div>
        <Link href="/" className="text-sm font-bold text-slate-700 hover:text-slate-900">
          トップへ戻る
        </Link>
      </header>

      <main className="max-w-xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-black mb-6">ログイン / 新規登録</h2>

        {!isLoggedIn && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => setMode('login')}
                className={`px-4 py-2 rounded-full text-sm font-bold border transition-all ${
                  mode === 'login'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-600 border-slate-200'
                }`}
              >
                ログイン
              </button>
              <button
                type="button"
                onClick={() => setMode('signup')}
                className={`px-4 py-2 rounded-full text-sm font-bold border transition-all ${
                  mode === 'signup'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-600 border-slate-200'
                }`}
              >
                新規登録
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {isResetMode && (
                <p className="text-xs text-slate-500">
                  登録済みのメールアドレスを入力すると、パスワード再設定用のリンクをお送りします。
                </p>
              )}

              {isSignupMode && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      担当者名
                      <span className="ml-1 text-red-500 align-middle">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                      placeholder="例）黒田 レン"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      会社名
                      <span className="ml-1 text-red-500 align-middle">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                      placeholder="例）株式会社 山田解体"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        都道府県
                        <span className="ml-1 text-red-500 align-middle">*</span>
                      </label>
                      <select
                        required
                        value={prefecture}
                        onChange={(e) => setPrefecture(e.target.value)}
                        className="w-full border border-slate-200 rounded-lg p-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                      >
                        <option value="">選択してください</option>
                        <option value="北海道">北海道</option>
                        <option value="青森県">青森県</option>
                        <option value="岩手県">岩手県</option>
                        <option value="宮城県">宮城県</option>
                        <option value="秋田県">秋田県</option>
                        <option value="山形県">山形県</option>
                        <option value="福島県">福島県</option>
                        <option value="茨城県">茨城県</option>
                        <option value="栃木県">栃木県</option>
                        <option value="群馬県">群馬県</option>
                        <option value="埼玉県">埼玉県</option>
                        <option value="千葉県">千葉県</option>
                        <option value="東京都">東京都</option>
                        <option value="神奈川県">神奈川県</option>
                        <option value="新潟県">新潟県</option>
                        <option value="富山県">富山県</option>
                        <option value="石川県">石川県</option>
                        <option value="福井県">福井県</option>
                        <option value="山梨県">山梨県</option>
                        <option value="長野県">長野県</option>
                        <option value="岐阜県">岐阜県</option>
                        <option value="静岡県">静岡県</option>
                        <option value="愛知県">愛知県</option>
                        <option value="三重県">三重県</option>
                        <option value="滋賀県">滋賀県</option>
                        <option value="京都府">京都府</option>
                        <option value="大阪府">大阪府</option>
                        <option value="兵庫県">兵庫県</option>
                        <option value="奈良県">奈良県</option>
                        <option value="和歌山県">和歌山県</option>
                        <option value="鳥取県">鳥取県</option>
                        <option value="島根県">島根県</option>
                        <option value="岡山県">岡山県</option>
                        <option value="広島県">広島県</option>
                        <option value="山口県">山口県</option>
                        <option value="徳島県">徳島県</option>
                        <option value="香川県">香川県</option>
                        <option value="愛媛県">愛媛県</option>
                        <option value="高知県">高知県</option>
                        <option value="福岡県">福岡県</option>
                        <option value="佐賀県">佐賀県</option>
                        <option value="長崎県">長崎県</option>
                        <option value="熊本県">熊本県</option>
                        <option value="大分県">大分県</option>
                        <option value="宮崎県">宮崎県</option>
                        <option value="鹿児島県">鹿児島県</option>
                        <option value="沖縄県">沖縄県</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        市区町村
                        <span className="ml-1 text-red-500 align-middle">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                        placeholder="例）江東区"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      どちらで登録しますか？
                      <span className="ml-1 text-red-500 align-middle">*</span>
                    </label>
                    <select
                      required
                      value={companyType}
                      onChange={(e) =>
                        setCompanyType(e.target.value as CompanyType | '')
                      }
                      className="w-full border border-slate-200 rounded-lg p-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                    >
                      <option value="">選択してください</option>
                      <option value="DEMAND">借りたい/買いたい</option>
                      <option value="SUPPLY">貸したい/売りたい</option>
                      <option value="BOTH">両方</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      電話番号
                      <span className="ml-1 text-red-500 align-middle">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                      placeholder="例）03-1234-5678"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  Email
                  <span className="ml-1 text-red-500 align-middle">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  Password
                  <span className="ml-1 text-red-500 align-middle">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                  placeholder="********"
                />
              </div>

              {isLoginMode && (
                <button
                  type="button"
                  onClick={() => {
                    setMode('reset');
                    setMessage(null);
                    setFormError(null);
                  }}
                  className="w-full text-xs text-right text-slate-500 hover:text-slate-700"
                >
                  パスワードをお忘れの方はこちら
                </button>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 disabled:opacity-60"
              >
                {isLoginMode
                  ? 'ログインする'
                  : isSignupMode
                  ? '新規登録する'
                  : 'パスワードリセットメールを送信'}
              </button>

              {isResetMode && (
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setMessage(null);
                    setFormError(null);
                  }}
                  className="w-full text-xs text-center text-slate-500 hover:text-slate-700"
                >
                  ログイン画面に戻る
                </button>
              )}

              {(meError || formError) && (
                <div className="bg-red-50 border border-red-100 text-red-700 rounded-xl p-3 text-sm">
                  {formError ?? meError}
                </div>
              )}
              {message && (
                <div className="bg-blue-50 border border-blue-100 text-blue-800 rounded-xl p-3 text-sm">
                  {message}
                </div>
              )}
            </form>
          </div>
        )}
      </main>
    </div>
  );
}


