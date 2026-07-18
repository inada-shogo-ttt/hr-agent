"use client";

import { useEffect, useRef, useState } from "react";
import { Check, PenLine, Sparkles } from "lucide-react";
import { AgentStatus } from "@/lib/agents/types";

export interface DeskStep {
  id: string;
  label: string;
}

export type FeedItem =
  | { id: string; kind: "text"; label: string; text: string }
  | { id: string; kind: "chips"; label: string; chips: string[] }
  | {
      id: string;
      kind: "manuscript";
      label: string;
      title: string;
      catchphrase?: string;
      excerpt: string;
    };

interface LiveWritingDeskProps {
  steps: DeskStep[];
  statuses: Record<string, { status: AgentStatus; message?: string }>;
  feed: FeedItem[];
  isComplete?: boolean;
}

function itemLength(item: FeedItem): number {
  switch (item.kind) {
    case "text":
      return item.text.length;
    case "chips":
      return item.chips.length;
    case "manuscript":
      return item.title.length + (item.catchphrase?.length || 0) + item.excerpt.length;
  }
}

const Caret = () => (
  <span className="inline-block w-[2px] h-[1.1em] bg-gray-800 animate-pulse ml-0.5 align-text-bottom" />
);

// n 文字分だけ表示するアイテム描画（typing = 現在タイプ中）
function FeedItemView({ item, chars, typing }: { item: FeedItem; chars: number; typing: boolean }) {
  if (item.kind === "chips") {
    const visible = item.chips.slice(0, chars);
    return (
      <div className="space-y-1.5">
        <p className="text-[11px] font-medium text-gray-400 tracking-wide">{item.label}</p>
        <div className="flex flex-wrap gap-1.5">
          {visible.map((chip, i) => (
            <span
              key={i}
              className="px-2.5 py-0.5 rounded-full border border-gray-200 bg-gray-50 text-xs text-gray-700"
            >
              {chip}
            </span>
          ))}
          {typing && <Caret />}
        </div>
      </div>
    );
  }

  if (item.kind === "manuscript") {
    let remaining = chars;
    const title = item.title.slice(0, Math.max(0, remaining));
    remaining -= item.title.length;
    const catchphrase = item.catchphrase ? item.catchphrase.slice(0, Math.max(0, remaining)) : "";
    remaining -= item.catchphrase?.length || 0;
    const excerpt = item.excerpt.slice(0, Math.max(0, remaining));
    const caretIn = remaining < 0 || excerpt.length < item.excerpt.length
      ? excerpt.length > 0 || catchphrase.length === (item.catchphrase?.length || 0)
        ? "excerpt"
        : "catchphrase"
      : "excerpt";

    return (
      <div className="space-y-1.5 border-l-2 border-gray-900/80 pl-3">
        <p className="text-[11px] font-medium text-gray-400 tracking-wide">{item.label}</p>
        {title && (
          <p className="text-sm font-bold text-gray-900 leading-relaxed">
            {title}
            {typing && title.length < item.title.length && <Caret />}
          </p>
        )}
        {catchphrase && (
          <p className="text-sm text-gray-800">
            {catchphrase}
            {typing && caretIn === "catchphrase" && catchphrase.length < (item.catchphrase?.length || 0) && <Caret />}
          </p>
        )}
        {excerpt && (
          <p className="text-xs text-gray-500 leading-relaxed whitespace-pre-wrap">
            {excerpt}
            {typing && caretIn === "excerpt" && <Caret />}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <p className="text-[11px] font-medium text-gray-400 tracking-wide">{item.label}</p>
      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
        {item.text.slice(0, chars)}
        {typing && <Caret />}
      </p>
    </div>
  );
}

export function LiveWritingDesk({ steps, statuses, feed, isComplete }: LiveWritingDeskProps) {
  const [doneCount, setDoneCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // タイプライター: キュー先頭のアイテムを少しずつ表示
  useEffect(() => {
    const current = feed[doneCount];
    if (!current) return;
    const total = itemLength(current);

    if (charCount >= total) {
      const t = setTimeout(() => {
        setDoneCount((d) => d + 1);
        setCharCount(0);
      }, 350);
      return () => clearTimeout(t);
    }

    const isChips = current.kind === "chips";
    const t = setTimeout(
      () => setCharCount((c) => Math.min(c + (isChips ? 1 : 2), total)),
      isChips ? 150 : 24
    );
    return () => clearTimeout(t);
  }, [feed, doneCount, charCount]);

  // 最新行への自動スクロール
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [charCount, doneCount, isComplete]);

  const runningStep = steps.find((s) => statuses[s.id]?.status === "running");
  const allTyped = doneCount >= feed.length;

  return (
    <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
      {/* ステップ進捗 */}
      <div className="px-5 pt-4 pb-3 border-b bg-gray-50/60">
        <div className="flex items-center">
          {steps.map((step, i) => {
            const status = statuses[step.id]?.status;
            return (
              <div key={step.id} className={`flex items-center ${i > 0 ? "flex-1" : ""}`}>
                {i > 0 && (
                  <div
                    className={`h-px flex-1 mx-1.5 ${
                      status === "completed" || status === "running" ? "bg-gray-900" : "bg-gray-200"
                    }`}
                  />
                )}
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] transition-all ${
                      status === "completed"
                        ? "bg-gray-900 text-white"
                        : status === "running"
                        ? "bg-white border-2 border-gray-900 animate-pulse"
                        : status === "error"
                        ? "bg-red-500 text-white"
                        : "bg-white border border-gray-300"
                    }`}
                  >
                    {status === "completed" && <Check className="w-3 h-3" />}
                    {status === "running" && <span className="w-1.5 h-1.5 rounded-full bg-gray-900" />}
                  </div>
                  <span
                    className={`text-[10px] whitespace-nowrap ${
                      status === "running"
                        ? "text-gray-900 font-semibold"
                        : status === "completed"
                        ? "text-gray-500"
                        : "text-gray-300"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 原稿用紙 */}
      <div className="px-6 py-4">
        <div className="flex items-center gap-2 mb-3 text-sm text-gray-600">
          {isComplete ? (
            <>
              <Sparkles className="w-4 h-4" />
              <span className="font-medium">完成しました</span>
            </>
          ) : (
            <>
              <PenLine className="w-4 h-4 animate-pulse" />
              <span className="font-medium">
                {runningStep ? `${runningStep.label}中…` : "仕上げ中…"}
              </span>
            </>
          )}
        </div>

        <div
          ref={scrollRef}
          className="h-[300px] overflow-y-auto rounded-lg border border-gray-100 bg-[#fdfdfc] px-5 py-4 space-y-4 scroll-smooth"
        >
          {feed.length === 0 && (
            <p className="text-sm text-gray-400">
              AIエージェントが分析を始めています…
              <Caret />
            </p>
          )}
          {feed.slice(0, doneCount + 1).map((item, i) => (
            <FeedItemView
              key={item.id}
              item={item}
              chars={i < doneCount ? itemLength(item) : charCount}
              typing={i === doneCount && !isComplete}
            />
          ))}
          {isComplete && allTyped && (
            <p className="text-sm font-medium text-gray-900 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              すべての原稿が完成しました
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
