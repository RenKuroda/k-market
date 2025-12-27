import { createClient } from '@supabase/supabase-js';

// ブラウザで使うクライアント用。
// NEXT_PUBLIC_* が優先だが、なければ SUPABASE_* をフォールバックで見る。
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error(
    'Supabase URL が設定されていません。NEXT_PUBLIC_SUPABASE_URL もしくは SUPABASE_URL を .env.local に設定してください。',
  );
}

if (!supabaseAnonKey) {
  throw new Error(
    'Supabase Anon Key が設定されていません。NEXT_PUBLIC_SUPABASE_ANON_KEY もしくは SUPABASE_ANON_KEY を .env.local に設定してください。',
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

