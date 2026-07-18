"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useUser } from "@/app/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { UserRole } from "@/types/auth";
import {
  BookOpen,
  Building2,
  Briefcase,
  Clock,
  CreditCard,
  ImageIcon,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import { ReactNode, useEffect } from "react";

// タブごとの許可ロール。member は設定画面全体が非表示
const TABS: {
  href: string;
  label: string;
  icon: typeof Users;
  roles: UserRole[];
}[] = [
  { href: "/settings/users", label: "組織管理", icon: Users, roles: ["super_admin", "admin"] },
  { href: "/settings/reference-thumbnails", label: "参考サムネ", icon: ImageIcon, roles: ["super_admin"] },
  { href: "/settings/platform-guidelines", label: "媒体設定", icon: SlidersHorizontal, roles: ["super_admin"] },
  { href: "/settings/system-references", label: "参考原稿", icon: BookOpen, roles: ["super_admin"] },
  { href: "/settings/offices", label: "事業所マスタ", icon: Building2, roles: ["super_admin", "admin"] },
  { href: "/settings/job-types", label: "職種マスタ", icon: Briefcase, roles: ["super_admin", "admin"] },
  { href: "/settings/employment-types", label: "勤務形態マスタ", icon: Clock, roles: ["super_admin", "admin"] },
  { href: "/settings/billing", label: "プラン", icon: CreditCard, roles: ["super_admin", "admin"] },
];

export default function SettingsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, loading } = useUser();
  const router = useRouter();

  const currentTab = TABS.find(
    (tab) => pathname === tab.href || pathname.startsWith(tab.href + "/")
  );
  const isAllowed =
    !!user && user.role !== "member" && (!currentTab || currentTab.roles.includes(user.role));

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    // member は設定画面全体にアクセス不可
    if (user.role === "member") {
      router.push("/jobs");
      return;
    }
    if (currentTab && !currentTab.roles.includes(user.role)) {
      router.push("/settings/offices");
    }
  }, [user, loading, router, currentTab]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12">
        <p className="text-gray-500 text-center">読み込み中...</p>
      </div>
    );
  }

  if (!user || !isAllowed) return null;

  const visibleTabs = TABS.filter((tab) => tab.roles.includes(user.role));

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">設定</h1>
        <p className="text-sm text-gray-500 mt-1">
          ユーザー・マスタデータの管理
        </p>
      </div>
      <div className="flex gap-2 mb-6 border-b pb-3 overflow-x-auto">
        {visibleTabs.map((tab) => {
          const isActive = pathname === tab.href || pathname.startsWith(tab.href + "/");
          const Icon = tab.icon;
          return (
            <Link key={tab.href} href={tab.href}>
              <Button
                variant={isActive ? "default" : "ghost"}
                size="sm"
                className={`text-[13px] h-8 px-3 shrink-0 ${
                  isActive ? "" : "text-gray-600"
                }`}
              >
                <Icon className="w-3.5 h-3.5 mr-1.5" />
                {tab.label}
              </Button>
            </Link>
          );
        })}
      </div>
      {children}
    </div>
  );
}
