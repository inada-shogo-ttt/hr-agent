"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/app/components/StatusBadge";
import { Plus, ChevronRight, Check } from "lucide-react";
import { toast } from "sonner";
import { JobStatus } from "@/types/auth";

interface JobEntry {
  id: string;
  status: JobStatus;
  createdAt: string;
  JobType: { id: string; name: string; color?: string };
  EmploymentType: { id: string; name: string };
  records: { type: string; platform: string; createdAt: string }[];
}

interface OfficeDetail {
  id: string;
  name: string;
  jobs: JobEntry[];
}

interface MasterItem {
  id: string;
  name: string;
}

interface JobTypeGroup {
  jobTypeId: string;
  jobTypeName: string;
  jobTypeColor: string;
  jobs: JobEntry[];
}

export default function OfficeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const officeId = params.officeId as string;
  const [office, setOffice] = useState<OfficeDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // 追加ダイアログ
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addMode, setAddMode] = useState<"jobType" | "employmentType">("jobType");
  const [addForJobTypeId, setAddForJobTypeId] = useState("");
  const [jobTypes, setJobTypes] = useState<MasterItem[]>([]);
  const [employmentTypes, setEmploymentTypes] = useState<MasterItem[]>([]);
  const [selectedJobType, setSelectedJobType] = useState("");
  const [selectedETs, setSelectedETs] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  function fetchOffice() {
    fetch(`/api/offices/${officeId}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(setOffice)
      .catch(() => router.push("/jobs"))
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchOffice(); }, [officeId]);

  async function fetchMasters() {
    const [jtRes, etRes] = await Promise.all([
      fetch("/api/settings/job-types"),
      fetch("/api/settings/employment-types"),
    ]);
    if (jtRes.ok) setJobTypes(await jtRes.json());
    if (etRes.ok) setEmploymentTypes(await etRes.json());
  }

  function openAddJobType() {
    setAddMode("jobType");
    setSelectedJobType("");
    setSelectedETs([]);
    fetchMasters();
    setAddDialogOpen(true);
  }

  function openAddEmploymentType(jobTypeId: string) {
    setAddMode("employmentType");
    setAddForJobTypeId(jobTypeId);
    setSelectedETs([]);
    fetchMasters();
    setAddDialogOpen(true);
  }

  async function handleAddSubmit() {
    setSubmitting(true);
    const jobTypeId = addMode === "jobType" ? selectedJobType : addForJobTypeId;

    if (!jobTypeId || selectedETs.length === 0) {
      toast.error("職種と勤務形態を選択してください");
      setSubmitting(false);
      return;
    }

    const res = await fetch(`/api/offices/${officeId}/jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobTypeId, employmentTypeIds: selectedETs }),
    });

    if (res.ok) {
      toast.success("求人を追加しました");
      setAddDialogOpen(false);
      fetchOffice();
    } else {
      const data = await res.json();
      toast.error(data.error);
    }
    setSubmitting(false);
  }

  if (loading || !office) {
    return (
      <main className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          読み込み中...
        </div>
      </main>
    );
  }

  // 職種でグループ化
  const groups: JobTypeGroup[] = [];
  for (const job of office.jobs) {
    const jtId = job.JobType.id;
    let group = groups.find((g) => g.jobTypeId === jtId);
    if (!group) {
      group = { jobTypeId: jtId, jobTypeName: job.JobType.name, jobTypeColor: job.JobType.color || "#6b7280", jobs: [] };
      groups.push(group);
    }
    group.jobs.push(job);
  }

  // 追加ダイアログで既に存在する職種を除外
  const existingJobTypeIds = groups.map((g) => g.jobTypeId);
  const availableJobTypes = jobTypes.filter(
    (jt) => !existingJobTypeIds.includes(jt.id)
  );

  return (
    <main className="min-h-screen bg-[#FAFAF8]">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">{office.name}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {groups.length}職種 ・ {office.jobs.length}求人
            </p>
          </div>
          <Button size="sm" onClick={openAddJobType}>
            <Plus className="w-4 h-4 mr-1.5" />
            職種を追加
          </Button>
        </div>

        {/* 職種グループ */}
        {groups.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                まだ職種が登録されていません。「職種を追加」から始めてください。
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {groups.map((group) => (
              <Card key={group.jobTypeId} className="overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: group.jobTypeColor }}
                    />
                    <span className="font-semibold text-sm">
                      {group.jobTypeName}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => openAddEmploymentType(group.jobTypeId)}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    勤務形態を追加
                  </Button>
                </div>
                <div>
                  {group.jobs.map((job) => {
                    const latest = job.records?.[0];
                    return (
                      <Link key={job.id} href={`/jobs/${job.id}`}>
                        <div className="px-4 py-3 border-b last:border-0 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium">
                              {job.EmploymentType.name}
                            </span>
                            <StatusBadge status={job.status} />
                          </div>
                          <div className="flex items-center gap-2">
                            {latest ? (
                              <span className="text-[11px] text-gray-400">
                                {latest.type === "team-a" ? "Team A" : "Team B"}{" "}
                                / {latest.platform} /{" "}
                                {new Date(latest.createdAt).toLocaleDateString(
                                  "ja-JP"
                                )}
                              </span>
                            ) : (
                              <span className="text-[11px] text-gray-400">
                                未実行
                              </span>
                            )}
                            <ChevronRight className="w-4 h-4 text-gray-300" />
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* 追加ダイアログ */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {addMode === "jobType"
                ? "職種を追加"
                : "勤務形態を追加"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {addMode === "jobType" && (
              <div className="space-y-2">
                <Label>職種</Label>
                {availableJobTypes.length === 0 ? (
                  <p className="text-xs text-gray-500">
                    追加可能な職種がありません。設定画面から職種を登録してください。
                  </p>
                ) : (
                  <Select value={selectedJobType} onValueChange={setSelectedJobType}>
                    <SelectTrigger>
                      <SelectValue placeholder="職種を選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableJobTypes.map((jt) => (
                        <SelectItem key={jt.id} value={jt.id}>
                          {jt.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>勤務形態</Label>
              <div className="flex flex-wrap gap-2">
                {employmentTypes.map((et) => {
                  const selected = selectedETs.includes(et.id);
                  // employmentType追加モードの場合、既存の組み合わせを除外
                  if (addMode === "employmentType") {
                    const exists = office?.jobs.some(
                      (j) =>
                        j.JobType.id === addForJobTypeId &&
                        j.EmploymentType.id === et.id
                    );
                    if (exists) return null;
                  }
                  return (
                    <Button
                      key={et.id}
                      type="button"
                      variant={selected ? "default" : "outline"}
                      size="sm"
                      className="text-xs h-7"
                      onClick={() =>
                        setSelectedETs((prev) =>
                          selected
                            ? prev.filter((id) => id !== et.id)
                            : [...prev, et.id]
                        )
                      }
                    >
                      {selected && <Check className="w-3 h-3 mr-1" />}
                      {et.name}
                    </Button>
                  );
                })}
              </div>
            </div>

            <Button
              className="w-full"
              disabled={
                submitting ||
                selectedETs.length === 0 ||
                (addMode === "jobType" && !selectedJobType)
              }
              onClick={handleAddSubmit}
            >
              {submitting ? "追加中..." : `${selectedETs.length}件の求人を追加`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
