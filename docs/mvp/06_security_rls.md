## セキュリティ / RLS方針（Supabase前提）

MVPでは **Supabase Auth + RLS** を前提に「会社データの漏洩を防ぎつつ、最小機能を成立させる」ことを優先する。

---

## 前提（Supabaseの認証・権限）

- **ログインユーザーID**: `auth.uid()`
- **ユーザープロフィール**: `public.users`
  - `public.users.id = auth.users.id`
  - `public.users.role` でアプリ内権限を管理
- **企業状態**: `public.companies.status`
  - 通常ユーザーは **ACTIVE の会社のみ** 参照可能
  - INACTIVE の企業は「利用停止」とみなし、実質操作不可にする

---

## ロール設計

- `COMPANY_ADMIN`: 会社ユーザー（管理者）。MVPでは `COMPANY_MEMBER` と同等でも可
- `COMPANY_MEMBER`: 会社ユーザー（一般）
- `PLATFORM_ADMIN`: 運営（全件閲覧/操作）

補足:
- MVPでは「会社内の細かい権限分離」は後回し。まずは `PLATFORM_ADMIN` と「通常ユーザー」の分離を最優先。

---

## RLSの守るべき対象（MVP）

- 会社データは **所属企業（company_id）** の範囲に閉じる
- 見積/案件は **当事者（需要側/供給側）** のみに閉じる
- 運営（PLATFORM_ADMIN）のみが全件閲覧・停止・ステータス更新できる

---

## ポリシー要件（要約）

### `public.users`

- 自分のレコードのみ **select/update 可**
- `PLATFORM_ADMIN` は **全件 select 可**

### `public.companies`

- 自分が所属する company のみ **select 可**
- ただし **status='ACTIVE' のみ**（通常ユーザー）
- `PLATFORM_ADMIN` は **全件 select 可**（ACTIVE/INACTIVE問わず）

### `public.machines`（方針）

- 供給側: `owner_company_id = my company_id` のみ CRUD
- ログイン後（需要側/供給側）: `status='PUBLISHED'` のみ select（検索/閲覧）
- 未ログイン: **簡易検索のみ**を提供するが、
  - RLSで anon に `machines` の select を直接許すと「全カラムが読める」ため、
  - **view / RPC / Edge Function** で **返却項目を限定** した形で提供する（推奨）

### `public.quote_requests / quote_responses / orders`（方針）

- `quote_requests`
  - 需要側（requester）: insert/select（自社のみ）
  - 供給側（supplier）: select（自社宛のみ）
- `quote_responses`
  - 供給側: insert/select/update（自社のみ）
  - 需要側: select（自社依頼分のみ）
- `orders`
  - 需要側/供給側: select（当事者のみ）
  - status更新はMVPでは **運営主導** を推奨（供給側更新は後で検討）

---

## RLS SQL（Phase0：users/companies）

※ `alter table ... enable row level security` は既に済みの前提。

```sql
-- ============================================
-- RLS policies for public.users
-- ============================================

-- 自分自身のレコードのみ SELECT 可
create policy "users_select_self"
on public.users
for select
to authenticated
using (
  id = auth.uid()
);

-- PLATFORM_ADMIN は全件 SELECT 可
create policy "users_select_all_as_platform_admin"
on public.users
for select
to authenticated
using (
  exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.role = 'PLATFORM_ADMIN'
  )
);

-- 自分自身のレコードのみ UPDATE 可
create policy "users_update_self"
on public.users
for update
to authenticated
using (
  id = auth.uid()
)
with check (
  id = auth.uid()
);

-- ============================================
-- RLS policies for public.companies
-- ============================================

-- 自分が所属する ACTIVE な会社のみ SELECT 可
create policy "companies_select_own_active_company"
on public.companies
for select
to authenticated
using (
  status = 'ACTIVE'
  and exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.company_id = companies.id
  )
);

-- PLATFORM_ADMIN は status に関係なく全件 SELECT 可
create policy "companies_select_all_as_platform_admin"
on public.companies
for select
to authenticated
using (
  exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.role = 'PLATFORM_ADMIN'
  )
);
```

---

## 権限マトリクス（画面/API）

### 画面

| ロール | ログイン前トップ/簡易検索 | 認証 | 需要側画面 | 供給側画面 | 運営画面 |
|---|---:|---:|---:|---:|---:|
| 未ログイン（anon） | ○ | ○ | × | × | × |
| 会社ユーザー（authenticated） | ○ | ○ | ○（DEMAND/BOTH） | ○（SUPPLY/BOTH） | × |
| 運営（PLATFORM_ADMIN） | ○ | ○ | ○ | ○ | ○ |

### APIグループ

| ロール | `/public/*` | `/market/*` | `/supplier/*` | `/quote/*` | `/orders/*` | `/admin/*` |
|---|---:|---:|---:|---:|---:|---:|
| 未ログイン（anon） | ○ | × | × | × | × | × |
| 会社ユーザー | ○ | ○ | ○（供給側） | ○（当事者のみ） | ○（当事者のみ） | × |
| 運営 | ○ | ○ | ○ | ○ | ○ | ○ |

---

## 注意点（運用/実装上の落とし穴）

- `companies.status='INACTIVE'` の企業は RLS で `companies` が読めなくなるため、UIでは「利用停止」表示や強制ログアウト導線が必要
- 「未ログインの簡易検索」は、**machinesテーブルを直接公開しない**（view/RPCで返却カラム制限）
- RLSの判定で `public.users` を参照するため、`public.users` が未作成のユーザーは権限判定できない  
  → サインアップ時に `public.users` を必ず作成する（トリガー/Edge Function等は次フェーズで確定）

### 変更履歴

| 更新日 | 更新者 | 変更内容 |
|---|---|---|
| 2025-12-26 | PM（AI） | 新規作成 |


