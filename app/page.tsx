import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Check,
  FilePenLine,
  Gauge,
  ImageIcon,
  LineChart,
  Menu,
  Settings2,
  Sparkles,
} from "lucide-react";
import { Reveal } from "@/app/components/home/Reveal";

const START_HREF = "/login?next=/jobs";

const media = ["Indeed", "AirWork", "JobMedley", "ハローワーク"];

function BrandMark({ inverse = false }: { inverse?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5 font-bold tracking-tight">
      <span className="relative block h-8 w-7" aria-hidden>
        <i className="absolute left-[9px] top-0 h-2.5 w-2.5 rotate-45 rounded-[2px] bg-primary" />
        <i className="absolute bottom-[3px] left-[2px] h-3.5 w-3.5 rotate-45 rounded-[3px] bg-primary/75" />
        <i className="absolute bottom-[3px] right-0 h-3.5 w-3.5 rotate-45 rounded-[3px] bg-primary" />
      </span>
      <span className={inverse ? "text-white" : "text-[#20252b]"}>採用エージェント</span>
    </span>
  );
}

function PinkButton({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <Link href={START_HREF} className={`group inline-flex h-12 items-center justify-center gap-4 rounded-full bg-primary px-7 text-[14px] font-bold text-white shadow-[0_9px_24px_rgba(255,56,92,.22)] transition hover:-translate-y-0.5 hover:bg-[#e9214a] ${className}`}>
      {children}<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
    </Link>
  );
}

function OfficeScene() {
  return (
    <div className="relative h-[138px] overflow-hidden rounded-lg bg-[#f2f2f2]">
      <Image
        src="/images/landing/team-meeting.png"
        alt="明るいオフィスで求人内容を検討する採用チーム"
        fill
        sizes="190px"
        className="object-cover"
      />
    </div>
  );
}

function HeroDemo() {
  const fields = ["Webマーケティング（正社員）", "東京都渋谷区", "正社員", "450万円〜600万円"];
  return (
    <div className="relative rounded-[18px] border border-[#e7e1df] bg-white shadow-[0_20px_55px_rgba(56,30,33,.15)]">
      <div className="flex h-14 items-center gap-3 border-b border-[#eee9e8] px-5">
        <BrandMark />
        <span className="ml-4 text-sm font-bold">新しい求人を作成</span>
      </div>
      <div className="grid min-h-[380px] grid-cols-[125px_1fr] sm:grid-cols-[150px_1fr]">
        <aside className="border-r border-[#eee9e8] px-3 py-5 text-[12px] text-gray-500 sm:px-4">
          {[
            [Gauge, "求人管理"], [Menu, "事業所・求人一覧"], [FilePenLine, "新規原稿作成"], [LineChart, "ブラッシュアップ"], [ImageIcon, "参考画像"], [Settings2, "設定"],
          ].map(([Icon, label], i) => {
            const I = Icon as typeof Gauge;
            return <div key={label as string} className={`mb-2 flex items-center gap-2 rounded-md px-2 py-2 ${i === 2 ? "bg-[#fff0f3] font-bold text-primary" : ""}`}><I className="h-3.5 w-3.5" />{label as string}</div>;
          })}
        </aside>
        <div className="min-w-0 p-4 sm:p-5">
          <div className="mb-5 flex items-center justify-between text-[11px] font-bold text-gray-400">
            {["基本情報", "求人内容", "媒体選択", "確認・保存"].map((step, i) => <span key={step} className={`flex items-center gap-1 ${i === 0 ? "text-primary" : ""}`}><b className={`inline-grid h-4 w-4 place-items-center rounded-full border ${i === 0 ? "border-primary" : "border-gray-300"}`}>{i + 1}</b><em className="hidden not-italic sm:inline">{step}</em></span>)}
          </div>
          <div className="grid gap-4 lg:grid-cols-[1fr_190px]">
            <div>
              <p className="mb-2 text-[13px] font-bold">職種</p>
              {fields.map((field, i) => <div key={field} className="mb-2 rounded-md border border-[#e8e4e2] px-3 py-2 text-[12px] text-gray-600"><span className="block text-[10px] text-gray-400">{["職種名", "勤務地", "雇用形態", "給与"][i]}</span>{field}</div>)}
              <div className="mt-3 rounded-lg border border-[#ffd5dd] bg-[#fff8f9] p-3">
                <p className="text-[12px] font-bold">AIアシストで魅力的な原稿を作成</p>
                <p className="mt-1 text-[10px] leading-4 text-gray-500">入力内容から応募につながる原稿を自動生成します。</p>
                <button className="mt-2 rounded bg-primary px-3 py-1.5 text-[11px] font-bold text-white">AIで原稿を生成する</button>
              </div>
            </div>
            <div className="rounded-lg border border-[#ebe5e3] bg-[#fffdfd] p-3">
              <p className="mb-2 text-[11px] font-bold">プレビュー（例）</p>
              <OfficeScene />
              <p className="mt-3 text-[13px] font-bold leading-5">媒体の項目に合わせた求人原稿を生成</p>
              <div className="mt-2 space-y-1 text-[10px] text-gray-600">{["入力情報から訴求ポイントを整理", "媒体ごとの形式・文字数に対応", "原稿とサムネイルをまとめて確認"].map(x => <p key={x} className="flex gap-1"><Check className="h-3 w-3 text-[#25ba83]" />{x}</p>)}</div>
              <button className="mt-3 w-full rounded-full bg-primary py-2 text-[11px] font-bold text-white">生成結果を確認する</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MediaLogos({ compact = false }: { compact?: boolean }) {
  return <div className={`grid ${compact ? "grid-cols-2 gap-2" : "grid-cols-2 gap-3 sm:grid-cols-4"}`}>{media.map((item, i) => <div key={item} className={`grid place-items-center rounded-lg border border-[#ece8e6] bg-white font-bold shadow-[0_2px_6px_rgba(34,20,22,.025)] ${compact ? "h-12 px-2 text-[11px]" : "h-[76px] px-3 text-[14px]"} ${[0,3].includes(i) ? "text-[#1860a8]" : "text-[#ef3153]"}`}>{item}</div>)}</div>;
}

function MiniEditor() {
  return (
    <div className="relative rounded-xl border border-[#e9e3e1] bg-white p-4 shadow-[0_12px_30px_rgba(70,42,45,.1)] sm:p-6">
      <div className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-[#eee9e7] pb-3 text-[11px] font-bold"><span>求人を作成</span>{[1,2,3,4].map((n) => <span key={n} className={n === 1 ? "text-primary" : "text-gray-400"}>◯ {n === 1 ? "基本情報" : n === 2 ? "求人内容" : n === 3 ? "媒体選択" : "確認"}</span>)}</div>
      <div className="grid grid-cols-[90px_1fr] gap-4">
        <div className="space-y-2">{[1,2,3,4].map(n => <div key={n} className={`h-8 rounded border ${n === 2 ? "border-[#ffc4cf] bg-[#fff6f8]" : "border-[#eee] bg-[#fafafa]"}`} />)}</div>
        <div><div className="mb-3 h-9 rounded border border-[#e9e5e3]" /><div className="h-20 rounded border border-[#e9e5e3] bg-[#fdfcfc] p-3"><div className="h-2 w-4/5 rounded bg-gray-100" /><div className="mt-2 h-2 w-3/5 rounded bg-gray-100" /></div></div>
      </div>
      <div className="absolute -right-2 -top-2 grid h-9 w-9 place-items-center rounded-full border border-[#b7dcf4] bg-white text-[#4aa3dd] shadow"><Sparkles className="h-4 w-4" /></div>
    </div>
  );
}

function Portrait({ index }: { index: number }) {
  return (
    <div className="relative min-h-[220px] w-[40%] shrink-0 overflow-hidden rounded-l-xl bg-gray-100">
      <Image
        src={`/images/landing/customer-0${index + 1}.png`}
        alt="採用エージェントの活用イメージ"
        fill
        sizes="(max-width: 1024px) 40vw, 160px"
        className="object-cover object-top"
      />
    </div>
  );
}

export default function Home() {
  const pains = [
    ["/images/landing/icons/pain-repeated-entry.png", "同じ求人情報を何度も入力している", "共通の求人情報を一度入力し、選択した媒体向けの原稿をまとめて作成します。"],
    ["/images/landing/icons/pain-media-rewrite.png", "媒体ごとの書き分けが難しい", "媒体固有の項目や文字数を踏まえ、訴求ポイントを原稿へ落とし込みます。"],
    ["/images/landing/icons/pain-job-image.png", "求人に合う画像も用意したい", "求人情報や参考画像をもとに、媒体別のサムネイルを生成します。"],
    ["/images/landing/icons/pain-improvement.png", "掲載後の改善方法が分からない", "掲載数値と過去原稿を参照し、課題・改善差分・次の施策を提示します。"],
  ] as const;
  const features = [
    ["/images/landing/icons/feature-trends.png", "求人トレンドを調査", "職種・業種・地域の傾向を調べ、原稿の訴求設計に活用します。"],
    ["/images/landing/icons/feature-four-media.png", "4媒体向けに原稿作成", "媒体ごとの項目・表現・文字数に合わせて、求人原稿を書き分けます。"],
    ["/images/landing/icons/feature-thumbnail.png", "サムネイルも同時生成", "求人内容と参考画像をもとに、媒体別のビジュアルを作成します。"],
    ["/images/landing/icons/feature-improve.png", "掲載結果から改善", "表示・クリック・応募などの数値と原稿を分析し、改善差分を提示します。"],
  ] as const;
  return (
    <main className="overflow-x-clip bg-white text-[#252a30]">
      <header className="mx-auto flex h-[72px] max-w-[1200px] items-center justify-between px-5 lg:px-8">
        <Link href="/" className="text-[15px]"><BrandMark /></Link>
        <nav className="hidden items-center gap-9 text-[14px] font-bold lg:flex"><a href="#product">できること</a><a href="#flow">作成の流れ</a><a href="#features">機能</a><a href="#media">対応媒体</a><a href="#use-cases">活用例</a></nav>
        <div className="flex items-center gap-5"><Link href="/login" className="hidden text-[14px] font-bold sm:block">ログイン</Link><PinkButton className="h-10 px-5 text-[13px]">求人原稿を作成する</PinkButton></div>
      </header>

      <section className="relative overflow-hidden bg-[radial-gradient(circle_at_18%_72%,#fff3f1_0,transparent_30%),radial-gradient(circle_at_90%_38%,#fff0f4_0,transparent_28%)]">
        <div className="relative z-10 mx-auto grid max-w-[1200px] items-center gap-10 px-5 pb-24 pt-14 lg:grid-cols-[.78fr_1.22fr] lg:px-8 lg:pb-20 lg:pt-20">
          <div className="lp-fade-up">
            <p className="text-[17px] font-bold tracking-[.13em] text-primary">入力から改善まで、ひとつの流れで。</p>
            <h1 className="mt-6 text-[42px] font-black leading-[1.35] tracking-[-.05em] sm:text-[52px]">媒体ごとの求人原稿を、<br />AIで<span className="text-primary">まとめて作成。</span></h1>
            <p className="mt-6 max-w-[520px] text-[15px] font-medium leading-8 text-gray-600">テキスト・求人票・参考URLから求人情報を整理し、Indeed、AirWork、JobMedley、ハローワーク向けの原稿とサムネイルを生成。掲載後は数値と履歴をもとに、次の原稿を改善できます。</p>
            <div className="mt-7 flex flex-wrap gap-3"><PinkButton>求人原稿を作成する</PinkButton><a href="#product" className="inline-flex h-12 items-center gap-3 rounded-full border border-[#bbb] bg-white px-6 text-[14px] font-bold">できることを見る <ArrowRight className="h-4 w-4" /></a></div>
            <div className="mt-9 grid max-w-[500px] grid-cols-3 gap-2 text-center">{[["4媒体", "媒体別原稿", "に対応"], ["AI入力", "テキスト・画像・PDF・URL", "を解析"], ["履歴活用", "掲載結果と過去原稿", "から改善"]].map(([num,label,unit]) => <div key={label}><p className="text-[11px] text-gray-500">{label}</p><p className="mt-1 text-[22px] font-black text-primary">{num}</p><small className="text-[11px] text-gray-500">{unit}</small></div>)}</div>
          </div>
          <div className="lp-fade-up min-w-0" style={{ animationDelay: "120ms" }}><HeroDemo /></div>
        </div>
        <div className="absolute -bottom-5 right-0 h-20 w-[42%] -skew-y-6 bg-primary/35" /><div className="absolute -bottom-10 right-0 h-20 w-[31%] -skew-y-3 bg-primary/60" />
      </section>

      <section className="border-b border-[#eee9e7] bg-white py-10">
        <div className="mx-auto max-w-[1120px] px-5"><h2 className="text-center text-[20px] font-bold">求人原稿の作成と改善を、ひとつの場所で</h2><div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{pains.map(([iconSrc,title,body]) => <article key={title} className="rounded-xl border border-[#e8e3e1] bg-white px-5 py-6 text-center shadow-[0_4px_12px_rgba(50,29,32,.045)]"><Image src={iconSrc} alt="" width={112} height={112} aria-hidden className="mx-auto h-14 w-14 object-contain" /><h3 className="mt-4 text-[14px] font-bold">{title}</h3><p className="mt-2 text-[12px] leading-6 text-gray-500">{body}</p></article>)}</div></div>
      </section>

      <section id="product" className="scroll-mt-8 py-16 sm:py-20">
        <div className="mx-auto grid max-w-[1240px] items-center gap-7 px-5 lg:grid-cols-[.72fr_.58fr_1.4fr_.62fr]">
          <Reveal><div><p className="text-[12px] font-bold tracking-[.15em] text-primary">PRODUCT</p><h2 className="mt-4 text-[30px] font-black leading-[1.5]">一度の入力から、<br />4媒体向けの原稿へ。</h2><p className="mt-4 text-[14px] leading-7 text-gray-600">共通の求人情報をもとに、選択した媒体の入力項目や表現ルールに合わせて原稿を生成します。必要な媒体だけを選んで作成できます。</p><a href="#flow" className="mt-6 inline-flex items-center gap-4 rounded-full border border-gray-300 px-5 py-3 text-[13px] font-bold">作成の流れを見る <ArrowRight className="h-4 w-4" /></a></div></Reveal>
          <Reveal delay={60}><div className="grid gap-3">{["AIかんたん入力", "参考情報を活用", "媒体別サムネイル"].map((x, i) => <div key={x} className="rounded-lg border border-[#ffbdca] bg-[#fffafa] p-4 text-[12px]"><b>{x}</b><p className="mt-1 text-[11px] leading-5 text-gray-500">{i === 0 ? "テキスト・画像・PDF・URLを解析" : i === 1 ? "既存原稿やシステム参考原稿を参照" : "求人内容と参考画像から生成"}</p></div>)}</div></Reveal>
          <Reveal delay={100}><MiniEditor /></Reveal>
          <Reveal delay={140}><div><p className="mb-3 rounded-lg border border-[#ffbdca] bg-[#fffafa] p-3 text-center text-[12px] font-bold text-primary">選択した媒体の原稿を生成</p><MediaLogos compact /></div></Reveal>
        </div>
      </section>

      <section id="flow" className="scroll-mt-8 border-y border-[#eee9e7] bg-[#fffdfc] py-8">
        <div className="mx-auto grid max-w-[1160px] gap-8 px-5 lg:grid-cols-[230px_1fr]"><div className="self-center"><p className="text-[11px] font-bold tracking-[.12em] text-primary">HOW IT WORKS</p><h2 className="mt-3 text-[25px] font-black leading-9">求人作成から改善まで<br />3つのステップ</h2></div><div className="grid gap-5 sm:grid-cols-3">{[["/images/landing/icons/flow-register.png","求人情報を登録","テキスト、求人票、参考URLを入力。AI解析またはフォームで求人情報を整えます。"],["/images/landing/icons/flow-write.png","媒体別原稿を作成","出力する媒体を選ぶと、原稿と媒体別サムネイルをまとめて生成します。"],["/images/landing/icons/flow-improve.png","掲載結果から改善","表示・クリック・応募などの数値と過去原稿をもとに、改善案を作成します。"]].map(([iconSrc,title,body],i) => <article key={title} className="relative rounded-xl border border-[#e9e4e2] bg-white p-5"><span className="absolute left-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-primary text-[12px] font-bold text-white">0{i+1}</span><Image src={iconSrc} alt="" width={144} height={144} aria-hidden className="mx-auto mt-1 h-[72px] w-[72px] object-contain" /><h3 className="mt-3 text-[14px] font-bold">{title}</h3><p className="mt-2 text-[12px] leading-5 text-gray-500">{body}</p>{i<2&&<ArrowRight className="absolute -right-5 top-1/2 z-10 hidden h-4 w-4 text-primary sm:block" />}</article>)}</div></div>
      </section>

      <section id="features" className="bg-[#282c30] py-8 text-white sm:py-10">
        <div className="mx-auto grid max-w-[1160px] gap-8 px-5 lg:grid-cols-[230px_1fr]"><div className="self-center"><p className="text-[11px] font-bold tracking-[.15em] text-[#ff92a6]">FEATURES</p><h2 className="mt-3 text-[25px] font-black leading-9">原稿の品質と改善を<br />支える機能</h2><p className="mt-3 text-[12px] leading-6 text-gray-300">求人情報を原稿へ変換するだけでなく、調査・確認・画像作成・掲載後の改善まで支援します。</p></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{features.map(([iconSrc,title,body]) => <article key={title} className="rounded-xl border border-white/30 bg-white/[.02] px-4 py-6 text-center"><Image src={iconSrc} alt="" width={128} height={128} aria-hidden className="mx-auto h-16 w-16 object-contain" /><h3 className="mt-4 text-[14px] font-bold">{title}</h3><p className="mt-2 text-[12px] leading-6 text-gray-300">{body}</p></article>)}</div></div>
      </section>

      <section id="media" className="scroll-mt-8 py-10 sm:py-14"><div className="mx-auto max-w-[1160px] px-5"><p className="text-[11px] font-bold tracking-[.15em] text-primary">MEDIA</p><h2 className="mt-2 text-[24px] font-black">4つの求人媒体向けに出力</h2><p className="mt-2 text-[13px] text-gray-500">選択した媒体の項目構成・文字数・表現ルールを踏まえて、原稿を生成します。</p><div className="mt-7"><MediaLogos /></div></div></section>

      <section id="use-cases" className="scroll-mt-8 bg-[linear-gradient(105deg,#fff9f8,#fff)] py-12"><div className="mx-auto max-w-[1160px] px-5"><p className="text-[11px] font-bold tracking-[.15em] text-primary">USE CASES</p><h2 className="mt-2 text-[24px] font-black">採用業務での活用例</h2><div className="mt-7 grid gap-4 lg:grid-cols-3">{[["新しい求人を立ち上げるとき","求人票や会社情報から、必要項目を整理したい","テキスト・画像・PDF・参考URLをAIが解析し、求人情報の入力を支援します。"],["複数媒体へ掲載するとき","同じ求人を媒体ごとに書き分けたい","共通情報から、Indeed・AirWork・JobMedley・ハローワーク向けの原稿を生成します。"],["掲載後に見直すとき","数値を見ても、直すべき箇所が分からない","掲載数値と過去原稿を分析し、変更前後の差分と改善理由を確認できます。"]].map(([scene,title,body],i)=><article key={scene} className="flex min-h-[220px] overflow-hidden rounded-xl border border-[#e7e2df] bg-white shadow-[0_4px_12px_rgba(50,29,32,.04)]"><Portrait index={i}/><div className="p-5"><p className="text-[11px] font-bold text-primary">{scene}</p><h3 className="mt-4 text-[15px] font-bold leading-6">{title}</h3><p className="mt-3 text-[12px] leading-5 text-gray-500">{body}</p></div></article>)}</div></div></section>

      <section className="bg-[#fffafa] pb-8"><div className="mx-auto max-w-[1160px] px-5"><div className="overflow-hidden rounded-xl bg-[linear-gradient(110deg,#ff657d,#ff224e)] text-white shadow-[0_12px_30px_rgba(255,56,92,.22)]"><div className="grid items-center gap-5 px-7 py-7 sm:grid-cols-[1.15fr_.85fr_.6fr]"><div><h2 className="text-[22px] font-bold">最初の求人原稿を作成する</h2><p className="mt-2 text-[13px] leading-6 text-white/85">ログイン後、事業所と求人を登録してください。<br />求人情報の入力から媒体別原稿の生成へ進めます。</p></div><PinkButton className="w-full bg-[#252a30] text-white shadow-none hover:bg-[#353b42]">求人原稿を作成する</PinkButton><div className="hidden h-24 rounded-t-lg border-4 border-b-0 border-white/60 bg-white/95 p-2 sm:block"><div className="h-2 w-1/3 rounded bg-[#ffd8df]"/><div className="mt-2 h-2 w-4/5 rounded bg-gray-100"/><div className="mt-2 h-9 rounded bg-[#fff0f3]"/></div></div></div></div></section>

      <footer className="bg-white py-9"><div className="mx-auto grid max-w-[1160px] gap-8 px-5 text-[12px] text-gray-500 sm:grid-cols-[1.2fr_2fr_.4fr]"><div><BrandMark /><p className="mt-3 leading-6">求人情報の入力から媒体別原稿・サムネイルの作成、<br />掲載結果を使った改善まで支援します。</p></div><div className="grid grid-cols-3 gap-4 leading-7"><div><b className="text-gray-800">求人作成</b><p>AIかんたん入力<br/>媒体別原稿<br/>サムネイル生成<br/>作成履歴</p></div><div><b className="text-gray-800">ブラッシュアップ</b><p>掲載数値の分析<br/>改善差分<br/>課題サマリー<br/>予算提案（Indeed）</p></div><div><b className="text-gray-800">対応媒体</b><p>Indeed<br/>AirWork<br/>JobMedley<br/>ハローワーク</p></div></div><p className="self-end text-right">© 2026 HR Agent Inc.</p></div></footer>
    </main>
  );
}
