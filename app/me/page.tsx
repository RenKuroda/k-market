'use client';

import Link from 'next/link';
import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Heart, History, LogOut, Truck } from 'lucide-react';
import { useMe } from '../../lib/useMe';
import { MOCK_USER } from '../../constants';
import { User } from '../../types';
import { supabase } from '../../lib/supabaseClient';

export default function MePage() {
  const router = useRouter();
  const { isLoading, me, error: meError, signOut, refresh } = useMe();
  const isLoggedIn = !!me?.authUserId;

  const currentUser: User = { ...MOCK_USER, isLoggedIn };
  const fallbackAvatar = 'https://api.dicebear.com/7.x/big-smile/svg?seed=k-market-user';
  const DEFAULT_THUMBNAIL =
    'https://images.pexels.com/photos/6003651/pexels-photo-6003651.jpeg?auto=compress&cs=tinysrgb&w=400';

  type FavoriteRow = {
    machine_id: string;
    created_at: string;
    machine: {
      id: string;
      title: string;
      category: string;
      rental_price_daily: number | null;
      sale_price: number | null;
      location_prefecture: string | null;
      location_city: string | null;
      machine_class: string | null;
      year_of_manufacture: number | null;
      operating_hours: number | null;
      condition: number | null;
      main_image_url: string | null;
    } | null;
  };

  const [userName, setUserName] = useState('');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [favorites, setFavorites] = useState<FavoriteRow[]>([]);
  const [favError, setFavError] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string>(fallbackAvatar);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      router.replace('/auth');
    }
  }, [isLoading, isLoggedIn, router]);

  useEffect(() => {
    const fromMe = (me?.avatarUrl as string | null | undefined) ?? null;
    const fromMock = currentUser.avatar ?? null;
    setAvatarUrl(fromMe || fromMock || fallbackAvatar);
  }, [me?.avatarUrl, currentUser.avatar]);

  useEffect(() => {
    const loadFavorites = async () => {
      if (!me?.authUserId) {
        setFavorites([]);
        return;
      }
      const { data, error } = await supabase
        .from('favorites')
        .select(
          `
          machine_id,
          created_at,
          machine:machines (
            id,
            title,
            category,
            rental_price_daily,
            sale_price,
            location_prefecture,
            location_city,
            machine_class,
            year_of_manufacture,
            operating_hours,
            condition,
            main_image_url
          )
        `,
        )
        .order('created_at', { ascending: false });

      if (error) {
        setFavError(error.message);
        return;
      }
      setFavError(null);
      setFavorites(((data ?? []) as unknown) as FavoriteRow[]);
    };

    if (isLoggedIn) {
      void loadFavorites();
    }
  }, [isLoggedIn, me?.authUserId]);

  useEffect(() => {
    if (me) {
      setUserName(me.profile?.name ?? '');
      setEmail(me.email ?? '');
      setDisplayName(me.displayName ?? me.profile?.name ?? '');
    }
  }, [me]);

  const handleAvatarButtonClick = () => {
    setAvatarError(null);
    fileInputRef.current?.click();
  };

  const handleSaveProfile = async () => {
    if (!me?.authUserId) {
      setSaveError('ログイン情報が取得できませんでした。');
      return;
    }

    setSavingProfile(true);
    setSaveError(null);
    setSaveMessage(null);

    try {
      const trimmedUserName = userName.trim();
      const trimmedEmail = email.trim();
      const trimmedDisplayName = displayName.trim();

      if (!trimmedUserName) {
        throw new Error('USER（担当者名）を入力してください。');
      }

      // users テーブルの name を更新
      const { error: profileError } = await supabase
        .from('users')
        .update({ name: trimmedUserName })
        .eq('id', me.authUserId);
      if (profileError) {
        throw profileError;
      }

      // auth.users の email / user_metadata.display_name を更新
      const authUpdate: {
        email?: string;
        data?: Record<string, any>;
      } = {};

      if (trimmedEmail && trimmedEmail !== (me.email ?? '')) {
        authUpdate.email = trimmedEmail;
      }

      authUpdate.data = {
        display_name: trimmedDisplayName || null,
      };

      const { error: authError } = await supabase.auth.updateUser(authUpdate);
      if (authError) {
        throw authError;
      }

      await refresh();
      setSaveMessage('プロフィールを保存しました。');
    } catch (err: any) {
      const msg: string | undefined = err?.message ?? err?.error_description;
      setSaveError(msg ?? 'プロフィールの保存に失敗しました。');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAvatarDelete = async () => {
    if (!me?.authUserId) {
      setAvatarError('ログイン情報が取得できませんでした。');
      return;
    }

    setAvatarUploading(true);
    setAvatarError(null);

    try {
      const currentUrl: string | null =
        ((me?.avatarUrl as string | null | undefined) ?? null) || avatarUrl || null;

      let storagePath: string | null = null;
      if (currentUrl && currentUrl.includes('/storage/v1/object')) {
        const match = currentUrl.match(/\/storage\/v1\/object\/(?:public\/)?avatars\/(.+)$/);
        if (match && match[1]) {
          storagePath = match[1];
        }
      }

      if (storagePath) {
        const { error: removeError } = await supabase.storage.from('avatars').remove([storagePath]);
        if (removeError) {
          // 削除失敗は致命的ではないので、メッセージだけ表示して処理は続ける
          const msg: string | undefined = removeError.message ?? (removeError as any)?.error_description;
          setAvatarError(
            msg ??
              '画像ファイルの削除に失敗しましたが、プロフィール画像の設定は解除されました。',
          );
        }
      }

      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: null },
      });
      if (updateError) {
        throw updateError;
      }

      setAvatarUrl((currentUser.avatar as string | undefined) ?? fallbackAvatar);
    } catch (err: any) {
      const msg: string | undefined = err?.message ?? err?.error_description;
      setAvatarError(msg ?? '画像の削除に失敗しました。');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleAvatarFileChange: React.ChangeEventHandler<HTMLInputElement> = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setAvatarError('画像ファイルを選択してください。');
      return;
    }
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setAvatarError('5MB以下の画像を選択してください。');
      return;
    }

    if (!me?.authUserId) {
      setAvatarError('ログイン情報が取得できませんでした。');
      return;
    }

    setAvatarUploading(true);
    setAvatarError(null);

    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const filePath = `${me.authUserId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, {
        upsert: true,
      });
      if (uploadError) {
        throw uploadError;
      }

      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const publicUrl = publicUrlData.publicUrl;

      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl },
      });
      if (updateError) {
        throw updateError;
      }

      setAvatarUrl(publicUrl);
    } catch (err: any) {
      const msg: string | undefined = err?.message ?? err?.error_description;
      if (msg && /bucket not found/i.test(msg)) {
        setAvatarError(
          'アイコン保存用の Storage バケット「avatars」が見つかりません。Supabase の Storage で「avatars」という名前の公開バケットを作成してください。',
        );
      } else if (msg && /row-level security/i.test(msg)) {
        setAvatarError(
          'Storage の RLS 設定でアップロードがブロックされています。Supabase の「storage.objects」テーブルに、バケット avatars への INSERT を許可するポリシーを追加してください。',
        );
      } else {
        setAvatarError(msg ?? '画像のアップロードに失敗しました。');
      }
    } finally {
      setAvatarUploading(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handleLogout = async () => {
    await signOut();
    router.push('/');
  };

  const handleBackHome = () => {
    router.push('/');
  };

  // 未ログイン時は即座に /auth へリダイレクトされるのでここでは何も描画しない
  if (!isLoading && !isLoggedIn) {
    return null;
  }

  return (
    <div className="min-h-screen pb-24 lg:pb-0 bg-slate-50">
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 px-4 h-16 flex items-center justify-between shadow-sm">
        <button
          type="button"
          onClick={handleBackHome}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <div className="bg-slate-900 text-white p-1.5 rounded-lg font-black tracking-tighter">K-M</div>
          <span className="text-lg font-bold tracking-tight hidden sm:block">K-Market</span>
        </button>
        {isLoggedIn && (
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                LOGGED IN AS
              </p>
              <p className="text-xs font-bold text-slate-900">
                {me?.profile?.name ?? me?.email ?? '未設定'}
              </p>
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden">
              <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
            </div>
          </div>
        )}
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="mb-1">
          <button
            type="button"
            onClick={handleBackHome}
            className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft size={14} />
            <span>トップに戻る</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Account</p>
            <h1 className="text-2xl font-bold">マイページ</h1>
            <p className="mt-1 text-sm text-slate-500">
              アカウント情報やプロフィール、出品情報を管理します。
            </p>
          </div>
        </div>

        {/* プロフィール設定 */}
        <section>
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <p className="text-xs font-bold text-slate-500 mb-4">プロフィール設定</p>
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex flex-col items-center md:items-start gap-3">
                <div className="w-20 h-20 rounded-full bg-slate-200 overflow-hidden">
                  <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                </div>
                <button
                  type="button"
                  onClick={handleAvatarButtonClick}
                  className="px-3 py-1.5 rounded-full border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  disabled={avatarUploading}
                >
                  {avatarUploading ? 'アップロード中…' : '画像を変更'}
                </button>
                <button
                  type="button"
                  onClick={handleAvatarDelete}
                  className="text-[11px] text-slate-400 hover:text-red-600 disabled:opacity-60"
                  disabled={avatarUploading}
                >
                  画像を削除
                </button>
                {avatarError && (
                  <p className="text-[11px] text-red-600 max-w-xs text-center md:text-left">
                    {avatarError}
                  </p>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarFileChange}
                />
              </div>

              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold mb-1">会社名</p>
                  <p className="font-bold text-slate-900">{me?.company?.name ?? '未設定'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold mb-1">USER（修正可能）</p>
                  <input
                    type="text"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                  />
                  <p className="mt-1 text-[11px] text-slate-500">※閲覧者には表示されません。</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold mb-1">アドレス（修正可能）</p>
                  <input
                    type="email"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold mb-1">表示名（修正可能）</p>
                  <input
                    type="text"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {saveError && (
              <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-[11px] text-red-700">
                {saveError}
              </div>
            )}
            {saveMessage && (
              <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-700">
                {saveMessage}
              </div>
            )}

            <div className="mt-6 flex items-center justify-between">
              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {savingProfile ? '保存中…' : '保存する'}
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-100"
              >
                <LogOut size={14} />
                <span>ログアウト</span>
              </button>
            </div>
          </div>
        </section>

        {/* 出品している重機 → /supplier へのリンク */}
        <section>
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-white">
                <Truck size={18} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500">出品している重機</p>
                <p className="text-sm text-slate-600">
                  自社が出品している重機・ダンプ・アタッチメントを一覧・編集できます。
                </p>
              </div>
            </div>
            <Link
              href="/supplier"
              className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
            >
              出品管理画面を開く
            </Link>
          </div>
        </section>

        {/* 閲覧履歴（MVPではプレースホルダ） */}
        <section>
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <History size={16} className="text-slate-500" />
              <p className="text-xs font-bold text-slate-700">閲覧履歴</p>
            </div>
            <p className="text-sm text-slate-500">
              直近で閲覧した重機・ダンプをここに表示する予定です。（MVPでは未実装）
            </p>
          </div>
        </section>

        {/* いいね！一覧 */}
        <section>
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <Heart size={16} className="text-slate-500" />
              <p className="text-xs font-bold text-slate-700">いいね！一覧</p>
            </div>
            {favError && (
              <p className="text-xs text-red-700 mb-2">
                いいね！一覧の取得でエラーが発生しました: {favError}
              </p>
            )}
            {favorites.length === 0 ? (
              <p className="text-sm text-slate-500">まだ「いいね！」した出品がありません。</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {favorites.map((fav) => {
                  const m = fav.machine;
                  if (!m) return null;
                  const location = [m.location_prefecture, m.location_city]
                    .filter(Boolean)
                    .join(' ');
                  const size = m.machine_class || '-';
                  const year = m.year_of_manufacture
                    ? `${m.year_of_manufacture}年`
                    : '未設定';
                  const hours = m.operating_hours ? `${m.operating_hours}h` : '未設定';
                  const condition =
                    m.condition != null ? `${m.condition}/5` : '未設定';

                  const thumbnail = m.main_image_url || DEFAULT_THUMBNAIL;

                  return (
                    <li
                      key={`${fav.machine_id}-${fav.created_at}`}
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-lg bg-slate-200 overflow-hidden flex-shrink-0">
                          <img
                            src={thumbnail}
                            alt={m.title}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900">{m.title}</span>
                          <span className="text-[11px] text-slate-500">
                            {location || '所在地未設定'}
                          </span>
                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-600">
                            <span>サイズ: {size}</span>
                            <span>年式: {year}</span>
                            <span>稼働時間: {hours}</span>
                            <span>状態: {condition}</span>
                          </div>
                        </div>
                      </div>
                      <span className="ml-2 text-[11px] text-slate-400 flex-shrink-0">
                        {new Date(fav.created_at).toLocaleDateString('ja-JP')}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        {/* ログイン情報（ページ最下部） */}
        {isLoading ? (
          <section className="mb-16">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <p className="text-xs font-bold text-slate-500 mb-2">ログイン情報</p>
              <p className="text-sm text-slate-500">読み込み中です...</p>
            </div>
          </section>
        ) : (
          <section className="mb-16">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <p className="text-xs font-bold text-slate-500 mb-4">ログイン情報</p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">
                    USER ID
                  </p>
                  <p className="text-xs font-mono text-slate-800 break-all">{me?.authUserId}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">
                    ROLE
                  </p>
                  <p className="text-sm font-bold text-slate-900">
                    {me?.profile?.role ?? '未設定'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">
                    COMPANY
                  </p>
                  <p className="text-sm font-bold text-slate-900">
                    {me?.company?.name ?? '未設定'}
                  </p>
                </div>
              </div>

              {!!meError && (
                <div className="mt-4 bg-red-50 border border-red-200 text-red-800 text-sm rounded-xl p-3">
                  {meError}
                </div>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

