import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'K-Market | 解体業界向け重機マッチング',
  description:
    '解体業界向けの重機・ダンプ・アタッチメントのレンタル＋売買マッチングプラットフォーム「K-Market」のMVP版フロントエンド。',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        {/* Tailwind CDN（MVP段階ではCDN利用。将来的にビルド型Tailwindへ移行予定） */}
        <script src="https://cdn.tailwindcss.com" />
      </head>
      <body className="bg-slate-50 text-slate-900">{children}</body>
    </html>
  );
}


