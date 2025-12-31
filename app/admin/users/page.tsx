import Link from 'next/link';
import { ArrowLeft, Search, Users } from 'lucide-react';

import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { requirePlatformAdmin } from '../../../lib/requirePlatformAdmin';

export const dynamic = 'force-dynamic';

type SearchParams = Record<string, string | string[] | undefined>;

type AdminCompany = {
  id: string;
  name: string;
  company_type: 'DEMAND' | 'SUPPLY' | 'BOTH' | string;
  status: 'ACTIVE' | 'INACTIVE' | string;
  prefecture: string | null;
  city: string | null;
};

type AdminUserRow = {
  id: string;
  name: string;
  role: 'COMPANY_ADMIN' | 'COMPANY_MEMBER' | 'PLATFORM_ADMIN' | string;
  company_id: string | null;
  is_active: boolean | null;
  created_at: string | null;
};

function toText(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

function parseSearchParams(searchParams?: SearchParams) {
  const q = toText(searchParams?.q).trim();
  const role = toText(searchParams?.role).trim() || 'all';
  const active = toText(searchParams?.active).trim() || 'all';
  const companyStatus = toText(searchParams?.companyStatus).trim() || 'all';
  const companyType = toText(searchParams?.companyType).trim() || 'all';
  return { q, role, active, companyStatus, companyType };
}

function formatDateTimeJa(iso: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('ja-JP');
}

export default async function AdminUsersPage({ searchParams }: { searchParams?: SearchParams }) {
  await requirePlatformAdmin();

  const { q, role, active, companyStatus, companyType } = parseSearchParams(searchParams);

  const { data, error } = await supabaseAdmin
    .from('users')
    .select(
      `
      id,
      name,
      role,
      company_id,
      is_active,
      created_at
    `,
    )
    .order('created_at', { ascending: false })
    .limit(500);

  const rows: AdminUserRow[] = ((data ?? []) as unknown) as AdminUserRow[];

  const companyIds = Array.from(
    new Set(rows.map((r) => r.company_id).filter((v): v is string => !!v)),
  );

  const companiesById = new Map<string, AdminCompany>();
  let companiesErrorMessage: string | null = null;
  const listingCountByCompanyId = new Map<string, number>();
  let machinesErrorMessage: string | null = null;
  if (companyIds.length > 0) {
    const { data: companiesData, error: companiesError } = await supabaseAdmin
      .from('companies')
      .select('id, name, company_type, status, prefecture, city')
      .in('id', companyIds)
      .limit(1000);

    if (companiesError) {
      companiesErrorMessage = companiesError.message;
    } else {
      for (const c of (companiesData ?? []) as AdminCompany[]) {
        companiesById.set(c.id, c);
      }
    }

    // machines から会社ごとの出品数を集計（PUBLISHED のみカウント）
    const { data: machinesData, error: machinesError } = await supabaseAdmin
      .from('machines')
      .select('id, owner_company_id, status')
      .in('owner_company_id', companyIds)
      .eq('status', 'PUBLISHED')
      .limit(10000);

    if (machinesError) {
      machinesErrorMessage = machinesError.message;
    } else {
      for (const m of machinesData ?? []) {
        const ownerId = (m as any).owner_company_id as string | null;
        if (!ownerId) continue;
        listingCountByCompanyId.set(ownerId, (listingCountByCompanyId.get(ownerId) ?? 0) + 1);
      }
    }
  }

  const normalized = rows.map((r) => {
    const company = r.company_id ? companiesById.get(r.company_id) ?? null : null;
    const listingCount = company ? listingCountByCompanyId.get(company.id) ?? 0 : 0;
    return { ...r, company, listingCount };
  });

  const filtered = normalized.filter((r) => {
    if (role !== 'all' && r.role !== role) return false;
    if (active === 'true' && r.is_active !== true) return false;
    if (active === 'false' && r.is_active !== false) return false;

    const company = r.company;
    const effectiveCompanyStatus = company?.status ?? 'NONE';
    const effectiveCompanyType = company?.company_type ?? 'NONE';
    if (companyStatus !== 'all' && effectiveCompanyStatus !== companyStatus) return false;
    if (companyType !== 'all' && effectiveCompanyType !== companyType) return false;

    if (q) {
      const hay = `${r.name ?? ''} ${company?.name ?? ''}`.toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 px-4 h-16 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-slate-900 text-white p-1.5 rounded-lg font-black tracking-tighter">K-M</div>
          <h1 className="text-lg font-bold tracking-tight hidden sm:block">登録ユーザー</h1>
        </div>
        <Link href="/admin" className="text-sm font-bold text-slate-700 hover:text-slate-900">
          運営トップへ
        </Link>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-white">
              <Users size={18} />
            </div>
            <div>
              <h2 className="text-2xl font-black">登録ユーザー一覧</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                表示件数: <span className="font-bold text-slate-700">{filtered.length}</span> /{' '}
                <span className="font-bold text-slate-700">{rows.length}</span>（最大500件取得）
              </p>
            </div>
          </div>

          <Link
            href="/admin"
            className="hidden sm:inline-flex items-center gap-1.5 text-sm font-bold text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft size={16} />
            運営トップに戻る
          </Link>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <form method="get" className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 mb-1">検索（名前 / 会社名）</label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  name="q"
                  defaultValue={q}
                  placeholder="例）黒田 / 株式会社"
                  className="w-full border border-slate-200 rounded-xl pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">ロール</label>
              <select
                name="role"
                defaultValue={role}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              >
                <option value="all">すべて</option>
                <option value="COMPANY_ADMIN">COMPANY_ADMIN</option>
                <option value="COMPANY_MEMBER">COMPANY_MEMBER</option>
                <option value="PLATFORM_ADMIN">PLATFORM_ADMIN</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">アカウント有効</label>
              <select
                name="active"
                defaultValue={active}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              >
                <option value="all">すべて</option>
                <option value="true">有効</option>
                <option value="false">無効</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">会社ステータス</label>
              <select
                name="companyStatus"
                defaultValue={companyStatus}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              >
                <option value="all">すべて</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
                <option value="NONE">会社なし</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">会社タイプ</label>
              <select
                name="companyType"
                defaultValue={companyType}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              >
                <option value="all">すべて</option>
                <option value="DEMAND">DEMAND（借りたい/買いたい）</option>
                <option value="SUPPLY">SUPPLY（貸したい/売りたい）</option>
                <option value="BOTH">BOTH（両方）</option>
                <option value="NONE">会社なし</option>
              </select>
            </div>

            <div className="md:col-span-5 flex items-center justify-between gap-3 pt-1">
              <p className="text-xs text-slate-500">
                ※ 会社情報は <code className="font-mono">companies</code> と紐付いている場合のみ表示します。
              </p>
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-800"
              >
                絞り込み
              </button>
            </div>
          </form>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-700 rounded-xl p-3 text-sm">
            取得に失敗しました: {error.message}
          </div>
        )}
        {!error && companiesErrorMessage && (
          <div className="bg-amber-50 border border-amber-100 text-amber-800 rounded-xl p-3 text-sm">
            会社情報の取得に一部失敗しました（ユーザー一覧は表示します）: {companiesErrorMessage}
          </div>
        )}
        {!error && machinesErrorMessage && (
          <div className="bg-amber-50 border border-amber-100 text-amber-800 rounded-xl p-3 text-sm">
            出品数の取得に一部失敗しました（ユーザー一覧は表示します）: {machinesErrorMessage}
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-left text-slate-600">
                  <th className="px-4 py-3 font-bold whitespace-nowrap">名前</th>
                  <th className="px-4 py-3 font-bold whitespace-nowrap">会社名</th>
                  <th className="px-4 py-3 font-bold whitespace-nowrap text-right">出品数</th>
                  <th className="px-4 py-3 font-bold whitespace-nowrap">ロール</th>
                  <th className="px-4 py-3 font-bold whitespace-nowrap">有効</th>
                  <th className="px-4 py-3 font-bold whitespace-nowrap">会社ステータス</th>
                  <th className="px-4 py-3 font-bold whitespace-nowrap">所在地</th>
                  <th className="px-4 py-3 font-bold whitespace-nowrap">登録日時</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-slate-500" colSpan={8}>
                      条件に一致するユーザーがいません。
                    </td>
                  </tr>
                ) : (
                  filtered.map((u) => {
                    const company = u.company;
                    const companyName = company?.name ?? '（会社なし）';
                    const location =
                      company && (company.prefecture || company.city)
                        ? `${company.prefecture ?? ''}${company.city ?? ''}`
                        : '-';
                    const listingCount = (u as any).listingCount as number | undefined;

                    return (
                      <tr key={u.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900">{u.name}</div>
                          <div className="text-xs text-slate-400 font-mono mt-0.5">{u.id}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900">{companyName}</div>
                          {company?.company_type && (
                            <div className="text-xs text-slate-500 mt-0.5">
                              type: <span className="font-semibold">{company.company_type}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          {listingCount ?? 0}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-bold text-slate-700">
                            {u.role}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-bold ${
                              u.is_active
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                : 'border-slate-200 bg-slate-50 text-slate-600'
                            }`}
                          >
                            {u.is_active ? '有効' : '無効'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-bold ${
                              company?.status === 'ACTIVE'
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                : company?.status === 'INACTIVE'
                                ? 'border-red-200 bg-red-50 text-red-700'
                                : 'border-slate-200 bg-slate-50 text-slate-600'
                            }`}
                          >
                            {company?.status ?? '会社なし'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">{location}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{formatDateTimeJa(u.created_at)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}


