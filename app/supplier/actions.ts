'use server';

import { createSupabaseServerClient } from '../../lib/supabaseServerClient';
import { supabaseAdmin } from '../../lib/supabaseAdmin';

export type ToggleMachineStatusResult =
  | { ok: true; nextStatus: 'PUBLISHED' | 'STOPPED' }
  | { ok: false; error: string };

export async function toggleMachineStatusAction(params: {
  machineId: string;
  ownerCompanyId: string;
  currentStatus: 'PUBLISHED' | 'STOPPED' | string;
}): Promise<ToggleMachineStatusResult> {
  // 1) 認証ユーザーを取得（cookie ベース）
  const supabase = createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) {
    return { ok: false, error: authError?.message ?? 'ログイン情報を取得できませんでした。' };
  }

  const userId = authData.user.id;

  // 2) プロフィールから company_id を取得
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', userId)
    .maybeSingle<{ company_id: string | null }>();

  if (profileError || !profile?.company_id) {
    return {
      ok: false,
      error: profileError?.message ?? 'ユーザーの所属企業が取得できませんでした。',
    };
  }

  const companyId = profile.company_id;

  // 3) Service Role で machines を取得（RLSバイパス）
  const { data: machine, error: machineError } = await supabaseAdmin
    .from('machines')
    .select('id, owner_company_id, status')
    .eq('id', params.machineId)
    .maybeSingle<{ id: string; owner_company_id: string; status: string }>();

  if (machineError || !machine) {
    return {
      ok: false,
      error: machineError?.message ?? '対象の出品が見つかりませんでした。',
    };
  }

  // 4) 所属企業と出品の owner_company_id が一致するかチェック
  if (machine.owner_company_id !== companyId) {
    return {
      ok: false,
      error: 'この出品を更新する権限がありません。（自社の出品ではありません）',
    };
  }

  // 5) ステータスをトグル
  const nextStatus: 'PUBLISHED' | 'STOPPED' =
    machine.status === 'PUBLISHED' ? 'STOPPED' : 'PUBLISHED';

  const { error: updateError } = await supabaseAdmin
    .from('machines')
    .update({ status: nextStatus })
    .eq('id', machine.id);

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  return { ok: true, nextStatus };
}


