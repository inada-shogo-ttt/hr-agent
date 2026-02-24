import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Zap, Globe, CheckCircle, RefreshCw, BarChart3, Briefcase } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* ヘッダー */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" />
            <span className="font-bold text-lg">採用エージェント</span>
          </div>
          <Link href="/jobs">
            <Button>
              <Briefcase className="w-4 h-4 mr-2" />
              求人管理
            </Button>
          </Link>
        </div>
      </header>

      {/* ヒーロー */}
      <section className="max-w-6xl mx-auto px-4 py-20 text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Badge variant="secondary">Team A — 新規原稿自動生成</Badge>
          <Badge variant="secondary" className="bg-orange-100 text-orange-700 border-orange-200">Team B — 再掲載用原稿改善</Badge>
        </div>
        <h1 className="text-4xl font-bold tracking-tight mb-4">
          AIが求人原稿の
          <br />
          <span className="text-blue-600">作成・改善</span>を自動化します
        </h1>
        <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
          Indeed・AirWork・JobMedleyに対応。
          求人を登録し、AIエージェントチームが原稿作成から改善分析まで一貫サポート。
          過去の履歴を蓄積し、データドリブンな改善を実現します。
        </p>
        <Link href="/jobs">
          <Button size="lg" className="px-8">
            <Briefcase className="w-5 h-5 mr-2" />
            求人管理を開く
          </Button>
        </Link>
      </section>

      {/* ワークフロー概要 */}
      <section className="max-w-6xl mx-auto px-4 pb-16">
        <h2 className="text-2xl font-bold text-center mb-8">利用の流れ</h2>
        <div className="grid grid-cols-4 gap-4">
          {[
            { step: "01", title: "求人を登録", desc: "事業所名・職種・雇用形態を入力して求人を登録", icon: Briefcase, color: "bg-gray-100 text-gray-600" },
            { step: "02", title: "Team A で作成", desc: "AIが3媒体分の原稿を自動生成", icon: Zap, color: "bg-blue-100 text-blue-600" },
            { step: "03", title: "掲載・数値取得", desc: "原稿を掲載し、掲載数値を取得", icon: BarChart3, color: "bg-yellow-100 text-yellow-600" },
            { step: "04", title: "Team B で改善", desc: "数値ベースの分析で原稿を改善", icon: RefreshCw, color: "bg-orange-100 text-orange-600" },
          ].map((item) => (
            <div
              key={item.step}
              className="flex flex-col items-center text-center p-6 rounded-lg bg-white border shadow-sm"
            >
              <div className={`w-12 h-12 rounded-full ${item.color} flex items-center justify-center mb-3`}>
                <item.icon className="w-6 h-6" />
              </div>
              <div className="text-xs font-mono text-muted-foreground mb-1">STEP {item.step}</div>
              <h3 className="font-semibold text-sm mb-1">{item.title}</h3>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Team A & B */}
      <section className="max-w-6xl mx-auto px-4 pb-16">
        <h2 className="text-2xl font-bold text-center mb-8">2つのAIチーム</h2>
        <div className="grid grid-cols-2 gap-6">
          <Card className="border-2 border-blue-200 bg-blue-50/50">
            <CardHeader>
              <Badge className="w-fit mb-2">Team A</Badge>
              <CardTitle>新規原稿自動生成</CardTitle>
              <CardDescription>
                求人情報を入力するだけで、最新トレンドに基づいた求人原稿を3媒体分自動作成。
                8つのAIエージェントが連携して高品質な原稿を生成します。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1 mb-4">
                {["Manager", "Trend Research", "Analysis", "Reference", "Writing", "Thumbnail", "Fact Check", "Formatter"].map((a) => (
                  <Badge key={a} variant="outline" className="text-xs">{a}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-orange-200 bg-orange-50/50">
            <CardHeader>
              <Badge className="w-fit mb-2 bg-orange-100 text-orange-700 border-orange-200">Team B</Badge>
              <CardTitle>再掲載用原稿改善</CardTitle>
              <CardDescription>
                Team Aの原稿と掲載数値を基にAIが課題を分析。
                過去の改善履歴も参照し、データドリブンな改善提案を行います。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1 mb-4">
                {["Manager", "数値分析", "原稿分析", "テキスト改善", "デザイン改善", "予算最適化"].map((a) => (
                  <Badge key={a} variant="outline" className="text-xs">{a}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 対応媒体 */}
      <section className="max-w-6xl mx-auto px-4 pb-16">
        <h2 className="text-2xl font-bold text-center mb-8">対応媒体</h2>
        <div className="grid grid-cols-3 gap-6">
          {[
            { name: "Indeed", desc: "国内最大級の求人サイト。数値分析＋予算最適化に対応。", color: "bg-blue-50 border-blue-200" },
            { name: "AirWork", desc: "リクルート運営の採用管理ツール。数値分析に対応。", color: "bg-orange-50 border-orange-200" },
            { name: "JobMedley", desc: "医療・介護・福祉特化。原稿の定性分析に対応。", color: "bg-green-50 border-green-200" },
          ].map((p) => (
            <Card key={p.name} className={`border-2 ${p.color}`}>
              <CardHeader><CardTitle>{p.name}</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">{p.desc}</p></CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* 特徴 */}
      <section className="max-w-6xl mx-auto px-4 pb-20">
        <div className="grid grid-cols-3 gap-6">
          {[
            { icon: <Globe className="w-6 h-6 text-blue-600" />, title: "最新トレンド反映", desc: "Web検索で最新の求人トレンドを調査し、応募数が多い求人のパターンを分析して原稿に反映。" },
            { icon: <BarChart3 className="w-6 h-6 text-orange-600" />, title: "履歴ベースの改善", desc: "過去の作成・改善履歴と数値推移をAIが参照。回を重ねるごとに改善精度が向上します。" },
            { icon: <CheckCircle className="w-6 h-6 text-green-600" />, title: "Before/After比較", desc: "改善前後の原稿をフィールド単位で比較。変更理由付きで改善ポイントが一目でわかります。" },
          ].map((f) => (
            <Card key={f.title}>
              <CardHeader>
                <div className="mb-2">{f.icon}</div>
                <CardTitle className="text-lg">{f.title}</CardTitle>
              </CardHeader>
              <CardContent><CardDescription>{f.desc}</CardDescription></CardContent>
            </Card>
          ))}
        </div>
      </section>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        採用エージェント — Powered by Claude claude-sonnet-4-6
      </footer>
    </main>
  );
}
