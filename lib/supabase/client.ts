import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    // ビルド時のプリレンダリングではダミーを返す
    return createBrowserClient("https://placeholder.supabase.co", "placeholder-key");
  }
  return createBrowserClient(url, key);
}
