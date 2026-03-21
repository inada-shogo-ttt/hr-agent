import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Briefcase, BookOpen, ArrowRight, PenLine, BarChart3, RefreshCw, ArrowDown } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#FAFAF8]">
      {/* ===== ナビ ===== */}
      <header className="sticky top-0 z-50 border-b border-gray-200/60 bg-[#FAFAF8]/80 backdrop-blur-md">
        <div className="max-w-[1100px] mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-gray-900 text-white text-xs font-bold tracking-tight">採</span>
            <span className="text-[15px] font-semibold tracking-tight text-gray-900">採用エージェント</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link href="/references">
              <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900 text-[13px] h-8 px-3">
                <BookOpen className="w-3.5 h-3.5 mr-1.5" />
                参考原稿
              </Button>
            </Link>
            <Link href="/jobs">
              <Button size="sm" className="text-[13px] h-8 px-4 bg-gray-900 hover:bg-gray-800 rounded-lg">
                <Briefcase className="w-3.5 h-3.5 mr-1.5" />
                求人管理
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* ===== ヒーロー ===== */}
      <section className="relative overflow-hidden">
        {/* 背景のやわらかい幾何学 */}
        <div className="absolute inset-0 pointer-events-none select-none" aria-hidden>
          <div className="absolute top-24 -left-20 w-[500px] h-[500px] rounded-full bg-amber-100/40 blur-3xl" />
          <div className="absolute top-40 right-0 w-[400px] h-[400px] rounded-full bg-stone-200/30 blur-3xl" />
        </div>

        <div className="relative max-w-[1100px] mx-auto px-6 pt-24 pb-20">
          {/* バッジ */}
          <div className="flex justify-center mb-6">
            <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-gray-500 bg-white border border-gray-200 rounded-full px-3.5 py-1.5 shadow-sm">
              Indeed / AirWork / JobMedley / HelloWork 対応
            </span>
          </div>

          {/* キャッチコピー */}
          <h1 className="text-center text-[2.75rem] leading-[1.2] font-extrabold tracking-tight text-gray-900 max-w-2xl mx-auto">
            求人原稿の作成から
            <br />
            改善まで、まるごと自動で。
          </h1>

          <p className="text-center text-[16px] leading-relaxed text-gray-500 mt-5 max-w-lg mx-auto">
            求人情報を入力するだけ。14のAIエージェントが<br className="hidden sm:block" />
            原稿作成・トレンド分析・改善提案を一気通貫で。
          </p>

          {/* CTA */}
          <div className="flex justify-center gap-3 mt-9">
            <Link href="/jobs">
              <Button size="lg" className="h-12 px-7 bg-gray-900 hover:bg-gray-800 rounded-xl text-[14px] font-semibold shadow-lg shadow-gray-900/10">
                はじめる
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <a href="#how-it-works">
              <Button variant="outline" size="lg" className="h-12 px-7 rounded-xl text-[14px] font-semibold border-gray-300 hover:bg-white">
                使い方を見る
                <ArrowDown className="w-4 h-4 ml-2" />
              </Button>
            </a>
          </div>

          {/* ミニプレビュー — ワークフローのイメージ */}
          <div className="mt-16 mx-auto max-w-3xl">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xl shadow-gray-200/50 p-1">
              <div className="rounded-xl bg-gray-50 border border-gray-100 px-8 py-7">
                {/* フェイクUI */}
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-3 h-3 rounded-full bg-red-300" />
                  <div className="w-3 h-3 rounded-full bg-amber-300" />
                  <div className="w-3 h-3 rounded-full bg-green-300" />
                  <div className="ml-3 text-[11px] text-gray-400 font-mono">採用エージェント — ワークフロー</div>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: "トレンド調査", pct: 100, color: "bg-emerald-500" },
                    { label: "原稿執筆", pct: 100, color: "bg-blue-500" },
                    { label: "ファクトチェック", pct: 100, color: "bg-amber-500" },
                    { label: "フォーマット", pct: 72, color: "bg-violet-500" },
                  ].map((s) => (
                    <div key={s.label} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium text-gray-600">{s.label}</span>
                        <span className="text-[10px] font-mono text-gray-400">{s.pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
                        <div className={`h-full rounded-full ${s.color} transition-all`} style={{ width: `${s.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-5 grid grid-cols-3 gap-3">
                  {["Indeed", "AirWork", "JobMedley"].map((name) => (
                    <div key={name} className="bg-white rounded-lg border border-gray-200 px-3 py-2.5">
                      <div className="text-[10px] text-gray-400 mb-1">{name}</div>
                      <div className="h-2 rounded bg-gray-100 mb-1" />
                      <div className="h-2 rounded bg-gray-100 w-3/4" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 使い方ステップ ===== */}
      <section id="how-it-works" className="scroll-mt-16 py-24 bg-white border-y border-gray-200/60">
        <div className="max-w-[1100px] mx-auto px-6">
          <p className="text-[12px] font-semibold uppercase tracking-[0.15em] text-gray-400 text-center mb-3">How it works</p>
          <h2 className="text-[1.75rem] font-bold tracking-tight text-gray-900 text-center mb-14">
            4ステップで完結
          </h2>

          <div className="grid grid-cols-4 gap-0">
            {[
              { step: "01", title: "求人を登録", desc: "事業所名・職種・雇用形態を入力するだけ。PDFの求人票も読み取れます。", icon: Briefcase, accent: "text-gray-900 bg-gray-100" },
              { step: "02", title: "原稿を自動生成", desc: "8つのAIエージェントが連携。トレンド分析からファクトチェックまで一気に。", icon: PenLine, accent: "text-blue-700 bg-blue-50" },
              { step: "03", title: "掲載して数値を取得", desc: "生成した原稿を媒体に掲載。応募数やクリック数を入力してください。", icon: BarChart3, accent: "text-amber-700 bg-amber-50" },
              { step: "04", title: "AIが改善案を提案", desc: "6つのAIエージェントが数値を分析。具体的な改善差分を提示します。", icon: RefreshCw, accent: "text-emerald-700 bg-emerald-50" },
            ].map((item, i) => (
              <div key={item.step} className="relative px-6">
                {/* コネクティングライン */}
                {i < 3 && (
                  <div className="hidden md:block absolute top-8 left-[calc(50%+24px)] w-[calc(100%-48px)] h-px bg-gray-200" />
                )}
                <div className="relative flex flex-col items-center text-center">
                  <div className={`w-14 h-14 rounded-2xl ${item.accent} flex items-center justify-center mb-5 shadow-sm`}>
                    <item.icon className="w-6 h-6" />
                  </div>
                  <div className="text-[11px] font-mono font-medium text-gray-300 mb-2">STEP {item.step}</div>
                  <h3 className="text-[15px] font-bold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-[13px] leading-relaxed text-gray-500">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 2つのチーム ===== */}
      <section className="py-24">
        <div className="max-w-[1100px] mx-auto px-6">
          <p className="text-[12px] font-semibold uppercase tracking-[0.15em] text-gray-400 text-center mb-3">Two AI Teams</p>
          <h2 className="text-[1.75rem] font-bold tracking-tight text-gray-900 text-center mb-14">
            作成と改善、それぞれの専門チーム
          </h2>

          <div className="grid md:grid-cols-2 gap-5">
            {/* Team A */}
            <div className="group relative rounded-2xl bg-white border border-gray-200 p-8 hover:shadow-lg hover:shadow-gray-200/50 transition-all duration-300">
              <div className="flex items-center gap-3 mb-5">
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-blue-600 text-white text-[13px] font-bold">A</span>
                <div>
                  <div className="text-[11px] font-medium text-blue-600 tracking-wide uppercase">Team A</div>
                  <h3 className="text-[17px] font-bold text-gray-900 -mt-0.5">新規原稿自動生成</h3>
                </div>
              </div>
              <p className="text-[13px] leading-relaxed text-gray-500 mb-6">
                求人情報を入力するだけで、最新トレンドに基づいた求人原稿を4媒体分自動作成。
                8つのAIエージェントが連携して高品質な原稿を生成します。
              </p>
              <div className="flex flex-wrap gap-1.5">
                {["マネージャー", "トレンド調査", "トレンド分析", "参考原稿選定", "原稿執筆", "サムネイル生成", "ファクトチェック", "フォーマッター"].map((a) => (
                  <span key={a} className="text-[11px] font-medium text-blue-700 bg-blue-50 border border-blue-100 rounded-md px-2 py-0.5">{a}</span>
                ))}
              </div>
              {/* 飾りライン */}
              <div className="absolute top-0 left-8 right-8 h-[2px] rounded-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            {/* Team B */}
            <div className="group relative rounded-2xl bg-white border border-gray-200 p-8 hover:shadow-lg hover:shadow-gray-200/50 transition-all duration-300">
              <div className="flex items-center gap-3 mb-5">
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-amber-600 text-white text-[13px] font-bold">B</span>
                <div>
                  <div className="text-[11px] font-medium text-amber-600 tracking-wide uppercase">Team B</div>
                  <h3 className="text-[17px] font-bold text-gray-900 -mt-0.5">再掲載用原稿改善</h3>
                </div>
              </div>
              <p className="text-[13px] leading-relaxed text-gray-500 mb-6">
                掲載数値と過去の改善履歴をもとにAIが課題を分析。
                テキスト・デザイン・予算の3軸で具体的な改善案を提示します。
              </p>
              <div className="flex flex-wrap gap-1.5">
                {["マネージャー", "数値分析", "原稿分析", "テキスト改善", "デザイン改善", "予算最適化"].map((a) => (
                  <span key={a} className="text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-100 rounded-md px-2 py-0.5">{a}</span>
                ))}
              </div>
              <div className="absolute top-0 left-8 right-8 h-[2px] rounded-full bg-amber-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </div>
      </section>

      {/* ===== 対応媒体 ===== */}
      <section className="py-24 bg-white border-y border-gray-200/60">
        <div className="max-w-[1100px] mx-auto px-6">
          <p className="text-[12px] font-semibold uppercase tracking-[0.15em] text-gray-400 text-center mb-3">Platforms</p>
          <h2 className="text-[1.75rem] font-bold tracking-tight text-gray-900 text-center mb-14">
            主要4媒体に対応
          </h2>

          <div className="grid grid-cols-4 gap-4">
            {[
              { name: "Indeed", sub: "インディード", desc: "国内最大級の求人検索エンジン。数値分析・予算最適化に対応。", dotColor: "bg-blue-500" },
              { name: "AirWork", sub: "エアワーク", desc: "リクルート運営の採用管理ツール。掲載数値の分析に対応。", dotColor: "bg-orange-500" },
              { name: "JobMedley", sub: "ジョブメドレー", desc: "医療・介護・福祉特化型。原稿の定性的な分析・改善に対応。", dotColor: "bg-emerald-500" },
              { name: "HelloWork", sub: "ハローワーク", desc: "公的機関の求人サービス。文字数制限に合わせた原稿を生成。", dotColor: "bg-rose-500" },
            ].map((p) => (
              <div key={p.name} className="rounded-xl border border-gray-200 bg-[#FAFAF8] p-5 hover:bg-white hover:shadow-md hover:shadow-gray-100 transition-all duration-200">
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-2 h-2 rounded-full ${p.dotColor}`} />
                  <span className="text-[14px] font-bold text-gray-900">{p.name}</span>
                </div>
                <p className="text-[12px] text-gray-400 mb-2">{p.sub}</p>
                <p className="text-[12px] leading-relaxed text-gray-500">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 特徴 ===== */}
      <section className="py-24">
        <div className="max-w-[1100px] mx-auto px-6">
          <p className="text-[12px] font-semibold uppercase tracking-[0.15em] text-gray-400 text-center mb-3">Features</p>
          <h2 className="text-[1.75rem] font-bold tracking-tight text-gray-900 text-center mb-14">
            なぜ採用エージェントなのか
          </h2>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                num: "01",
                title: "最新トレンドを自動調査",
                desc: "Web検索で最新の求人動向を調査。応募が集まる表現やキーワードを原稿に反映します。手動のリサーチは不要です。",
              },
              {
                num: "02",
                title: "履歴が積み上がる改善",
                desc: "過去の作成・改善履歴と掲載数値をAIが自動参照。回を重ねるほど精度の高い改善提案が得られます。",
              },
              {
                num: "03",
                title: "変更箇所がひと目でわかる",
                desc: "改善前後の原稿をフィールド単位で差分表示。なぜ変更したのか、理由付きで改善ポイントを確認できます。",
              },
            ].map((f) => (
              <div key={f.num} className="rounded-xl border border-gray-200 bg-white p-7 hover:shadow-md hover:shadow-gray-100 transition-all duration-200">
                <div className="text-[32px] font-black text-gray-100 leading-none mb-4">{f.num}</div>
                <h3 className="text-[15px] font-bold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-[13px] leading-relaxed text-gray-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 最終CTA ===== */}
      <section className="py-20">
        <div className="max-w-[600px] mx-auto px-6 text-center">
          <h2 className="text-[1.5rem] font-bold tracking-tight text-gray-900 mb-4">
            求人原稿、もう悩まない。
          </h2>
          <p className="text-[14px] text-gray-500 mb-8">
            まずは求人を登録して、AIエージェントの原稿作成を体験してみてください。
          </p>
          <Link href="/jobs">
            <Button size="lg" className="h-12 px-8 bg-gray-900 hover:bg-gray-800 rounded-xl text-[14px] font-semibold shadow-lg shadow-gray-900/10">
              求人管理をはじめる
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* ===== フッター ===== */}
      <footer className="border-t border-gray-200/60 py-8">
        <div className="max-w-[1100px] mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-gray-900 text-white text-[9px] font-bold">採</span>
            <span className="text-[12px] font-medium text-gray-400">採用エージェント</span>
          </div>
          <span className="text-[11px] text-gray-300">Powered by Claude</span>
        </div>
      </footer>
    </main>
  );
}
