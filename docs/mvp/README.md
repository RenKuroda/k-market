## MVPドキュメント（要件メモ）

このフォルダは、解体業界向け「重機・ダンプ・アタッチメント」の **レンタル＋売買マッチング** サービスにおける、MVP（最初のリリース）要件を1箇所に統合したメモです。

- **狙い**: 開発メンバーが見て「作る/作らない」「どの順で作るか」を迷わない状態にする
- **前提**: B2B、ログイン制御あり（未ログインは簡易検索のみ）、決済/チャット/カレンダーはMVP対象外
- **Supabase前提**: Supabase Auth（`auth.users`）＋業務テーブル（`public.*`）＋RLS

### 読む順（おすすめ）

- `00_overview.md`: 目的・MVPゴール・非対象・用語集
- `01_scope_phase.md`: Phase0/1/2 の範囲・成果物・完了条件（DoD）
- `02_user_flow.md`: 需要側/供給側/運営のユーザーフロー（画面遷移）
- `03_screens.md`: 画面一覧＋最低限UI要件
- `04_data_model.md`: データモデル（ER図・ステータス遷移含む）
- `05_api_spec.md`: API一覧（request/response例・権限・画面紐づけ）
- `06_security_rls.md`: RLS方針・role設計・ポリシー要件（SQLサンプル含む）
- `07_nonfunctional.md`: 非機能（権限/監査/通知/ログ/運用/エラー規約）

### 目次リンク

- [`00_overview.md`](./00_overview.md)
- [`01_scope_phase.md`](./01_scope_phase.md)
- [`02_user_flow.md`](./02_user_flow.md)
- [`03_screens.md`](./03_screens.md)
- [`04_data_model.md`](./04_data_model.md)
- [`05_api_spec.md`](./05_api_spec.md)
- [`06_security_rls.md`](./06_security_rls.md)
- [`07_nonfunctional.md`](./07_nonfunctional.md)

### 変更履歴

| 更新日 | 更新者 | 変更内容 |
|---|---|---|
| 2025-12-26 | PM（AI） | 新規作成 |


