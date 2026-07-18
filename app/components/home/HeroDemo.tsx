"use client";

import { useEffect, useState } from "react";
import { Check, LoaderCircle } from "lucide-react";

const TICK_MS = 80;

// 各エージェントが完了するtick（80ms刻みでループ再生）
const AGENTS = [
  { name: "トレンド調査", doneAt: 16 },
  { name: "トレンド分析", doneAt: 30 },
  { name: "参考原稿選定", doneAt: 42 },
  { name: "原稿執筆", doneAt: 96 },
  { name: "サムネイル生成", doneAt: 108 },
  { name: "ファクトチェック", doneAt: 126 },
  { name: "フォーマット", doneAt: 144 },
];
const TOTAL = 144;
const LOOP_AT = 175;

const WRITE_START = 42;
const WRITE_END = 96;
const LINES = [
  "【賞与年2回】介護スタッフ／未経験OK・駅チカ5分",
  "残業は月平均5時間以下。家庭と両立しながら働けます。",
  "資格取得支援あり。先輩の9割が未経験スタートです。",
];
const ALL_TEXT = LINES.join("\n");

const PLATFORMS = ["Indeed", "AirWork", "JobMedley", "HelloWork"];

export function HeroDemo() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setTick(TOTAL);
      return;
    }
    const id = setInterval(() => {
      setTick((t) => (t >= LOOP_AT ? 0 : t + 1));
    }, TICK_MS);
    return () => clearInterval(id);
  }, []);

  const progress = Math.min(100, Math.round((tick / TOTAL) * 100));
  const runningIndex = AGENTS.findIndex((a) => tick < a.doneAt);
  const complete = tick >= TOTAL;

  const writing = tick >= WRITE_START && tick < WRITE_END;
  const charsShown =
    tick < WRITE_START
      ? 0
      : Math.min(
          ALL_TEXT.length,
          Math.ceil(((tick - WRITE_START) / (WRITE_END - WRITE_START)) * ALL_TEXT.length)
        );
  const shownLines = ALL_TEXT.slice(0, charsShown).split("\n");

  const thumbsRunning = tick >= AGENTS[3].doneAt && tick < AGENTS[4].doneAt;
  const thumbsDone = tick >= AGENTS[4].doneAt;
  const platformsShown =
    tick < AGENTS[5].doneAt
      ? 0
      : Math.min(PLATFORMS.length, Math.floor((tick - AGENTS[5].doneAt) / 4) + 1);

  const caret = (
    <span className="lp-caret inline-block w-[2px] h-[1.1em] bg-primary align-middle ml-0.5" />
  );

  return (
    <div className="bg-white rounded-[20px] border border-gray-200 shadow-lg overflow-hidden text-left">
      {/* ウィンドウバー */}
      <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100 bg-gray-50/70">
        <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
        <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
        <div className="w-3 h-3 rounded-full bg-[#28c840]" />
        <span className="ml-2 text-[11px] text-gray-400 font-mono truncate">
          採用エージェント — Team A
        </span>
        <span
          className={`ml-auto inline-flex items-center gap-1.5 text-[11px] font-semibold rounded-full px-2.5 py-1 ${
            complete ? "bg-[#008489]/10 text-[#008489]" : "bg-[#fff0f3] text-primary"
          }`}
        >
          {complete ? (
            <>
              <Check className="w-3 h-3" strokeWidth={3} />
              4媒体の原稿が完成
            </>
          ) : (
            <>
              <LoaderCircle className="w-3 h-3 animate-spin" />
              実行中 {progress}%
            </>
          )}
        </span>
      </div>
      <div className="h-[3px] bg-gray-100">
        <div
          className="h-full bg-primary transition-[width] duration-150 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="grid md:grid-cols-[218px_1fr]">
        {/* 左: エージェントパイプライン */}
        <div className="border-b md:border-b-0 md:border-r border-gray-100 p-4 md:p-5 grid grid-cols-2 md:grid-cols-1 gap-x-2 gap-y-0.5 content-start">
          {AGENTS.map((a, i) => {
            const done = tick >= a.doneAt;
            const running = i === runningIndex;
            return (
              <div
                key={a.name}
                className={`flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[12.5px] transition-colors duration-300 ${
                  running
                    ? "bg-[#fff0f3] text-gray-900 font-semibold"
                    : done
                      ? "text-gray-700"
                      : "text-gray-400"
                }`}
              >
                {done ? (
                  <span className="w-4 h-4 rounded-full bg-[#008489] flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5 text-white" strokeWidth={3.5} />
                  </span>
                ) : running ? (
                  <LoaderCircle className="w-4 h-4 text-primary animate-spin shrink-0" />
                ) : (
                  <span className="w-4 h-4 rounded-full border-[1.5px] border-gray-300 shrink-0" />
                )}
                <span className="truncate">{a.name}</span>
              </div>
            );
          })}
        </div>

        {/* 右: 原稿プレビュー */}
        <div className="p-5 md:p-6">
          <div className="text-[10px] font-semibold tracking-[0.14em] text-gray-400 uppercase mb-2.5">
            Preview — 生成中の原稿
          </div>
          <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3.5">
            <p className="text-[13.5px] font-bold text-gray-900 leading-snug min-h-[21px]">
              {shownLines[0] ?? ""}
              {writing && shownLines.length === 1 && caret}
            </p>
            <p className="text-[12px] text-gray-500 leading-relaxed mt-1.5 min-h-[18px]">
              {shownLines[1] ?? ""}
              {writing && shownLines.length === 2 && caret}
            </p>
            <p className="text-[12px] text-gray-500 leading-relaxed mt-1 min-h-[18px]">
              {shownLines[2] ?? ""}
              {writing && shownLines.length === 3 && caret}
            </p>
          </div>

          {/* サムネイル */}
          <div className="flex items-center gap-2 mt-3">
            <span className="text-[10px] font-semibold tracking-[0.14em] text-gray-400 uppercase shrink-0 mr-1">
              Thumb
            </span>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`h-9 flex-1 rounded-lg transition-all duration-500 ${
                  thumbsDone
                    ? "bg-gradient-to-br from-[#ffa9bb] via-[#ff7591] to-[#ffd1da]"
                    : `bg-gray-100 ${thumbsRunning ? "animate-pulse" : ""}`
                }`}
                style={{ transitionDelay: `${i * 120}ms` }}
              />
            ))}
          </div>

          {/* 出力媒体 */}
          <div className="flex flex-wrap gap-1.5 mt-3.5">
            {PLATFORMS.map((p, i) => {
              const shown = i < platformsShown;
              return (
                <span
                  key={p}
                  className={`inline-flex items-center gap-1 text-[11px] font-semibold rounded-full px-2.5 py-1 border transition-all duration-300 ${
                    shown
                      ? "bg-white border-[#008489]/40 text-[#008489]"
                      : "bg-gray-50 border-gray-200 text-gray-300"
                  }`}
                >
                  {shown && <Check className="w-3 h-3" strokeWidth={3} />}
                  {p}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
