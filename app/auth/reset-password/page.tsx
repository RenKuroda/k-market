'use client';

import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isTokenValid, setIsTokenValid] = useState<boolean | null>(null);

  useEffect(() => {
    // Supabaseの「パスワード再設定リンク」から遷移してきたかざっくり確認しつつ、
    // access_token が有効かどうかを getUser でチェックする。
    const type = searchParams.get('type');
    if (type && type !== 'recovery') {
      setIsTokenValid(false);
      return;
    }

    supabase.auth
      .getUser()
      .then(({ data, error }) => {
        if (error || !data?.user) {
          setIsTokenValid(false);
        } else {
          setIsTokenValid(true);
        }
      })
      .catch(() => setIsTokenValid(false));
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setMessage(null);

    if (!password || password.length < 8) {
      setFormError('8文字以上の新しいパスワードを入力してください。');
      return;
    }
    if (password !== passwordConfirm) {
      setFormError('確認用パスワードが一致しません。');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setMessage('パスワードを変更しました。ログイン画面からログインしてください。');
      setTimeout(() => {
        router.push('/auth');
      }, 1500);
    } catch (err: any) {
      setFormError(
        err?.message ??
          'パスワードの更新に失敗しました。リンクの有効期限が切れている可能性があります。',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const disabled = submitting || isTokenValid === false;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 px-4 h-16 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-slate-900 text-white p-1.5 rounded-lg font-black tracking-tighter">
            K-M
          </div>
          <h1 className="text-lg font-bold tracking-tight hidden sm:block">K-Market</h1>
        </div>
        <Link href="/" className="text-sm font-bold text-slate-700 hover:text-slate-900">
          トップへ戻る
        </Link>
      </header>

      <main className="max-w-xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-black mb-6">パスワード再設定</h2>

        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          {isTokenValid === false && (
            <div className="bg-red-50 border border-red-100 text-red-700 rounded-xl p-3 text-sm mb-4">
              パスワード再設定リンクが無効か、期限切れです。もう一度パスワードリセットメールを送信してください。
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-xs text-slate-500">
              新しいパスワードを入力してください。安全のため、他サービスと同じパスワードの使い回しは避けてください。
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">
                新しいパスワード
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                placeholder="新しいパスワード"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">
                新しいパスワード（確認）
              </label>
              <input
                type="password"
                required
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                placeholder="もう一度入力してください"
              />
            </div>

            <button
              type="submit"
              disabled={disabled}
              className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 disabled:opacity-60"
            >
              パスワードを変更する
            </button>

            {formError && (
              <div className="bg-red-50 border border-red-100 text-red-700 rounded-xl p-3 text-sm">
                {formError}
              </div>
            )}
            {message && (
              <div className="bg-blue-50 border border-blue-100 text-blue-800 rounded-xl p-3 text-sm">
                {message}
              </div>
            )}

            <div className="text-xs text-slate-500 text-center">
              ログイン画面へ戻る場合は{' '}
              <Link href="/auth" className="font-bold text-slate-900 underline">
                こちら
              </Link>
              。
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}


