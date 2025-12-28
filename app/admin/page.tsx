import Link from 'next/link';
import { Users } from 'lucide-react';

import { requirePlatformAdmin } from '../../lib/requirePlatformAdmin';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  await requirePlatformAdmin();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 px-4 h-16 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-slate-900 text-white p-1.5 rounded-lg font-black tracking-tighter">K-M</div>
          <h1 className="text-lg font-bold tracking-tight hidden sm:block">運営ダッシュボード</h1>
        </div>
        <Link href="/" className="text-sm font-bold text-slate-700 hover:text-slate-900">
          トップへ戻る
        </Link>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h2 className="text-2xl font-black">運営メニュー</h2>
          <p className="text-sm text-slate-500 mt-1">※ この画面は運営（PLATFORM_ADMIN）のみ閲覧できます。</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            href="/admin/users"
            className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-white">
                <Users size={18} />
              </div>
              <div>
                <p className="text-lg font-bold text-slate-800">登録ユーザー</p>
                <p className="text-sm text-slate-500 mt-0.5">名前・会社名などを確認</p>
              </div>
            </div>
          </Link>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm opacity-60">
            <p className="text-lg font-bold text-slate-800">企業一覧</p>
            <p className="text-sm text-slate-500 mt-1">準備中</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm opacity-60">
            <p className="text-lg font-bold text-slate-800">出品一覧</p>
            <p className="text-sm text-slate-500 mt-1">準備中</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm opacity-60">
            <p className="text-lg font-bold text-slate-800">案件一覧</p>
            <p className="text-sm text-slate-500 mt-1">準備中</p>
          </div>
        </div>
      </main>
    </div>
  );
}


