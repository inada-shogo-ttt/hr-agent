"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface GuidelineForm {
  platform: string;
  format: string;
  algorithm: string;
  constraints: string;
  saved: boolean;
}

const PLATFORM_LABELS: Record<string, string> = {
  indeed: "Indeed",
  airwork: "AirWork",
  jobmedley: "JobMedley",
  hellowork: "ハローワーク",
};

const SECTIONS: {
  key: "algorithm" | "constraints" | "format";
  label: string;
  description: string;
  rows: number;
}[] = [
  {
    key: "algorithm",
    label: "アルゴリズム",
    description: "媒体の検索・表示ロジックや CTR/CVR の考え方。原稿生成・改善時の前提知識としてプロンプトに注入されます。",
    rows: 10,
  },
  {
    key: "constraints",
    label: "制約条件",
    description: "文字数上限・禁止事項・法令・表記ルールなど。生成時に厳守され、ファクトチェックの検証条件にも使われます。",
    rows: 12,
  },
  {
    key: "format",
    label: "出力フォーマット",
    description: "原稿本文のテンプレート(見出し・記号・区切り線・セクション構成)。空欄の場合はフォーマット指定なしで生成します。",
    rows: 16,
  },
];

export default function PlatformGuidelinesPage() {
  const [guidelines, setGuidelines] = useState<GuidelineForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingPlatform, setSavingPlatform] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings/platform-guidelines")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => setGuidelines(data.platforms || []))
      .catch(() => toast.error("媒体設定の取得に失敗しました"))
      .finally(() => setLoading(false));
  }, []);

  const updateField = (
    platform: string,
    key: "algorithm" | "constraints" | "format",
    value: string
  ) => {
    setGuidelines((prev) =>
      prev.map((g) => (g.platform === platform ? { ...g, [key]: value } : g))
    );
  };

  const handleSave = async (guideline: GuidelineForm) => {
    setSavingPlatform(guideline.platform);
    try {
      const res = await fetch("/api/settings/platform-guidelines", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: guideline.platform,
          format: guideline.format,
          algorithm: guideline.algorithm,
          constraints: guideline.constraints,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "保存に失敗しました");
        return;
      }
      setGuidelines((prev) =>
        prev.map((g) =>
          g.platform === guideline.platform ? { ...g, saved: true } : g
        )
      );
      toast.success(`${PLATFORM_LABELS[guideline.platform]}の媒体設定を保存しました`);
    } catch {
      toast.error("保存に失敗しました");
    } finally {
      setSavingPlatform(null);
    }
  };

  if (loading) {
    return <p className="text-gray-500 text-center py-8">読み込み中...</p>;
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">媒体設定</h2>
        <p className="text-sm text-gray-500 mt-1">
          媒体ごとのアルゴリズム・制約条件・出力フォーマットを設定します。原稿の生成(Team A)と改善(Team B)がこの内容を参照します。
        </p>
      </div>

      <Tabs defaultValue="indeed">
        <TabsList className="w-full">
          {guidelines.map((g) => (
            <TabsTrigger key={g.platform} value={g.platform} className="flex-1">
              {PLATFORM_LABELS[g.platform] || g.platform}
            </TabsTrigger>
          ))}
        </TabsList>
        {guidelines.map((g) => (
          <TabsContent key={g.platform} value={g.platform} className="space-y-6 mt-4">
            {!g.saved && (
              <Badge variant="secondary" className="text-xs">
                初期値(未保存) — 保存するとこの内容が設定として固定されます
              </Badge>
            )}
            {SECTIONS.map((section) => (
              <div key={section.key} className="space-y-1.5">
                <Label className="text-sm font-medium">{section.label}</Label>
                <p className="text-xs text-muted-foreground">{section.description}</p>
                <Textarea
                  value={g[section.key]}
                  onChange={(e) => updateField(g.platform, section.key, e.target.value)}
                  rows={section.rows}
                  className="font-mono text-xs"
                />
              </div>
            ))}
            <Button
              onClick={() => handleSave(g)}
              disabled={savingPlatform === g.platform}
            >
              {savingPlatform === g.platform ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  保存中...
                </>
              ) : (
                `${PLATFORM_LABELS[g.platform]}の設定を保存`
              )}
            </Button>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
