"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useUser } from "@/app/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Building2, Briefcase, Clock, Users } from "lucide-react";
import { ReactNode, useEffect } from "react";

const TABS = [
  { href: "/settings/users", label: "ユーザー管理", icon: Users },
  { href: "/settings/offices", label: "事業所マスタ", icon: Building2 },
  { href: "/settings/job-types", label: "職種マスタ", icon: Briefcase },
  { href: "/settings/employment-types", label: "勤務形態マスタ", icon: Clock },
];

export default function SettingsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user?.role !== "admin") {
      router.push("/jobs");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12">
        <p className="text-gray-500 text-center">読み込み中...</p>
      </div>
    );
  }

  if (user?.role !== "admin") return null;

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">設定</h1>
        <p className="text-sm text-gray-500 mt-1">
          ユーザー・マスタデータの管理
        </p>
      </div>
      <div className="flex gap-2 mb-6 border-b pb-3 overflow-x-auto">
        {TABS.map((tab) => {
          const isActive = pathname === tab.href;
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
