"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Briefcase,
  BookOpen,
  ChevronRight,
  LogOut,
  Settings,
  Upload,
  User,
} from "lucide-react";
import { useUser } from "@/app/providers/auth-provider";
import { NotificationBell } from "@/app/components/NotificationBell";
import { UserRole } from "@/types/auth";

interface Breadcrumb {
  label: string;
  href: string;
}

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "管理者",
  editor: "作成者",
  reviewer: "承認者",
  publisher: "掲載担当",
};

function getBreadcrumbs(pathname: string): Breadcrumb[] {
  if (pathname === "/" || pathname === "") return [];
  if (pathname === "/jobs") return [];
  if (pathname === "/references") return [];
  if (pathname === "/publish") return [];
  if (pathname.startsWith("/settings")) return [];

  if (pathname === "/references/new") {
    return [{ label: "参考原稿一覧", href: "/references" }];
  }

  const officeDetailMatch = pathname.match(/^\/jobs\/offices\/([^/]+)$/);
  if (officeDetailMatch) {
    return [{ label: "求人管理", href: "/jobs" }];
  }

  const jobDetailMatch = pathname.match(/^\/jobs\/([^/]+)$/);
  if (jobDetailMatch) {
    return [{ label: "求人管理", href: "/jobs" }];
  }

  const publishDetailMatch = pathname.match(/^\/publish\/([^/]+)$/);
  if (publishDetailMatch) {
    return [{ label: "掲載管理", href: "/publish" }, { label: "依頼詳細", href: pathname }];
  }

  const jobSubMatch = pathname.match(
    /^\/jobs\/([^/]+)\/(new-posting|rewrite-posting)$/
  );
  if (jobSubMatch) {
    const jobId = jobSubMatch[1];
    const isTeamA = jobSubMatch[2] === "new-posting";
    return [
      { label: "求人一覧", href: "/jobs" },
      { label: "求人詳細", href: `/jobs/${jobId}` },
      {
        label: isTeamA ? "Team A 入力" : "Team B 入力",
        href: pathname,
      },
    ];
  }

  const jobProgressMatch = pathname.match(
    /^\/jobs\/([^/]+)\/(new-posting|rewrite-posting)\/progress$/
  );
  if (jobProgressMatch) {
    const jobId = jobProgressMatch[1];
    const isTeamA = jobProgressMatch[2] === "new-posting";
    return [
      { label: "求人一覧", href: "/jobs" },
      { label: "求人詳細", href: `/jobs/${jobId}` },
      {
        label: isTeamA ? "Team A 実行中" : "Team B 実行中",
        href: pathname,
      },
    ];
  }

  const jobOutputMatch = pathname.match(
    /^\/jobs\/([^/]+)\/(new-posting|rewrite-posting)\/output$/
  );
  if (jobOutputMatch) {
    const jobId = jobOutputMatch[1];
    const isTeamA = jobOutputMatch[2] === "new-posting";
    return [
      { label: "求人一覧", href: "/jobs" },
      { label: "求人詳細", href: `/jobs/${jobId}` },
      {
        label: isTeamA ? "Team A 出力" : "Team B 出力",
        href: pathname,
      },
    ];
  }

  return [{ label: "戻る", href: "/" }];
}

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, signOut } = useUser();
  const breadcrumbs = getBreadcrumbs(pathname);

  // ログインページではヘッダー非表示
  if (pathname === "/login") return null;

  // ホームページでは未認証時ヘッダー非表示
  const isHome = pathname === "/";
  if (isHome && !user) return null;

  const isJobsActive = pathname.startsWith("/jobs");
  const isReferencesActive = pathname.startsWith("/references");
  const isPublishActive = pathname.startsWith("/publish");
  const isSettingsActive = pathname.startsWith("/settings");

  async function handleSignOut() {
    await signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200/60 bg-[#FAFAF8]/80 backdrop-blur-md">
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <Link href="/" className="flex items-center gap-2.5 group shrink-0">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-gray-900 text-white text-xs font-bold tracking-tight">
              採
            </span>
            <span className="text-[15px] font-semibold tracking-tight text-gray-900 hidden sm:inline">
              採用エージェント
            </span>
          </Link>
          {breadcrumbs.length > 0 && (
            <nav
              className="flex items-center gap-1 min-w-0 ml-2"
              aria-label="パンくずリスト"
            >
              {breadcrumbs.map((crumb, i) => {
                const isLast = i === breadcrumbs.length - 1;
                return (
                  <div
                    key={crumb.href + i}
                    className="flex items-center gap-1 min-w-0"
                  >
                    <ChevronRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                    {isLast ? (
                      <span className="text-[13px] text-gray-900 font-medium truncate">
                        {crumb.label}
                      </span>
                    ) : (
                      <Link
                        href={crumb.href}
                        className="text-[13px] text-gray-500 hover:text-gray-900 transition-colors truncate"
                      >
                        {crumb.label}
                      </Link>
                    )}
                  </div>
                );
              })}
            </nav>
          )}
        </div>

        <nav className="flex items-center gap-2 shrink-0">
          {/* ロール別ナビゲーション */}
          {user?.role === "publisher" ? (
            <Link href="/publish">
              <Button
                size="sm"
                className={`text-[13px] h-8 px-4 rounded-lg ${
                  isPublishActive
                    ? "bg-gray-900 hover:bg-gray-800"
                    : "bg-gray-700 hover:bg-gray-800"
                }`}
              >
                <Upload className="w-3.5 h-3.5 mr-1.5" />
                掲載管理
              </Button>
            </Link>
          ) : (
            <>
              <Link href="/references">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`text-[13px] h-8 px-3 ${
                    isReferencesActive
                      ? "text-gray-900 font-semibold bg-gray-100"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5 mr-1.5" />
                  参考原稿
                </Button>
              </Link>
              <Link href="/jobs">
                <Button
                  size="sm"
                  className={`text-[13px] h-8 px-4 rounded-lg ${
                    isJobsActive
                      ? "bg-gray-900 hover:bg-gray-800"
                      : "bg-gray-700 hover:bg-gray-800"
                  }`}
                >
                  <Briefcase className="w-3.5 h-3.5 mr-1.5" />
                  求人管理
                </Button>
              </Link>
            </>
          )}

          {/* 通知ベル */}
          {user && <NotificationBell />}

          {/* ユーザーメニュー */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 gap-1.5"
                >
                  <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[11px] font-medium text-gray-600">
                    {user.name.charAt(0)}
                  </div>
                  <span className="text-[13px] text-gray-700 hidden sm:inline">
                    {user.name}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                  <Badge
                    variant="secondary"
                    className="mt-1 text-[10px] px-1.5 py-0"
                  >
                    {ROLE_LABELS[user.role]}
                  </Badge>
                </div>
                <DropdownMenuSeparator />
                {user.role === "admin" && (
                  <DropdownMenuItem onClick={() => router.push("/settings/offices")}>
                    <Settings className="w-4 h-4 mr-2" />
                    設定
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="w-4 h-4 mr-2" />
                  ログアウト
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </nav>
      </div>
    </header>
  );
}
