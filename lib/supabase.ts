// 後方互換のための re-export
// 新規コードは lib/supabase/admin.ts から supabaseAdmin をインポートしてください
import { supabaseAdmin } from "@/lib/supabase/admin";

export const supabase = supabaseAdmin;
