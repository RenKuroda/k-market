'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useState } from 'react';
import { Edit3, MapPin, Pause, Play, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useMe } from '../../lib/useMe';

type SupplierMachine = {
  id: string;
  title: string;
  category: string;
  status: 'PUBLISHED' | 'PAUSED' | string;
  rental_price_daily: number | null;
  sale_price: number | null;
  location_prefecture: string | null;
  location_city: string | null;
  created_at: string;
};

type EditState = {
  id: string;
  title: string;
  rentalPrice: string;
  salePrice: string;
  status: 'PUBLISHED' | 'PAUSED';
} | null;

export default function SupplierDashboardPage() {
  const router = useRouter();
  const { me, isLoading: meLoading } = useMe();

  const [machines, setMachines] = useState<SupplierMachine[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const loadMachines = useCallback(
    async (companyId: string) => {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('machines')
        .select(
          'id, title, category, status, rental_price_daily, sale_price, location_prefecture, location_city, created_at',
        )
        .eq('owner_company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) {
        setError(error.message);
      } else {
        setMachines((data ?? []) as SupplierMachine[]);
      }
      setLoading(false);
    },
    [],
  );

  useEffect(() => {
    if (meLoading) return;
    if (!me || !me.company) {
      router.replace('/auth');
      return;
    }
    void loadMachines(me.company.id);
  }, [meLoading, me, router, loadMachines]);

  const openEdit = (m: SupplierMachine) => {
    setEditState({
      id: m.id,
      title: m.title,
      rentalPrice: m.rental_price_daily?.toString() ?? '',
      salePrice: m.sale_price?.toString() ?? '',
      status: (m.status as 'PUBLISHED' | 'PAUSED') ?? 'PUBLISHED',
    });
    setMessage(null);
    setError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editState) return;
    setSavingEdit(true);
    setError(null);
    setMessage(null);

    const rental = editState.rentalPrice.trim() ? Number(editState.rentalPrice) : null;
    const sale = editState.salePrice.trim() ? Number(editState.salePrice) : null;

    const { error } = await supabase
      .from('machines')
      .update({
        title: editState.title,
        rental_price_daily: rental,
        sale_price: sale,
        status: editState.status,
      })
      .eq('id', editState.id);

    if (error) {
      setError(error.message);
    } else if (me?.company?.id) {
      await loadMachines(me.company.id);
      setMessage('出品情報を更新しました。');
      setEditState(null);
    }

    setSavingEdit(false);
  };

  const handleToggleStatus = async (m: SupplierMachine) => {
    if (!me?.company?.id) return;
    const nextStatus = m.status === 'PUBLISHED' ? 'PAUSED' : 'PUBLISHED';
    const { error } = await supabase
      .from('machines')
      .update({ status: nextStatus })
      .eq('id', m.id);
    if (error) {
      setError(error.message);
    } else {
      await loadMachines(me.company.id);
      setMessage(
        nextStatus === 'PUBLISHED' ? '掲載を再開しました。' : '掲載を停止しました（PAUSED）。',
      );
    }
  };

  const handleDelete = async (m: SupplierMachine) => {
    if (!me?.company?.id) return;
    const ok = window.confirm(`本当にこの出品を削除しますか？\n\n${m.title}`);
    if (!ok) return;
    const { error } = await supabase.from('machines').delete().eq('id', m.id);
    if (error) {
      setError(error.message);
    } else {
      await loadMachines(me.company.id);
      setMessage('出品を削除しました。');
    }
  };

  const locationText = (m: SupplierMachine) =>
    [m.location_prefecture, m.location_city].filter(Boolean).join(' ');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-4 h-16 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-slate-900 text-white p-1.5 rounded-lg font-black tracking-tighter">
            K-M
          </div>
          <h1 className="text-lg font-bold tracking-tight hidden sm:block">出品管理</h1>
        </div>
        <Link href="/" className="text-sm font-bold text-slate-700 hover:text-slate-900">
          トップへ戻る
        </Link>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-xl font-black">自社の出品一覧</h2>
            <p className="text-xs text-slate-500">
              自分の会社（`owner_company_id = your company_id`）の出品だけが表示されます。
            </p>
          </div>
          <Link
            href="/"
            className="hidden md:inline-flex items-center gap-1.5 text-sm font-bold bg-slate-900 text-white px-4 py-2 rounded-full hover:bg-slate-800"
          >
            戻る
          </Link>
        </div>

        {me && (
          <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600">
            <div className="flex flex-wrap gap-4">
              <div>
                <span className="font-bold text-slate-500 mr-1">ユーザーID</span>
                <span className="font-mono break-all text-[11px]">{me.authUserId}</span>
              </div>
              <div>
                <span className="font-bold text-slate-500 mr-1">role</span>
                <span className="font-bold">{me.profile?.role ?? '未設定'}</span>
              </div>
              <div>
                <span className="font-bold text-slate-500 mr-1">company</span>
                <span className="font-bold">{me.company?.name ?? '未設定'}</span>
              </div>
            </div>
          </div>
        )}

        {loading && <p className="text-sm text-slate-500">読み込み中...</p>}
        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl p-3">
            {error}
          </div>
        )}
        {message && (
          <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl p-3">
            {message}
          </div>
        )}

        {!loading && machines.length === 0 && (
          <p className="text-sm text-slate-500">まだ出品がありません。「出品する」から登録してください。</p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {machines.map((m) => (
            <div
              key={m.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-slate-400 mb-1">
                    {new Date(m.created_at).toLocaleString('ja-JP')}
                  </p>
                  <h3 className="font-bold text-slate-900">{m.title}</h3>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                    <MapPin size={12} />
                    {locationText(m) || '所在地未設定'}
                  </p>
                </div>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                    m.status === 'PUBLISHED'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  {m.status === 'PUBLISHED' ? '掲載中' : '停止中'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold mb-0.5">レンタル日額</p>
                  <p className="font-bold">
                    {m.rental_price_daily != null ? `¥${m.rental_price_daily.toLocaleString()}` : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold mb-0.5">売買参考価格</p>
                  <p className="font-bold">
                    {m.sale_price != null ? `¥${m.sale_price.toLocaleString()}` : '-'}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => openEdit(m)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold hover:bg-slate-50"
                >
                  <Edit3 size={14} />
                  編集
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleStatus(m)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold hover:bg-slate-50"
                >
                  {m.status === 'PUBLISHED' ? <Pause size={14} /> : <Play size={14} />}
                  {m.status === 'PUBLISHED' ? '掲載を停止' : '掲載を再開'}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(m)}
                  className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {editState && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setEditState(null)}
            />
            <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
              <h3 className="mb-4 text-lg font-bold text-slate-900">出品内容の編集</h3>
              <form className="space-y-4" onSubmit={handleSaveEdit}>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-500">タイトル</label>
                  <input
                    type="text"
                    className="w-full rounded-lg border border-slate-200 p-3 text-sm"
                    value={editState.title}
                    onChange={(e) =>
                      setEditState((prev) =>
                        prev ? { ...prev, title: e.target.value } : prev,
                      )
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-500">
                      レンタル日額（税込・任意）
                    </label>
                    <input
                      type="number"
                      min={0}
                      className="w-full rounded-lg border border-slate-200 p-3 text-sm"
                      value={editState.rentalPrice}
                      onChange={(e) =>
                        setEditState((prev) =>
                          prev ? { ...prev, rentalPrice: e.target.value } : prev,
                        )
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-500">
                      売買参考価格（税込・任意）
                    </label>
                    <input
                      type="number"
                      min={0}
                      className="w-full rounded-lg border border-slate-200 p-3 text-sm"
                      value={editState.salePrice}
                      onChange={(e) =>
                        setEditState((prev) =>
                          prev ? { ...prev, salePrice: e.target.value } : prev,
                        )
                      }
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-500">掲載ステータス</label>
                  <select
                    className="w-full rounded-lg border border-slate-200 p-3 text-sm"
                    value={editState.status}
                    onChange={(e) =>
                      setEditState((prev) =>
                        prev ? { ...prev, status: e.target.value as 'PUBLISHED' | 'PAUSED' } : prev,
                      )
                    }
                  >
                    <option value="PUBLISHED">掲載中</option>
                    <option value="PAUSED">停止中</option>
                  </select>
                </div>

                {error && (
                  <div className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-xl p-3">
                    {error}
                  </div>
                )}

                <div className="mt-4 flex gap-3">
                  <button
                    type="button"
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
                    onClick={() => setEditState(null)}
                    disabled={savingEdit}
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    disabled={savingEdit}
                    className="flex-1 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-60"
                  >
                    {savingEdit ? '保存中…' : '保存する'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}


