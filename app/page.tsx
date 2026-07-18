import Link from "next/link";
import {
  ArrowDownRight,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Check,
  FileText,
  Layers3,
  PenLine,
  SearchCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductPreview } from "@/app/components/home/ProductPreview";
import { Reveal } from "@/app/components/home/Reveal";

const START_HREF = "/login?next=/jobs";

const platforms = [
  { name: "Indeed", sub: "インディード", color: "bg-[#2557a7]" },
  { name: "AirWork", sub: "エアワーク", color: "bg-[#fc642d]" },
  { name: "JobMedley", sub: "ジョブメドレー", color: "bg-[#008489]" },
  { name: "HelloWork", sub: "ハローワーク", color: "bg-[#d93a5f]" },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-clip bg-[#fffdfb] text-gray-900">
      <header className="relative z-20 mx-auto flex h-20 max-w-[1180px] items-center justify-between px-6 lg:px-8">
        <Link href="/" className="group flex items-center gap-2.5" aria-label="採用エージェント ホーム">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-[11px] bg-gray-900 text-sm font-bold text-white shadow-sm transition-transform group-hover:-rotate-3">
            採
          </span>
          <span className="text-[15px] font-bold tracking-tight">採用エージェント</span>
        </Link>

        <nav className="hidden items-center gap-7 text-[13px] font-medium text-gray-600 md:flex" aria-label="メインナビゲーション">
          <a href="#value" className="transition-colors hover:text-gray-950">できること</a>
          <a href="#outputs" className="transition-colors hover:text-gray-950">出力サンプル</a>
          <a href="#platforms" className="transition-colors hover:text-gray-950">対応媒体</a>
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/login" className="hidden text-[13px] font-semibold text-gray-700 transition-colors hover:text-primary sm:block">
            ログイン
          </Link>
          <Link href={START_HREF}>
            <Button size="sm" className="h-10 rounded-full px-4 text-[13px] font-bold shadow-sm hover:-translate-y-0.5 sm:px-5">
              <span className="hidden sm:inline">求人原稿を作成する</span>
              <span className="sm:hidden">はじめる</span>
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </header>

      <section className="relative">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[660px] overflow-hidden" aria-hidden>
          <div className="absolute left-1/2 top-[-330px] h-[670px] w-[1000px] -translate-x-1/2 rounded-full bg-[#ffe4e8] blur-3xl" />
          <div className="absolute right-[-130px] top-[170px] h-[280px] w-[280px] rounded-full bg-[#f7efff] blur-3xl" />
          <div className="absolute left-[-80px] top-[350px] h-[220px] w-[220px] rounded-full bg-[#fff0d9] blur-3xl" />
          <div className="absolute inset-x-0 top-0 h-[510px] bg-[radial-gradient(rgba(34,34,34,0.09)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:linear-gradient(to_bottom,black,transparent)]" />
        </div>

        <div className="relative z-10 mx-auto grid max-w-[1180px] items-center gap-12 px-6 pb-20 pt-14 lg:grid-cols-[minmax(0,0.95fr)_minmax(500px,1.05fr)] lg:px-8 lg:pb-28 lg:pt-24">
          <div>
            <div className="lp-fade-up inline-flex items-center gap-2 rounded-full border border-[#f1c9cf] bg-white/80 px-3.5 py-1.5 text-[11px] font-bold tracking-[0.08em] text-[#b8334d] shadow-sm backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" />
              RECRUITING COPY, REIMAGINED
            </div>
            <h1 className="lp-fade-up mt-6 font-serif text-[3.2rem] font-black leading-[1.02] tracking-[-0.075em] text-gray-950 sm:text-[4.25rem]" style={{ animationDelay: "90ms" }}>
              「伝わる求人」は、
              <br />
              つくれる。
            </h1>
            <p className="lp-fade-up mt-7 max-w-[490px] text-[15px] leading-8 text-gray-600 sm:text-[16px]" style={{ animationDelay: "180ms" }}>
              事業所と職種を入力するだけ。求人原稿の作成から媒体ごとの最適化、掲載後の改善まで、採用業務をひとつの流れで進められます。
            </p>
            <div className="lp-fade-up mt-8 flex flex-wrap gap-3" style={{ animationDelay: "260ms" }}>
              <Link href={START_HREF}>
                <Button size="lg" className="h-13 rounded-full px-7 text-[15px] font-bold shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg">
                  求人原稿を作成する
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <a href="#outputs">
                <Button variant="outline" size="lg" className="h-13 rounded-full border-gray-300 bg-white/80 px-6 text-[15px] font-bold hover:border-gray-900 hover:bg-white">
                  出力サンプルを見る
                  <ArrowDownRight className="ml-2 h-4 w-4" />
                </Button>
              </a>
            </div>
            <div className="lp-fade-up mt-7 flex flex-wrap gap-x-5 gap-y-2 text-[12px] text-gray-500" style={{ animationDelay: "340ms" }}>
              {[
                "原稿・サムネイルをまとめて作成",
                "主要4媒体に合わせて出力",
              ].map((item) => (
                <span key={item} className="inline-flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-[#008489]" strokeWidth={3} />
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="lp-fade-up relative lg:pl-4" style={{ animationDelay: "180ms" }}>
            <div className="absolute -left-2 top-[12%] hidden rounded-full border border-[#eadfd5] bg-white px-3 py-2 text-[11px] font-bold text-gray-600 shadow-md xl:block">
              <BadgeCheck className="mr-1.5 inline h-3.5 w-3.5 text-[#008489]" />
              ファクトチェック
            </div>
            <div className="absolute -right-7 bottom-[16%] hidden rounded-full border border-[#eadfd5] bg-white px-3 py-2 text-[11px] font-bold text-gray-600 shadow-md xl:block">
              <Layers3 className="mr-1.5 inline h-3.5 w-3.5 text-primary" />
              4媒体へ出力
            </div>
            <ProductPreview />
          </div>
        </div>
      </section>

      <section id="value" className="scroll-mt-12 border-y border-[#e8e4df] bg-white">
        <div className="mx-auto grid max-w-[1180px] divide-y divide-[#e8e4df] px-6 md:grid-cols-3 md:divide-x md:divide-y-0 lg:px-8">
          {[
            { number: "01", title: "必要な情報だけ入力", body: "事業所・職種・雇用条件を登録。すでにある求人票も、作成の材料として活用できます。", icon: PenLine },
            { number: "02", title: "媒体ごとに整えて出力", body: "各媒体の形式や文字数に合わせて、同じ求人情報から原稿をつくり分けます。", icon: FileText },
            { number: "03", title: "掲載後も、次の一手へ", body: "掲載数値と過去の履歴を踏まえ、改善のポイントと変更案を確認できます。", icon: TrendingUp },
          ].map((item) => (
            <article key={item.number} className="group px-0 py-8 md:px-8 md:py-10 first:md:pl-0 last:md:pr-0">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] font-bold tracking-[0.18em] text-primary">{item.number}</span>
                <item.icon className="h-5 w-5 text-gray-300 transition-colors group-hover:text-primary" />
              </div>
              <h2 className="mt-5 text-[17px] font-bold tracking-tight">{item.title}</h2>
              <p className="mt-2.5 text-[13px] leading-6 text-gray-500">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="outputs" className="scroll-mt-12 bg-[#f7f3ed] py-20 sm:py-28">
        <div className="mx-auto max-w-[1180px] px-6 lg:px-8">
          <Reveal>
            <div className="max-w-2xl">
              <p className="text-[11px] font-bold tracking-[0.16em] text-primary">WHAT YOU RECEIVE</p>
              <h2 className="mt-3 font-serif text-3xl font-black tracking-[-0.055em] text-gray-950 sm:text-[2.6rem]">一度の入力から、掲載までに必要なものを。</h2>
              <p className="mt-4 text-[15px] leading-7 text-gray-600">原稿のたたき台だけで終わりません。求人の魅力を伝える見せ方まで、媒体ごとの形に整えます。</p>
            </div>
          </Reveal>

          <Reveal delay={100}>
            <div className="mt-11 overflow-hidden rounded-[28px] border border-[#e3dbd2] bg-white shadow-[0_25px_70px_rgba(71,50,34,0.11)]">
              <div className="flex items-center justify-between border-b border-[#eee8e1] px-5 py-4 sm:px-7">
                <div className="flex items-center gap-2.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#ff8c86]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#ffd269]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#74cfa4]" />
                  <span className="ml-2 text-[11px] font-medium text-gray-400">出力サンプル — 介護スタッフ</span>
                </div>
                <span className="hidden rounded-full bg-[#fff0f3] px-3 py-1 text-[10px] font-bold text-primary sm:inline">SAMPLE</span>
              </div>
              <div className="grid lg:grid-cols-[205px_minmax(0,1fr)]">
                <aside className="border-b border-[#eee8e1] bg-[#fffdfb] p-5 lg:border-b-0 lg:border-r lg:p-6">
                  <p className="text-[10px] font-bold tracking-[0.15em] text-gray-400">GENERATED ASSETS</p>
                  <div className="mt-4 space-y-1">
                    {["求人原稿", "サムネイル", "媒体別フォーマット", "改善メモ"].map((item, index) => (
                      <div key={item} className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-[12px] ${index === 0 ? "bg-[#fff0f3] font-bold text-gray-900" : "text-gray-500"}`}>
                        {index === 0 ? <Check className="h-3.5 w-3.5 text-primary" strokeWidth={3} /> : <span className="h-3.5 w-3.5 rounded-full border border-gray-300" />}
                        {item}
                      </div>
                    ))}
                  </div>
                  <div className="mt-7 hidden rounded-xl bg-gray-900 p-4 text-white lg:block">
                    <p className="text-[10px] font-bold tracking-[0.13em] text-white/50">QUALITY CHECK</p>
                    <p className="mt-2 text-[12px] leading-5">表現・条件・根拠を見直してから、出力します。</p>
                  </div>
                </aside>
                <div className="p-5 sm:p-8">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold tracking-[0.14em] text-gray-400">JOB COPY</p>
                      <h3 className="mt-1 text-[18px] font-bold tracking-tight">【賞与年2回】介護スタッフ／未経験OK</h3>
                    </div>
                    <span className="rounded-full border border-[#b9dfd1] bg-[#effaf6] px-3 py-1.5 text-[11px] font-bold text-[#007766]">確認済み</span>
                  </div>
                  <div className="mt-5 rounded-2xl border border-[#eee8e1] bg-[#fffdfb] p-5">
                    <p className="text-[13px] font-bold leading-6">残業は月平均5時間以下。家庭と両立しながら働ける、介護スタッフの募集です。</p>
                    <p className="mt-3 text-[13px] leading-6 text-gray-600">資格取得支援あり。未経験から始めた先輩も多く、業務は段階的にお任せします。駅から徒歩5分の事業所です。</p>
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-[1.2fr_1fr]">
                    <div className="overflow-hidden rounded-xl bg-gradient-to-br from-[#37232b] via-[#a23751] to-[#f58b87] p-4 text-white">
                      <p className="text-[9px] font-bold tracking-[0.15em] text-white/65">THUMBNAIL SAMPLE</p>
                      <p className="mt-5 text-[18px] font-bold leading-tight">未経験から、
                        <br />介護の仕事へ。</p>
                    </div>
                    <div className="rounded-xl border border-[#eee8e1] p-4">
                      <p className="text-[9px] font-bold tracking-[0.15em] text-gray-400">READY TO EXPORT</p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {platforms.map((platform) => (
                          <span key={platform.name} className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 px-2.5 py-1.5 text-[10px] font-bold text-gray-600">
                            <span className={`h-1.5 w-1.5 rounded-full ${platform.color}`} />
                            {platform.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-12 bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-[1180px] px-6 lg:px-8">
          <Reveal>
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
              <div>
                <p className="text-[11px] font-bold tracking-[0.16em] text-primary">HOW IT WORKS</p>
                <h2 className="mt-3 font-serif text-3xl font-black tracking-[-0.055em] text-gray-950 sm:text-[2.6rem]">求人をひとつ、前へ進める。</h2>
              </div>
              <p className="max-w-sm text-[14px] leading-6 text-gray-500">作成と改善を切り離さず、同じ求人の履歴として積み上げます。</p>
            </div>
          </Reveal>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              { step: "01", title: "求人を登録する", body: "事業所・職種・雇用条件を入力。既存の求人票を参考にすることもできます。", icon: PenLine },
              { step: "02", title: "原稿を受け取る", body: "原稿、サムネイル、媒体ごとの出力を確認し、掲載準備を進めます。", icon: Sparkles },
              { step: "03", title: "掲載後に改善する", body: "応募・クリックなどの数値をもとに、次の掲載に向けた改善案を確認します。", icon: BarChart3 },
            ].map((item, index) => (
              <Reveal key={item.step} delay={(index + 1) * 90}>
                <article className="relative h-full overflow-hidden rounded-2xl border border-[#e8e4df] bg-[#fffdfb] p-7 transition-transform hover:-translate-y-1 hover:shadow-lg">
                  <span className="absolute right-5 top-4 font-serif text-6xl font-black tracking-[-0.1em] text-[#f3eee8]">{item.step}</span>
                  <div className="relative flex h-11 w-11 items-center justify-center rounded-full bg-[#fff0f3] text-primary"><item.icon className="h-5 w-5" /></div>
                  <h3 className="relative mt-7 text-[17px] font-bold tracking-tight">{item.title}</h3>
                  <p className="relative mt-2.5 text-[13px] leading-6 text-gray-500">{item.body}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gray-950 py-20 text-white sm:py-28">
        <div className="mx-auto grid max-w-[1180px] gap-12 px-6 lg:grid-cols-[0.82fr_1.18fr] lg:px-8">
          <Reveal>
            <div>
              <p className="text-[11px] font-bold tracking-[0.16em] text-[#ff9caf]">BUILT FOR CONFIDENCE</p>
              <h2 className="mt-3 font-serif text-3xl font-black leading-tight tracking-[-0.055em] sm:text-[2.5rem]">生成するだけで、
                <br />終わらせない。</h2>
              <p className="mt-5 max-w-sm text-[14px] leading-7 text-gray-300">求人原稿は、公開してからも育てていくもの。採用エージェントは、作成の前後にある確認と改善の工程まで支えます。</p>
            </div>
          </Reveal>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { icon: SearchCheck, title: "トレンドを調べる", body: "求人市場の動きや表現の傾向を、原稿づくりの材料にします。" },
              { icon: BadgeCheck, title: "事実を確認する", body: "入力された条件と原稿を照らし合わせ、確認が必要な点を見つけます。" },
              { icon: TrendingUp, title: "履歴から学ぶ", body: "過去の原稿と掲載結果を参照し、次の改善へつなげます。" },
            ].map((item) => (
              <Reveal key={item.title} delay={100}>
                <article className="h-full rounded-2xl border border-white/15 bg-white/[0.06] p-5 backdrop-blur-sm">
                  <item.icon className="h-5 w-5 text-[#ff9caf]" />
                  <h3 className="mt-8 text-[15px] font-bold">{item.title}</h3>
                  <p className="mt-2 text-[12px] leading-6 text-gray-300">{item.body}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="platforms" className="scroll-mt-12 bg-[#fffdfb] py-20 sm:py-24">
        <div className="mx-auto max-w-[1180px] px-6 lg:px-8">
          <Reveal>
            <div className="text-center">
              <p className="text-[11px] font-bold tracking-[0.16em] text-primary">PLATFORMS</p>
              <h2 className="mt-3 font-serif text-3xl font-black tracking-[-0.055em] text-gray-950">主要4媒体へ、それぞれの形で。</h2>
            </div>
          </Reveal>
          <div className="mt-10 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {platforms.map((platform, index) => (
              <Reveal key={platform.name} delay={index * 70}>
                <div className="rounded-xl border border-[#e8e4df] bg-white px-5 py-5">
                  <div className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${platform.color}`} /><span className="text-[14px] font-bold">{platform.name}</span></div>
                  <p className="mt-2 text-[11px] text-gray-400">{platform.sub}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#fffdfb] pb-20 sm:pb-28">
        <div className="mx-auto max-w-[1180px] px-6 lg:px-8">
          <Reveal>
            <div className="relative overflow-hidden rounded-[30px] bg-primary px-7 py-14 text-center text-white sm:px-12 sm:py-20">
              <div className="absolute -left-24 -top-28 h-72 w-72 rounded-full bg-white/15 blur-2xl" aria-hidden />
              <div className="absolute -bottom-36 -right-14 h-80 w-80 rounded-full bg-[#a50e2e]/50 blur-3xl" aria-hidden />
              <div className="relative mx-auto max-w-xl">
                <p className="text-[11px] font-bold tracking-[0.16em] text-white/70">START WITH ONE JOB</p>
                <h2 className="mt-4 font-serif text-3xl font-black tracking-[-0.055em] sm:text-[2.65rem]">最初の求人原稿から、
                  <br />採用を変えていく。</h2>
                <p className="mt-5 text-[14px] leading-7 text-white/85">まずはひとつの求人を登録して、採用エージェントの出力を確かめてください。</p>
                <Link href={START_HREF} className="mt-8 inline-block">
                  <Button size="lg" className="h-13 rounded-full bg-white px-7 text-[15px] font-bold text-primary shadow-lg hover:bg-[#fff1f3]">
                    求人原稿を作成する
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <footer className="border-t border-[#e8e4df] bg-white py-8">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-4 px-6 text-[12px] text-gray-400 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <div className="flex items-center gap-2"><span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-gray-900 text-[9px] font-bold text-white">採</span><span className="font-medium text-gray-600">採用エージェント</span></div>
          <div className="flex gap-4"><a href="#platforms" className="hover:text-gray-800">対応媒体</a><Link href="/login" className="hover:text-gray-800">ログイン</Link></div>
        </div>
      </footer>
    </main>
  );
}
