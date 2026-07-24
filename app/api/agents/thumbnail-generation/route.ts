import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-guard";
import { runThumbnailGenerationAgent } from "@/lib/agents/thumbnail-generation";
import { ThumbnailGenerationInput } from "@/lib/agents/types";
import { JobPostingInput, CommonJobInfo } from "@/types/job-posting";

export const runtime = "nodejs";
export const maxDuration = 300;

const VALID_PLATFORMS = ["indeed", "airwork", "jobmedley"] as const;
type LabPlatform = (typeof VALID_PLATFORMS)[number];

// POST /api/agents/thumbnail-generation — サムネイル生成の単体実行（開発用・最高管理者専用）
// 原稿生成を経由せず、本番と同じ runThumbnailGenerationAgent を直接実行する
export async function POST(request: NextRequest) {
  const auth = await requireRole(["super_admin"]);
  if ("error" in auth) return auth.error;

  const body = await request.json();
  const { jobTitle, catchphrase, companyName, industry, platforms, referenceImage } =
    body as {
      jobTitle?: string;
      catchphrase?: string;
      companyName?: string;
      industry?: string;
      platforms?: string[];
      referenceImage?: string | null;
    };

  if (!jobTitle?.trim()) {
    return NextResponse.json({ error: "jobTitle は必須です" }, { status: 400 });
  }

  const targets = (platforms || ["indeed"]).filter((p): p is LabPlatform =>
    (VALID_PLATFORMS as readonly string[]).includes(p)
  );
  if (targets.length === 0) {
    return NextResponse.json(
      { error: `platforms は ${VALID_PLATFORMS.join(" / ")} から1つ以上指定してください` },
      { status: 400 }
    );
  }

  if (referenceImage && !referenceImage.startsWith("data:image/")) {
    return NextResponse.json(
      { error: "referenceImage は data URL で指定してください" },
      { status: 400 }
    );
  }

  const common: CommonJobInfo = {
    companyName: companyName?.trim() || "テスト株式会社",
    industry: industry?.trim() || "介護・福祉",
    companyDescription: "",
    jobTitle: jobTitle.trim(),
    employmentType: "正社員",
    numberOfHires: 1,
    prefecture: "東京都",
    city: "",
    address: "",
    nearestStation: "",
    accessFromStation: "",
    salaryMin: 200000,
    salaryMax: undefined,
    salaryType: "月給",
    salaryDescription: "",
    workingHours: "",
    workingHoursDescription: "",
    jobDescription: "",
    requirements: "",
    welcomeRequirements: "",
    holidays: "",
    benefits: "",
    socialInsurance: [],
    probationPeriod: "",
    selectionProcess: "",
    appealPoints: catchphrase?.trim() || "",
    targetAudience: "",
    competitiveAdvantage: "",
  };

  const jobPostingInput: JobPostingInput = {
    common,
    thumbnailReference: referenceImage || null,
  };

  // 本番パイプラインは原稿から indeed.jobTitle / indeed.catchphrase のみ参照するため、
  // ラボではその2フィールドだけを持つ manuscript を渡す
  const manuscript = {
    indeed: {
      jobTitle: jobTitle.trim(),
      catchphrase: catchphrase?.trim() || "",
    },
  } as ThumbnailGenerationInput["manuscript"];

  const startedAt = Date.now();
  const result = await runThumbnailGenerationAgent({
    jobPostingInput,
    manuscript,
    platforms: targets,
  });

  return NextResponse.json({
    platformThumbnails: result.platformThumbnails,
    generationStatus: result.generationStatus,
    message: result.message,
    visualStyle: result.visualStyle,
    elapsedMs: Date.now() - startedAt,
  });
}
