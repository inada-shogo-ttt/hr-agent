import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // 公開パス（ログインページ、静的アセット）
  const isPublicPath =
    pathname === "/login" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname === "/favicon.ico";

  // 未認証ユーザーをログインにリダイレクト
  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // 認証済みユーザーがログインページにアクセスした場合
  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/jobs";
    return NextResponse.redirect(url);
  }

  // publisher ロールのアクセス制限
  if (user) {
    const { data: profile } = await supabase
      .from("User")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role === "publisher") {
      const allowedPaths = ["/publish", "/api/jobs", "/api/notifications", "/api/publish-requests", "/api/thumbnails"];
      const isAllowed =
        allowedPaths.some((p) => pathname.startsWith(p)) ||
        pathname === "/" ||
        isPublicPath;

      if (!isAllowed) {
        const url = request.nextUrl.clone();
        url.pathname = "/publish";
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}
