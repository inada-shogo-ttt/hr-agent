import { Check, FileText, Sparkles } from "lucide-react";

const platforms = ["Indeed", "AirWork", "JobMedley", "HelloWork"];

export function ProductPreview() {
  return (
    <div className="relative overflow-hidden rounded-[26px] border border-[#e4dcd4] bg-white shadow-[0_24px_70px_rgba(57,38,32,0.16)]">
      <div className="flex items-center gap-2 border-b border-[#eee8e2] bg-[#fffdfb] px-5 py-3.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff8c86]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#ffd269]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#74cfa4]" />
        <span className="ml-2 text-[10px] font-semibold tracking-wide text-gray-400">採用エージェント / 原稿を作成中</span>
      </div>
      <div className="grid sm:grid-cols-[165px_minmax(0,1fr)]">
        <aside className="border-b border-[#eee8e2] bg-[#fffdfb] p-4 sm:border-b-0 sm:border-r sm:p-5">
          <p className="text-[9px] font-bold tracking-[0.15em] text-gray-400">WORKFLOW</p>
          <div className="mt-3 grid grid-cols-2 gap-1 sm:grid-cols-1">
            {["求人情報", "原稿を作成", "内容を確認", "媒体別に出力"].map((item, index) => (
              <div key={item} className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-[10px] ${index === 1 ? "bg-[#fff0f3] font-bold text-gray-900" : "text-gray-500"}`}>
                {index < 2 ? <Check className="h-3 w-3 text-primary" strokeWidth={3} /> : <span className="h-3 w-3 rounded-full border border-gray-300" />}
                <span className="truncate">{item}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 hidden rounded-xl bg-gray-900 p-3 text-white sm:block">
            <Sparkles className="h-3.5 w-3.5 text-[#ff9caf]" />
            <p className="mt-2 text-[10px] leading-4 text-white/80">求人の魅力を整理して、原稿の土台をつくります。</p>
          </div>
        </aside>
        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div><p className="text-[9px] font-bold tracking-[0.15em] text-gray-400">JOB COPY</p><h2 className="mt-1 text-[15px] font-bold tracking-tight sm:text-[17px]">【賞与年2回】介護スタッフ／未経験OK</h2></div>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#effaf6] px-2.5 py-1 text-[9px] font-bold text-[#007766]"><Check className="h-3 w-3" strokeWidth={3} />確認済み</span>
          </div>
          <div className="mt-4 rounded-xl border border-[#eee8e2] bg-[#fffdfb] p-4">
            <p className="text-[12px] font-bold leading-5">残業は月平均5時間以下。家庭と両立しながら働けます。</p>
            <p className="mt-2 text-[11px] leading-5 text-gray-500">資格取得支援あり。未経験から始めた先輩も多く、段階的に仕事を覚えられる環境です。</p>
          </div>
          <div className="mt-4 flex items-center gap-2"><FileText className="h-3.5 w-3.5 text-primary" /><span className="text-[10px] font-bold tracking-[0.11em] text-gray-400">READY TO EXPORT</span></div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {platforms.map((platform) => <span key={platform} className="rounded-full border border-[#e7e2dc] bg-white px-2.5 py-1.5 text-[9px] font-bold text-gray-600">{platform}</span>)}
          </div>
        </div>
      </div>
    </div>
  );
}
