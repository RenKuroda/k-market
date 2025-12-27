## API仕様（MVP / REST想定）

本ドキュメントは、MVPで必要なAPIを **論理エンドポイント** として整理する。

### 実装前提（仮）

- **Frontend**: Next.js（仮）
- **Backend**: Next.js Route Handlers / Edge Functions / Supabase PostgREST など（仮）
- **Auth**: Supabase Auth（`auth.users`）を利用し、パスワード/JWTは自前管理しない
- **Authorization**: RLS（`auth.uid()` + `public.users.role`）で担保（詳細は `06_security_rls.md`）

---

## 共通仕様

### 認証の扱い（Supabase）

- クライアントは Supabase Auth のセッションを保持し、API呼び出し時に以下いずれかで認証状態を伝える。
  - **推奨**: Supabase SDK が自動付与する認証情報（SSR Cookie / Authorization header）
  - **RESTの表現**: `Authorization: Bearer <access_token>`

### レスポンス（成功）

```json
{ "data": {} }
```

リストは配列を返す。

```json
{ "data": [] }
```

### エラー規約（共通）

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "start_date is required",
    "details": { "field": "start_date" }
  }
}
```

- **400**: バリデーション不正
- **401**: 未ログイン/セッション無効
- **403**: 権限不足（RLS含む）
- **404**: 対象が存在しない（または権限上見えない）
- **409**: 競合（重複登録など）

### 主要データ型（参照）

```json
{
  "Company": {
    "id": "uuid",
    "name": "string",
    "company_type": "DEMAND|SUPPLY|BOTH",
    "status": "ACTIVE|INACTIVE",
    "prefecture": "string|null",
    "city": "string|null"
  },
  "UserProfile": {
    "id": "uuid(auth.users.id)",
    "name": "string",
    "role": "COMPANY_ADMIN|COMPANY_MEMBER|PLATFORM_ADMIN",
    "company_id": "uuid|null"
  }
}
```

---

## auth（認証）

※ 認証自体は Supabase Auth（SDK）で行う。ここでは画面要件上の「必要操作」として整理する。

### `POST /auth/register`（論理）

- **目的**: 会社＋初回ユーザー登録（Supabase signUp + `companies/users` 作成）
- **認証**: 不要（未ログイン）
- **呼び出し元画面**: `認証（ログイン/会員登録）`

**Request**

```json
{
  "company": {
    "name": "Kuroda Demolition Co., Ltd.",
    "company_type": "DEMAND",
    "prefecture": "東京都",
    "city": "江東区"
  },
  "user": {
    "name": "黒田 レン",
    "email": "ren@example.com",
    "password": "********"
  }
}
```

**Response**

```json
{
  "data": {
    "user": { "id": "uuid", "name": "黒田 レン", "role": "COMPANY_ADMIN", "company_id": "uuid" },
    "company": { "id": "uuid", "name": "Kuroda Demolition Co., Ltd.", "company_type": "DEMAND", "status": "ACTIVE" }
  }
}
```

### `POST /auth/login`（論理）

- **目的**: ログイン（Supabase signIn）
- **認証**: 不要（未ログイン）
- **呼び出し元画面**: `認証（ログイン/会員登録）`

**Request**

```json
{ "email": "ren@example.com", "password": "********" }
```

**Response**

```json
{
  "data": {
    "user": { "id": "uuid", "name": "黒田 レン", "role": "COMPANY_ADMIN", "company_id": "uuid" },
    "company": { "id": "uuid", "name": "Kuroda Demolition Co., Ltd.", "company_type": "DEMAND", "status": "ACTIVE" }
  }
}
```

### `GET /auth/me`（推奨：用意する）

- **目的**: ログイン状態の確認（`public.users` + `companies` をまとめて返す）
- **認証**: 必須
- **呼び出し元画面**: 各ダッシュボード初期表示（需要側/供給側/運営）

**Response**

```json
{
  "data": {
    "user": { "id": "uuid", "name": "黒田 レン", "role": "COMPANY_ADMIN", "company_id": "uuid" },
    "company": { "id": "uuid", "name": "Kuroda Demolition Co., Ltd.", "company_type": "DEMAND", "status": "ACTIVE" }
  }
}
```

---

## companies（会社）

### `GET /companies/{id}`

- **目的**: 会社情報取得（原則：自社のみ、運営は全社）
- **認証**: 必須
- **権限**:
  - 会社ユーザー: `id == my company_id` かつ `status=ACTIVE` のみ
  - 運営: 全件
- **呼び出し元画面**: （Phase0）ダッシュボード上で会社表示が必要な場合

**Response**

```json
{
  "data": {
    "id": "uuid",
    "name": "Kuroda Demolition Co., Ltd.",
    "company_type": "DEMAND",
    "status": "ACTIVE",
    "prefecture": "東京都",
    "city": "江東区"
  }
}
```

---

## public（未ログイン：簡易検索）

### `GET /public/machines`

- **目的**: 未ログイン向けの簡易検索（在庫感/相場感の提示）
- **認証**: 不要
- **権限**: `status=PUBLISHED` のみ（戻す情報は安全な項目に限定）
- **呼び出し元画面**: `ログイン前トップ/簡易検索`

**Query（例）**

- `prefecture=東京都&category=EXCAVATOR&transaction_type=RENTAL`

**Response（例）**

```json
{
  "data": [
    {
      "id": "uuid",
      "title": "0.7クラス 解体仕様 油圧ショベル",
      "category": "EXCAVATOR",
      "location_prefecture": "東京都",
      "location_city": "江東区",
      "rental_enabled": true,
      "sale_enabled": false,
      "rental_price_daily": 50000
    }
  ]
}
```

### `GET /public/machines/{machineId}`（任意）

- **目的**: 未ログイン向けの詳細（制限表示）
- **認証**: 不要
- **呼び出し元画面**: `機械詳細（制限表示）`

**Response（例）**

```json
{
  "data": {
    "id": "uuid",
    "title": "0.7クラス 解体仕様 油圧ショベル",
    "category": "EXCAVATOR",
    "maker": "KOMATSU",
    "model": "PC200",
    "machine_class": "0.7",
    "location_prefecture": "東京都",
    "location_city": "江東区",
    "rental_enabled": true,
    "sale_enabled": false,
    "rental_price_daily": 50000
  }
}
```

---

## market（ログイン後：検索/閲覧）

### `GET /market/machines`

- **目的**: ログイン後の検索（需要側）
- **認証**: 必須
- **権限**: `status=PUBLISHED` のみ（需要側/供給側どちらでも閲覧可）
- **呼び出し元画面**: `機械検索/一覧（ログイン後）`

**Query（例）**

- `prefecture=東京都&category=EXCAVATOR&transaction_type=RENTAL&start_date=2026-01-10&end_date=2026-01-20`

**Response（例）**

```json
{
  "data": [
    {
      "id": "uuid",
      "title": "0.7クラス 解体仕様 油圧ショベル",
      "category": "EXCAVATOR",
      "maker": "KOMATSU",
      "model": "PC200",
      "machine_class": "0.7",
      "location_prefecture": "東京都",
      "location_city": "江東区",
      "rental_enabled": true,
      "sale_enabled": false,
      "rental_price_daily": 50000,
      "sale_price": null
    }
  ]
}
```

### `GET /market/machines/{machineId}`

- **目的**: 機械詳細（ログイン後）
- **認証**: 必須
- **呼び出し元画面**: `機械詳細`

**Response（例）**

```json
{
  "data": {
    "id": "uuid",
    "owner_company_id": "uuid",
    "title": "0.7クラス 解体仕様 油圧ショベル",
    "category": "EXCAVATOR",
    "maker": "KOMATSU",
    "model": "PC200",
    "machine_class": "0.7",
    "spec_note": "解体仕様/ガード付",
    "location_prefecture": "東京都",
    "location_city": "江東区",
    "rental_enabled": true,
    "sale_enabled": false,
    "rental_price_daily": 50000,
    "sale_price": null,
    "status": "PUBLISHED"
  }
}
```

---

## supplier（供給側：出品管理）

### `GET /supplier/machines`

- **目的**: 自社の出品一覧
- **認証**: 必須
- **権限**: 自社（`owner_company_id = my company_id`）のみ
- **呼び出し元画面**: `供給側ダッシュボード（出品一覧＋見積/案件一覧）`

**Response**

```json
{
  "data": [
    {
      "id": "uuid",
      "title": "0.7クラス 解体仕様 油圧ショベル",
      "status": "PUBLISHED",
      "rental_enabled": true,
      "sale_enabled": false
    }
  ]
}
```

### `POST /supplier/machines`

- **目的**: 出品作成
- **認証**: 必須
- **権限**: 供給側（company_typeがSUPPLY/BOTH）を想定（詳細はRLS/アプリ側で）
- **呼び出し元画面**: `機械登録/編集`

**Request**

```json
{
  "title": "0.7クラス 解体仕様 油圧ショベル",
  "category": "EXCAVATOR",
  "maker": "KOMATSU",
  "model": "PC200",
  "machine_class": "0.7",
  "spec_note": "解体仕様/ガード付",
  "rental_enabled": true,
  "sale_enabled": false,
  "rental_price_daily": 50000,
  "sale_price": null,
  "location_prefecture": "東京都",
  "location_city": "江東区",
  "status": "DRAFT"
}
```

**Response**

```json
{ "data": { "id": "uuid" } }
```

### `PUT /supplier/machines/{machineId}`

- **目的**: 出品更新
- **認証**: 必須
- **権限**: 自社出品のみ
- **呼び出し元画面**: `機械登録/編集`

**Request（例）**

```json
{ "status": "PUBLISHED" }
```

**Response（例）**

```json
{ "data": { "id": "uuid", "status": "PUBLISHED" } }
```

### `PATCH /supplier/machines/{machineId}/status`

- **目的**: 掲載/停止の切替
- **認証**: 必須
- **呼び出し元画面**: `供給側ダッシュボード` / `機械登録/編集`

**Request**

```json
{ "status": "PAUSED" }
```

**Response**

```json
{ "data": { "id": "uuid", "status": "PAUSED" } }
```

---

## quote（見積依頼/回答）

### `POST /quote-requests`

- **目的**: 見積依頼作成（需要側）
- **認証**: 必須
- **権限**: 需要側（company_typeがDEMAND/BOTH）を想定
- **呼び出し元画面**: `見積依頼作成`

**Request**

```json
{
  "machine_id": "uuid",
  "transaction_type": "RENTAL",
  "site_name": "江東区 某現場",
  "site_address": "東京都江東区…",
  "start_date": "2026-01-10",
  "end_date": "2026-01-20",
  "quantity": 1,
  "delivery_date": "2026-01-10",
  "pickup_date": "2026-01-20",
  "note": "解体仕様希望"
}
```

**Response**

```json
{ "data": { "id": "uuid", "status": "PENDING" } }
```

### `GET /quote-requests`

- **目的**: 見積依頼一覧（需要側/供給側）
- **認証**: 必須
- **呼び出し元画面**:
  - 需要側: `需要側ダッシュボード（案件一覧）`
  - 供給側: `供給側ダッシュボード（出品一覧＋見積/案件一覧）`

**Query（例）**

- `view=demand` または `view=supply`（実装都合で不要なら省略）

**Response（例）**

```json
{
  "data": [
    {
      "id": "uuid",
      "machine_id": "uuid",
      "transaction_type": "RENTAL",
      "start_date": "2026-01-10",
      "end_date": "2026-01-20",
      "quantity": 1,
      "status": "PENDING"
    }
  ]
}
```

### `GET /quote-requests/{requestId}`

- **目的**: 見積依頼詳細＋回答（あれば）
- **認証**: 必須
- **呼び出し元画面**:
  - `見積・案件詳細（需要側）`
  - `見積・案件詳細（供給側）`

**Response（例）**

```json
{
  "data": {
    "quote_request": { "id": "uuid", "status": "PENDING" },
    "quote_responses": []
  }
}
```

### `POST /quote-requests/{requestId}/responses`

- **目的**: 見積回答作成（供給側）
- **認証**: 必須
- **権限**: 供給側（当該 request の supplier のみ）
- **呼び出し元画面**: `見積・案件詳細（供給側）`

**Request**

```json
{
  "price_base": 50000,
  "price_transport": 10000,
  "price_total": 60000,
  "currency": "JPY",
  "terms_note": "回送費別途/燃料満タン返し"
}
```

**Response**

```json
{ "data": { "id": "uuid", "status": "SENT" } }
```

---

## orders（案件＝発注後）

### `POST /orders`

- **目的**: 発注確定（見積回答を採用して案件作成）
- **認証**: 必須
- **権限**: 需要側（requester のみ）
- **呼び出し元画面**: `見積・案件詳細（需要側）`

**Request**

```json
{ "quote_response_id": "uuid" }
```

**Response**

```json
{
  "data": {
    "id": "uuid",
    "status": "ORDERED"
  }
}
```

### `GET /orders`

- **目的**: 案件一覧（当事者のみ）
- **認証**: 必須
- **呼び出し元画面**:
  - 需要側: `需要側ダッシュボード（案件一覧）`
  - 供給側: `供給側ダッシュボード（出品一覧＋見積/案件一覧）`

**Response（例）**

```json
{
  "data": [
    {
      "id": "uuid",
      "machine_id": "uuid",
      "transaction_type": "RENTAL",
      "start_date": "2026-01-10",
      "end_date": "2026-01-20",
      "status": "ORDERED",
      "agreed_price_total": 60000
    }
  ]
}
```

### `GET /orders/{orderId}`

- **目的**: 案件詳細（当事者のみ）
- **認証**: 必須
- **呼び出し元画面**: `見積・案件詳細（需要側/供給側）`

**Response（例）**

```json
{ "data": { "id": "uuid", "status": "ORDERED" } }
```

### `PATCH /orders/{orderId}/status`（運用用）

- **目的**: 案件ステータス更新（MVPは運営主導で可）
- **認証**: 必須
- **権限**: 運営（PLATFORM_ADMIN）推奨
- **呼び出し元画面**: `案件一覧+簡易詳細`

**Request**

```json
{ "status": "COMPLETED" }
```

**Response**

```json
{ "data": { "id": "uuid", "status": "COMPLETED" } }
```

---

## admin（運営）

※ すべて **PLATFORM_ADMIN のみ**

### `GET /admin/companies`

- **呼び出し元画面**: `企業一覧+簡易詳細`

### `PATCH /admin/companies/{companyId}/status`

**Request**

```json
{ "status": "INACTIVE" }
```

### `GET /admin/machines`

- **呼び出し元画面**: `出品一覧+簡易詳細`

### `PATCH /admin/machines/{machineId}/status`

**Request**

```json
{ "status": "PAUSED" }
```

### `GET /admin/orders`

- **呼び出し元画面**: `案件一覧+簡易詳細`

### `PATCH /admin/orders/{orderId}/status`

**Request**

```json
{ "status": "COMPLETED" }
```

---

## 画面 → API（対応表・簡易）

- `ログイン前トップ/簡易検索` → `GET /public/machines`
- `認証（ログイン/会員登録）` → `/auth/register`, `/auth/login`（論理）
- `需要側ダッシュボード（案件一覧）` → `GET /quote-requests`, `GET /orders`, `GET /auth/me`
- `機械検索/一覧（ログイン後）` → `GET /market/machines`
- `機械詳細` → `GET /market/machines/{id}`
- `見積依頼作成` → `POST /quote-requests`
- `見積・案件詳細（需要側）` → `GET /quote-requests/{id}`, `POST /orders`
- `供給側ダッシュボード` → `GET /supplier/machines`, `GET /quote-requests`, `GET /orders`, `GET /auth/me`
- `機械登録/編集` → `POST/PUT /supplier/machines`
- `見積・案件詳細（供給側）` → `GET /quote-requests/{id}`, `POST /quote-requests/{id}/responses`
- `運営画面一式` → `/admin/*`

### 変更履歴

| 更新日 | 更新者 | 変更内容 |
|---|---|---|
| 2025-12-26 | PM（AI） | 新規作成 |


