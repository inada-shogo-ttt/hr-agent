"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
  ChevronRight,
  LogOut,
  Settings,
} from "lucide-react";
import { useUser } from "@/app/providers/auth-provider";
import { UserRole } from "@/types/auth";

interface Breadcrumb {
  label: string;
  href: string;
}

const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "最高管理者",
  admin: "管理者",
  member: "ユーザー",
};

function getBreadcrumbs(pathname: string): Breadcrumb[] {
  if (pathname === "/" || pathname === "") return [];
  if (pathname === "/jobs") return [];
  if (pathname.startsWith("/settings")) return [];

  const officeDetailMatch = pathname.match(/^\/jobs\/offices\/([^/]+)$/);
  if (officeDetailMatch) {
    return [{ label: "求人管理", href: "/jobs" }];
  }

  const jobDetailMatch = pathname.match(/^\/jobs\/([^/]+)$/);
  if (jobDetailMatch) {
    return [{ label: "求人管理", href: "/jobs" }];
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
        label: isTeamA ? "原稿作成" : "ブラッシュアップ",
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
        label: isTeamA ? "原稿作成 実行中" : "ブラッシュアップ 実行中",
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
        label: isTeamA ? "生成結果" : "改善結果",
        href: pathname,
      },
    ];
  }

  return [{ label: "戻る", href: "/" }];
}

interface CreditInfo {
  billingExempt: boolean;
  active: boolean;
  remainingCreditYen: number;
}

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, signOut } = useUser();
  const breadcrumbs = getBreadcrumbs(pathname);
  const [credit, setCredit] = useState<CreditInfo | null>(null);

  useEffect(() => {
    if (!user) return;
    fetch("/api/billing/summary")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        setCredit({
          billingExempt: data.org.billingExempt,
          active: data.org.subscriptionStatus === "active",
          remainingCreditYen: data.usage.remainingCreditYen,
        });
      })
      .catch(() => {});
  }, [user]);

  // ログインページではヘッダー非表示
  if (pathname === "/login") return null;

  // LPは専用ヘッダーを持つため、アプリ用ヘッダーは表示しない
  const isHome = pathname === "/";
  if (isHome) return null;

  const isJobsActive = pathname.startsWith("/jobs");

  async function handleSignOut() {
    await signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 border-b border-gray-300 bg-white">
      <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <Link href="/" className="flex items-center gap-2.5 group shrink-0">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white text-[13px] font-bold tracking-tight">
              採
            </span>
            <span className="text-[15px] font-bold tracking-tight text-primary hidden sm:inline">
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
          <Link href="/jobs">
            <Button
              size="sm"
              className={`text-[13px] h-9 px-5 rounded-full ${
                isJobsActive
                  ? "bg-[#e00b41] hover:bg-[#e00b41]"
                  : "bg-primary hover:bg-[#e00b41]"
              }`}
            >
              <Briefcase className="w-3.5 h-3.5 mr-1.5" />
              求人管理
            </Button>
          </Link>

          {/* 残クレジット(課金免除組織には非表示) */}
          {credit && !credit.billingExempt && credit.active && (
            <Link
              href="/settings/billing"
              className="hidden sm:inline-flex items-center h-7 px-2.5 rounded-full bg-gray-50 border border-gray-200 text-[11px] text-gray-600 hover:bg-gray-100"
            >
              残クレジット ¥{credit.remainingCreditYen.toLocaleString()}
            </Link>
          )}

          {/* ユーザーメニュー */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 px-2 gap-1.5 rounded-full"
                >
                  <div className="w-7 h-7 rounded-full bg-gray-100 border border-gray-300 flex items-center justify-center text-[11px] font-medium text-gray-700">
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
                {user.role !== "member" && (
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
