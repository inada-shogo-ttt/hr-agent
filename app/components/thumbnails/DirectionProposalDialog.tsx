"use client";

import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle, Sparkles, Wand2 } from "lucide-react";
import { ThumbnailDirection } from "@/types/thumbnail-direction";
import { JobPostingInput } from "@/types/job-posting";
import { ExistingPostingFields } from "@/types/team-b";

// 提案APIへのリクエスト内容（画像データはクライアント側でも除外して送る）
export interface DirectionProposalRequest {
  source: "team-a" | "team-b";
  jobPostingInput?: JobPostingInput;
  existingPosting?: ExistingPostingFields;
  platforms: string[];
}

interface DirectionProposalDialogProps {
  // null 以外が渡されたらダイアログを開いて提案を取得する
  request: DirectionProposalRequest | null;
  // 案を選択（お任せ含む）。direction === null は「方向性なしでこのまま生成」
  onSelect: (direction: ThumbnailDirection | null) => void;
  onCancel: () => void;
}

export function DirectionProposalDialog({
  request,
  onSelect,
  onCancel,
}: DirectionProposalDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [directions, setDirections] = useState<ThumbnailDirection[]>([]);
  const [pendingAuto, setPendingAuto] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const open = request !== null;

  useEffect(() => {
    if (!request) return;
    setLoading(true);
    setError(null);
    setDirections([]);
    setPendingAuto(false);
    setSubmitted(false);

    const controller = new AbortController();
    abortRef.current = controller;

    const body: DirectionProposalRequest =
      request.source === "team-a" && request.jobPostingInput
        ? {
            ...request,
            // 画像データは訴求分析に使わない（仕様）ため送信自体を省く
            jobPostingInput: { ...request.jobPostingInput, thumbnailReference: null },
          }
        : request;

    fetch("/api/agents/thumbnail-directions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error || "方向性の提案に失敗しました");
        setDirections((data?.directions as ThumbnailDirection[]) || []);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "方向性の提案に失敗しました");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
    // request オブジェクトは開くたびに新規参照が渡される前提
  }, [request]);

  const recommended = directions.find((d) => d.recommended) || directions[0];

  const select = (direction: ThumbnailDirection | null) => {
    if (submitted) return;
    setSubmitted(true);
    onSelect(direction);
  };

  // 「お任せ」: ロード中に押されたら完了を待って推奨案で自動進行
  useEffect(() => {
    if (pendingAuto && !loading && !submitted) {
      if (recommended) {
        select(recommended);
      } else {
        setPendingAuto(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAuto, loading]);

  const handleAuto = () => {
    if (loading) {
      setPendingAuto(true);
      return;
    }
    if (recommended) select(recommended);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v && !submitted) onCancel();
      }}
    >
      <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-500" />
            サムネイルの方向性を選ぶ
          </DialogTitle>
          <DialogDescription>
            入力内容から訴求ポイントを分析し、1〜5枚目の生成方向性を3案ご提案します。選んだ案を元にサムネイルを生成します。
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
            <p className="text-sm">訴求ポイントを分析中…（10秒ほどかかります）</p>
            {pendingAuto && (
              <p className="text-xs text-violet-600">
                分析が終わり次第、おすすめ案で自動的に生成を開始します
              </p>
            )}
          </div>
        )}

        {!loading && error && (
          <div className="py-6 space-y-4">
            <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={onCancel} disabled={submitted}>
                キャンセル
              </Button>
              <Button onClick={() => select(null)} disabled={submitted}>
                このまま生成（方向性なし）
              </Button>
            </div>
          </div>
        )}

        {!loading && !error && directions.length > 0 && (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              {directions.map((d) => (
                <div
                  key={d.id}
                  className={`rounded-xl border p-4 flex flex-col gap-3 ${
                    d.recommended ? "border-violet-300 bg-violet-50/50" : "border-gray-200"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-sm">{d.name}</h3>
                    {d.recommended && (
                      <Badge className="bg-violet-500 hover:bg-violet-500 shrink-0">おすすめ</Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-600">{d.concept}</p>
                  <p className="text-[11px] text-gray-500">配色: {d.colorTone}</p>
                  <ol className="space-y-1.5 text-[11px] text-gray-600 flex-1">
                    {d.slots.map((s) => (
                      <li key={s.slot} className="flex gap-1.5">
                        <span className="shrink-0 font-medium text-gray-400">{s.slot}.</span>
                        <span>
                          {s.composition}
                          {s.copy && (
                            <span className="block mt-0.5 font-medium text-violet-700">
                              コピー: 「{s.copy}」
                            </span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ol>
                  <Button
                    size="sm"
                    className="w-full"
                    variant={d.recommended ? "default" : "outline"}
                    onClick={() => select(d)}
                    disabled={submitted}
                  >
                    この案で生成
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between gap-3 pt-2">
              <Button variant="ghost" onClick={onCancel} disabled={submitted}>
                キャンセル
              </Button>
              <Button variant="outline" onClick={handleAuto} disabled={submitted}>
                <Wand2 className="w-4 h-4 mr-1.5" />
                お任せで生成（おすすめ案）
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
