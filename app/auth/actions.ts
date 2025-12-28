'use server';

import { supabaseAdmin } from '../../lib/supabaseAdmin';

export type CompanyType = 'DEMAND' | 'SUPPLY' | 'BOTH';

export type SignUpWithCompanyInput = {
  email: string;
  password: string;
  userName: string;
  companyName: string;
  companyType: CompanyType;
  prefecture: string;
  city: string;
  phone: string;
};

export type SignUpWithCompanyResult =
  | {
      ok: true;
      userId: string;
      companyId: string;
    }
  | {
      ok: false;
      error: string;
    };

function normalizeOptionalText(v: string | undefined): string | null {
  const t = (v ?? '').trim();
  return t.length ? t : null;
}

function isCompanyType(v: string): v is CompanyType {
  return v === 'DEMAND' || v === 'SUPPLY' || v === 'BOTH';
}

export async function signUpWithCompany(input: SignUpWithCompanyInput): Promise<SignUpWithCompanyResult> {
  const email = input.email.trim().toLowerCase();
  const password = input.password;
  const userName = input.userName.trim();
  const companyName = input.companyName.trim();
  const companyType = input.companyType;
  const phone = input.phone.trim();
  const prefecture = normalizeOptionalText(input.prefecture);
  const city = normalizeOptionalText(input.city);

  if (!email) return { ok: false, error: 'email が空です' };
  if (!password) return { ok: false, error: 'password が空です' };
  if (!userName) return { ok: false, error: '担当者名（userName）が空です' };
  if (!companyName) return { ok: false, error: '会社名（companyName）が空です' };
  if (!phone) return { ok: false, error: '電話番号（phone）が空です' };
  if (!prefecture) return { ok: false, error: '都道府県（prefecture）が空です' };
  if (!city) return { ok: false, error: '市区町村（city）が空です' };
  if (!isCompanyType(companyType)) return { ok: false, error: 'companyType が不正です' };

  // 1) auth.users を作成（Service Role）
  const { data: created, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    // MVPは「手動ゼロ」を優先し、メール確認なしで即ログインできる設定に寄せる
    // 本番要件に応じて false にしてメール確認フローへ切り替え可能
    email_confirm: true,
  });

  if (createUserError || !created.user) {
    return { ok: false, error: createUserError?.message ?? 'ユーザー作成に失敗しました' };
  }

  const userId = created.user.id;

  // 2) companies を作成（Service Role / RLSバイパス）
  const { data: company, error: companyError } = await supabaseAdmin
    .from('companies')
    .insert({
      name: companyName,
      company_type: companyType,
      status: 'ACTIVE',
      prefecture,
      city,
      phone,
    })
    .select('id')
    .single<{ id: string }>();

  if (companyError || !company) {
    // best-effort rollback: auth user 削除
    await supabaseAdmin.auth.admin.deleteUser(userId);
    return { ok: false, error: companyError?.message ?? '会社作成に失敗しました' };
  }

  const companyId = company.id;

  // 3) public.users を作成（auth.users.id と紐付け）
  //    開発中に同じ auth.user.id でレコードが残っているケースも踏まえて UPSERT しておく
  const { error: profileError } = await supabaseAdmin
    .from('users')
    .upsert(
      {
        id: userId,
        company_id: companyId,
        name: userName,
        role: 'COMPANY_ADMIN',
        is_active: true,
      },
      { onConflict: 'id' },
    );

  if (profileError) {
    // best-effort rollback: company と auth user を削除（Phase0では参照がない前提）
    await supabaseAdmin.from('companies').delete().eq('id', companyId);
    await supabaseAdmin.auth.admin.deleteUser(userId);
    return { ok: false, error: profileError.message };
  }

  return { ok: true, userId, companyId };
}


