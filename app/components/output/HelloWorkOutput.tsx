"use client";

import { HelloWorkPosting } from "@/types/platform";
import { Button } from "@/components/ui/button";
import { Copy, Check, Pencil } from "lucide-react";
import { useState } from "react";

interface HelloWorkOutputProps {
  posting: HelloWorkPosting;
  editable?: boolean;
  onFieldChange?: (field: string, value: string) => void;
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button variant="ghost" size="sm" onClick={handleCopy} className="h-6 px-2 text-xs">
      {copied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
      {copied ? "コピー済み" : label}
    </Button>
  );
}

function FieldBlock({
  label,
  value,
  charLimit,
  editable,
  fieldKey,
  onFieldChange,
}: {
  label: string;
  value: string;
  charLimit?: number;
  editable?: boolean;
  fieldKey?: string;
  onFieldChange?: (field: string, value: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  // 生成AIの出力にフィールドが欠けることがあるため undefined/null を空文字に正規化
  value = value ?? "";
  const count = value.length;
  const isOver = charLimit ? count > charLimit : false;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <div className="flex items-center gap-2">
          {charLimit && (
            <span className={`text-xs ${isOver ? "text-red-500 font-bold" : "text-muted-foreground"}`}>
              {count}/{charLimit}文字
            </span>
          )}
          {editable && !isEditing && (
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="h-6 px-2 text-xs">
              <Pencil className="w-3 h-3 mr-1" />
              編集
            </Button>
          )}
          <CopyButton text={value} label="コピー" />
        </div>
      </div>
      {isEditing && editable ? (
        <div className="space-y-1">
          <textarea
            className="w-full border rounded-md p-3 text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={value}
            onChange={(e) => {
              if (fieldKey && onFieldChange) onFieldChange(fieldKey, e.target.value);
            }}
          />
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => setIsEditing(false)} className="text-xs">
              閉じる
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 border rounded-md p-3 text-sm whitespace-pre-wrap">{value}</div>
      )}
    </div>
  );
}

function SectionHeader({ title, badge }: { title: string; badge?: string }) {
  return (
    <h3 className="text-base font-semibold text-gray-800 border-b pb-1 mt-4 flex items-center gap-2">
      {title}
      {badge && (
        <span className="text-xs font-normal px-2 py-0.5 rounded bg-amber-100 text-amber-800">
          {badge}
        </span>
      )}
    </h3>
  );
}

// optional な値だけ表示する補助
function OptionalField(props: Parameters<typeof FieldBlock>[0]) {
  if (!props.value || !props.value.trim()) return null;
  return <FieldBlock {...props} />;
}

export function HelloWorkOutput({ posting, editable, onFieldChange }: HelloWorkOutputProps) {
  const copyAll = async () => {
    const allText = `【企業基本情報】
法人番号: ${posting.corporateNumber}
事業所名: ${posting.companyName}${posting.companyNameKana ? `（${posting.companyNameKana}）` : ""}
${posting.headOfficeAddress ? `本社所在地: ${posting.headOfficeAddress}\n` : ""}${posting.representativeName ? `代表者名: ${posting.representativeName}\n` : ""}${posting.establishmentYear ? `設立年: ${posting.establishmentYear}\n` : ""}${posting.capital ? `資本金: ${posting.capital}\n` : ""}${posting.totalEmployees ? `従業員数: ${posting.totalEmployees}名\n` : ""}
【事業所情報】
所在地: ${posting.companyAddress}
就業場所: ${posting.workLocation}
雇用保険適用事業所番号: ${posting.employmentInsuranceNumber}
事業内容: ${posting.businessContent}
${posting.companyFeatures ? `会社の特徴: ${posting.companyFeatures}\n` : ""}受動喫煙対策: ${posting.smokingPolicy}

【求人区分・仕事の内容】
求人区分: ${posting.jobCategoryType}
職種: ${posting.jobTitle}
仕事の内容: ${posting.jobDescription}
雇用形態: ${posting.employmentType}
雇用期間: ${posting.employmentPeriod}
契約更新: ${posting.contractRenewal}

【就業条件の変更の可能性（2024年法改正対応）】
就業場所の変更: ${posting.workplaceChange}
業務内容の変更: ${posting.jobContentChange}
転勤の可能性: ${posting.transferPossibility}
${posting.carCommute ? `マイカー通勤: ${posting.carCommute}${posting.hasParking ? `（${posting.hasParking}）` : ""}\n` : ""}
【賃金・手当】
賃金形態: ${posting.wageType}
賃金額: ${posting.wageAmount}
${posting.fixedOvertimePay ? `固定残業代: ${posting.fixedOvertimePay}\n` : ""}手当: ${posting.allowances}
通勤手当: ${posting.commutingAllowance}
賞与: ${posting.bonus}
昇給: ${posting.raise}
賃金締切日: ${posting.salaryClosingDay}
賃金支払日: ${posting.salaryPayDay}

【労働時間】
就業時間: ${posting.workingHours}
時間外労働: ${posting.overtime}${posting.overtimeAvg ? `（月平均${posting.overtimeAvg}時間）` : ""}
休憩時間: ${posting.breakTime}
休日: ${posting.holidays}
年間休日数: ${posting.annualHolidays}
年次有給休暇: ${posting.annualLeave}
${posting.specialClause36 ? `36協定特別条項: ${posting.specialClause36}\n` : ""}
【保険・年金・定年】
加入保険: ${posting.insurance}
企業年金: ${posting.pension}
試用期間: ${posting.trialPeriod}
定年制: ${posting.retirementAge}
退職金制度: ${posting.retirementBenefit}
${posting.reEmployment ? `再雇用制度: ${posting.reEmployment}\n` : ""}${posting.childcareLeaveActual ? `育児休業実績: ${posting.childcareLeaveActual}\n` : ""}${posting.careLeaveActual ? `介護休業実績: ${posting.careLeaveActual}\n` : ""}${posting.nursingLeaveActual ? `看護休暇実績: ${posting.nursingLeaveActual}\n` : ""}特記事項: ${posting.specialNotes}

【必要な経験等】
必要な経験・知識・技能等: ${posting.requirements}
必要な免許・資格: ${posting.requiredLicenses}
${posting.pcSkills ? `必要なPCスキル: ${posting.pcSkills}\n` : ""}${posting.educationLevel ? `学歴: ${posting.educationLevel}\n` : ""}年齢制限: ${posting.ageRestriction}

【選考等】
採用人数: ${posting.numberOfHires}
選考方法: ${posting.selectionMethod}
選考結果通知: ${posting.selectionResultDays}
応募書類: ${posting.applicationDocuments}
応募方法: ${posting.applicationMethodHw}
採用担当者: ${posting.hiringManagerName}${posting.hiringManagerPosition ? `（${posting.hiringManagerPosition}）` : ""}
連絡先: ${posting.hiringManagerContact}

【公開範囲】
${posting.publishingScope}

【求人に関する特記事項】
${posting.remarks}`;
    await navigator.clipboard.writeText(allText);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">ハローワーク 求人票</h2>
        <Button onClick={copyAll} variant="outline" size="sm">
          <Copy className="w-4 h-4 mr-2" />
          全文コピー
        </Button>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm text-amber-800">
        ハローワークの求人票は全角文字で記載されています。絵文字は含まれていません。
        2024年法改正により「就業場所/業務内容/転勤の変更の可能性」が必須項目です。
      </div>

      <div className="space-y-4">
        <SectionHeader title="企業基本情報" />
        <FieldBlock label="法人番号" value={posting.corporateNumber} editable={editable} fieldKey="corporateNumber" onFieldChange={onFieldChange} />
        <FieldBlock label="事業所名" value={posting.companyName} editable={editable} fieldKey="companyName" onFieldChange={onFieldChange} />
        <OptionalField label="事業所名（カナ）" value={posting.companyNameKana || ""} editable={editable} fieldKey="companyNameKana" onFieldChange={onFieldChange} />
        <OptionalField label="本社所在地" value={posting.headOfficeAddress || ""} editable={editable} fieldKey="headOfficeAddress" onFieldChange={onFieldChange} />
        <OptionalField label="代表者名" value={posting.representativeName || ""} editable={editable} fieldKey="representativeName" onFieldChange={onFieldChange} />
        <OptionalField label="設立年" value={posting.establishmentYear || ""} editable={editable} fieldKey="establishmentYear" onFieldChange={onFieldChange} />
        <OptionalField label="資本金" value={posting.capital || ""} editable={editable} fieldKey="capital" onFieldChange={onFieldChange} />
        <OptionalField label="従業員数" value={posting.totalEmployees || ""} editable={editable} fieldKey="totalEmployees" onFieldChange={onFieldChange} />

        <SectionHeader title="事業所情報" />
        <FieldBlock label="所在地" value={posting.companyAddress} editable={editable} fieldKey="companyAddress" onFieldChange={onFieldChange} />
        <FieldBlock label="就業場所" value={posting.workLocation} editable={editable} fieldKey="workLocation" onFieldChange={onFieldChange} />
        <FieldBlock label="雇用保険適用事業所番号" value={posting.employmentInsuranceNumber} editable={editable} fieldKey="employmentInsuranceNumber" onFieldChange={onFieldChange} />
        <FieldBlock label="事業内容" value={posting.businessContent} editable={editable} fieldKey="businessContent" onFieldChange={onFieldChange} />
        <OptionalField label="会社の特徴" value={posting.companyFeatures || ""} editable={editable} fieldKey="companyFeatures" onFieldChange={onFieldChange} />
        <FieldBlock label="受動喫煙対策" value={posting.smokingPolicy} editable={editable} fieldKey="smokingPolicy" onFieldChange={onFieldChange} />

        <SectionHeader title="求人区分・仕事の内容" />
        <FieldBlock label="求人区分" value={posting.jobCategoryType} editable={editable} fieldKey="jobCategoryType" onFieldChange={onFieldChange} />
        <FieldBlock label="職種" value={posting.jobTitle} charLimit={28} editable={editable} fieldKey="jobTitle" onFieldChange={onFieldChange} />
        <FieldBlock label="仕事の内容" value={posting.jobDescription} charLimit={360} editable={editable} fieldKey="jobDescription" onFieldChange={onFieldChange} />
        <FieldBlock label="雇用形態" value={posting.employmentType} editable={editable} fieldKey="employmentType" onFieldChange={onFieldChange} />
        <FieldBlock label="雇用期間" value={posting.employmentPeriod} editable={editable} fieldKey="employmentPeriod" onFieldChange={onFieldChange} />
        <FieldBlock label="契約更新の可能性" value={posting.contractRenewal} editable={editable} fieldKey="contractRenewal" onFieldChange={onFieldChange} />

        <SectionHeader title="就業条件の変更の可能性" badge="2024年法改正" />
        <FieldBlock label="就業場所の変更の可能性" value={posting.workplaceChange} editable={editable} fieldKey="workplaceChange" onFieldChange={onFieldChange} />
        <FieldBlock label="業務内容の変更の可能性" value={posting.jobContentChange} editable={editable} fieldKey="jobContentChange" onFieldChange={onFieldChange} />
        <FieldBlock label="転勤の可能性" value={posting.transferPossibility} editable={editable} fieldKey="transferPossibility" onFieldChange={onFieldChange} />
        <OptionalField label="マイカー通勤" value={posting.carCommute || ""} editable={editable} fieldKey="carCommute" onFieldChange={onFieldChange} />
        <OptionalField label="駐車場" value={posting.hasParking || ""} editable={editable} fieldKey="hasParking" onFieldChange={onFieldChange} />

        <SectionHeader title="賃金・手当" />
        <FieldBlock label="賃金形態" value={posting.wageType} editable={editable} fieldKey="wageType" onFieldChange={onFieldChange} />
        <FieldBlock label="賃金額" value={posting.wageAmount} editable={editable} fieldKey="wageAmount" onFieldChange={onFieldChange} />
        <OptionalField label="固定残業代" value={posting.fixedOvertimePay || ""} editable={editable} fieldKey="fixedOvertimePay" onFieldChange={onFieldChange} />
        <FieldBlock label="手当" value={posting.allowances} editable={editable} fieldKey="allowances" onFieldChange={onFieldChange} />
        <FieldBlock label="通勤手当" value={posting.commutingAllowance} editable={editable} fieldKey="commutingAllowance" onFieldChange={onFieldChange} />
        <FieldBlock label="賞与" value={posting.bonus} editable={editable} fieldKey="bonus" onFieldChange={onFieldChange} />
        <FieldBlock label="昇給" value={posting.raise} editable={editable} fieldKey="raise" onFieldChange={onFieldChange} />
        <FieldBlock label="賃金締切日" value={posting.salaryClosingDay} editable={editable} fieldKey="salaryClosingDay" onFieldChange={onFieldChange} />
        <FieldBlock label="賃金支払日" value={posting.salaryPayDay} editable={editable} fieldKey="salaryPayDay" onFieldChange={onFieldChange} />

        <SectionHeader title="労働時間" />
        <FieldBlock label="就業時間" value={posting.workingHours} editable={editable} fieldKey="workingHours" onFieldChange={onFieldChange} />
        <FieldBlock label="時間外労働" value={posting.overtime} editable={editable} fieldKey="overtime" onFieldChange={onFieldChange} />
        <OptionalField label="時間外平均（月）" value={posting.overtimeAvg || ""} editable={editable} fieldKey="overtimeAvg" onFieldChange={onFieldChange} />
        <FieldBlock label="休憩時間" value={posting.breakTime} editable={editable} fieldKey="breakTime" onFieldChange={onFieldChange} />
        <FieldBlock label="休日" value={posting.holidays} editable={editable} fieldKey="holidays" onFieldChange={onFieldChange} />
        <FieldBlock label="年間休日数" value={posting.annualHolidays} editable={editable} fieldKey="annualHolidays" onFieldChange={onFieldChange} />
        <FieldBlock label="年次有給休暇" value={posting.annualLeave} editable={editable} fieldKey="annualLeave" onFieldChange={onFieldChange} />
        <OptionalField label="36協定特別条項" value={posting.specialClause36 || ""} editable={editable} fieldKey="specialClause36" onFieldChange={onFieldChange} />

        <SectionHeader title="保険・年金・定年" />
        <FieldBlock label="加入保険" value={posting.insurance} editable={editable} fieldKey="insurance" onFieldChange={onFieldChange} />
        <FieldBlock label="企業年金" value={posting.pension} editable={editable} fieldKey="pension" onFieldChange={onFieldChange} />
        <FieldBlock label="試用期間" value={posting.trialPeriod} editable={editable} fieldKey="trialPeriod" onFieldChange={onFieldChange} />
        <FieldBlock label="定年制" value={posting.retirementAge} editable={editable} fieldKey="retirementAge" onFieldChange={onFieldChange} />
        <FieldBlock label="退職金制度" value={posting.retirementBenefit} editable={editable} fieldKey="retirementBenefit" onFieldChange={onFieldChange} />
        <OptionalField label="再雇用制度" value={posting.reEmployment || ""} editable={editable} fieldKey="reEmployment" onFieldChange={onFieldChange} />
        <OptionalField label="育児休業実績" value={posting.childcareLeaveActual || ""} editable={editable} fieldKey="childcareLeaveActual" onFieldChange={onFieldChange} />
        <OptionalField label="介護休業実績" value={posting.careLeaveActual || ""} editable={editable} fieldKey="careLeaveActual" onFieldChange={onFieldChange} />
        <OptionalField label="看護休暇実績" value={posting.nursingLeaveActual || ""} editable={editable} fieldKey="nursingLeaveActual" onFieldChange={onFieldChange} />
        <FieldBlock label="特記事項" value={posting.specialNotes} editable={editable} fieldKey="specialNotes" onFieldChange={onFieldChange} />

        <SectionHeader title="必要な経験等" />
        <FieldBlock label="必要な経験・知識・技能等" value={posting.requirements} charLimit={150} editable={editable} fieldKey="requirements" onFieldChange={onFieldChange} />
        <FieldBlock label="必要な免許・資格" value={posting.requiredLicenses} editable={editable} fieldKey="requiredLicenses" onFieldChange={onFieldChange} />
        <OptionalField label="必要なPCスキル" value={posting.pcSkills || ""} editable={editable} fieldKey="pcSkills" onFieldChange={onFieldChange} />
        <OptionalField label="学歴" value={posting.educationLevel || ""} editable={editable} fieldKey="educationLevel" onFieldChange={onFieldChange} />
        <FieldBlock label="年齢制限" value={posting.ageRestriction} editable={editable} fieldKey="ageRestriction" onFieldChange={onFieldChange} />

        <SectionHeader title="選考等" />
        <FieldBlock label="採用人数" value={posting.numberOfHires} editable={editable} fieldKey="numberOfHires" onFieldChange={onFieldChange} />
        <FieldBlock label="選考方法" value={posting.selectionMethod} editable={editable} fieldKey="selectionMethod" onFieldChange={onFieldChange} />
        <FieldBlock label="選考結果通知" value={posting.selectionResultDays} editable={editable} fieldKey="selectionResultDays" onFieldChange={onFieldChange} />
        <FieldBlock label="応募書類" value={posting.applicationDocuments} editable={editable} fieldKey="applicationDocuments" onFieldChange={onFieldChange} />
        <FieldBlock label="応募方法" value={posting.applicationMethodHw} editable={editable} fieldKey="applicationMethodHw" onFieldChange={onFieldChange} />
        <FieldBlock label="採用担当者" value={posting.hiringManagerName} editable={editable} fieldKey="hiringManagerName" onFieldChange={onFieldChange} />
        <OptionalField label="役職" value={posting.hiringManagerPosition || ""} editable={editable} fieldKey="hiringManagerPosition" onFieldChange={onFieldChange} />
        <FieldBlock label="連絡先" value={posting.hiringManagerContact} editable={editable} fieldKey="hiringManagerContact" onFieldChange={onFieldChange} />

        <SectionHeader title="公開範囲" />
        <FieldBlock label="求人情報の公開範囲" value={posting.publishingScope} editable={editable} fieldKey="publishingScope" onFieldChange={onFieldChange} />

        <SectionHeader title="求人に関する特記事項" />
        <FieldBlock label="特記事項" value={posting.remarks} charLimit={300} editable={editable} fieldKey="remarks" onFieldChange={onFieldChange} />
      </div>
    </div>
  );
}
