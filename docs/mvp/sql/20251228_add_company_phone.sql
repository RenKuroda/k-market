-- companies に電話番号カラムを追加するマイグレーション
-- Supabase の SQL エディタ等で実行してください

alter table public.companies
  add column if not exists phone text;

comment on column public.companies.phone is '電話番号';


