"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Building2, Check, Pencil, X, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

interface OfficeRecord {
  id: string;
  name: string;
  createdAt: string;
  jobCount: number;
}

interface MasterItem {
  id: string;
  name: string;
}

interface Assignment {
  jobTypeId: string;
  jobTypeName: string;
  employmentTypeIds: string[];
}

interface OfficeJob {
  id: string;
  jobTypeId: string;
  employmentTypeId: string;
  status: string;
  JobType: { id: string; name: string; color?: string };
  EmploymentType: { id: string; name: string };
}

interface OfficeJobGroup {
  jobTypeId: string;
  jobTypeName: string;
  jobTypeColor: string;
  jobs: OfficeJob[];
}

export default function OfficesPage() {
  const [offices, setOffices] = useState<OfficeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<OfficeRecord | null>(null);
  const [deleteJobTarget, setDeleteJobTarget] = useState<{ jobId: string; label: string } | null>(null);

  // 新規追加フォーム
  const [officeName, setOfficeName] = useState("");
  const [jobTypes, setJobTypes] = useState<MasterItem[]>([]);
  const [employmentTypes, setEmploymentTypes] = useState<MasterItem[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // インライン編集
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  // 展開して中身表示
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedJobs, setExpandedJobs] = useState<OfficeJob[]>([]);
  const [expandLoading, setExpandLoading] = useState(false);

  // 職種/勤務形態追加ダイアログ
  const [addJobDialogOpen, setAddJobDialogOpen] = useState(false);
  const [addJobOfficeId, setAddJobOfficeId] = useState("");
  const [addJobMode, setAddJobMode] = useState<"jobType" | "employmentType">("jobType");
  const [addJobForJobTypeId, setAddJobForJobTypeId] = useState("");
  const [selectedJobType, setSelectedJobType] = useState("");
  const [selectedETs, setSelectedETs] = useState<string[]>([]);

  useEffect(() => { fetchOffices(); }, []);

  async function fetchOffices() {
    const res = await fetch("/api/settings/offices");
    if (res.ok) setOffices(await res.json());
    setLoading(false);
  }

  async function fetchMasters() {
    const [jtRes, etRes] = await Promise.all([
      fetch("/api/settings/job-types"),
      fetch("/api/settings/employment-types"),
    ]);
    if (jtRes.ok) setJobTypes(await jtRes.json());
    if (etRes.ok) setEmploymentTypes(await etRes.json());
  }

  async function fetchOfficeJobs(officeId: string) {
    setExpandLoading(true);
    const res = await fetch(`/api/offices/${officeId}`);
    if (res.ok) {
      const data = await res.json();
      setExpandedJobs(data.jobs || []);
    }
    setExpandLoading(false);
  }

  function toggleExpand(officeId: string) {
    if (expandedId === officeId) {
      setExpandedId(null);
      setExpandedJobs([]);
    } else {
      setExpandedId(officeId);
      fetchOfficeJobs(officeId);
    }
  }

  // --- 新規事業所 ---
  function openCreateDialog() {
    setOfficeName("");
    setAssignments([]);
    fetchMasters();
    setDialogOpen(true);
  }

  function toggleJobType(jt: MasterItem) {
    const exists = assignments.find((a) => a.jobTypeId === jt.id);
    if (exists) {
      setAssignments((prev) => prev.filter((a) => a.jobTypeId !== jt.id));
    } else {
      setAssignments((prev) => [
        ...prev,
        { jobTypeId: jt.id, jobTypeName: jt.name, employmentTypeIds: [] },
      ]);
    }
  }

  function toggleEmploymentType(jobTypeId: string, etId: string) {
    setAssignments((prev) =>
      prev.map((a) => {
        if (a.jobTypeId !== jobTypeId) return a;
        const has = a.employmentTypeIds.includes(etId);
        return {
          ...a,
          employmentTypeIds: has
            ? a.employmentTypeIds.filter((id) => id !== etId)
            : [...a.employmentTypeIds, etId],
        };
      })
    );
  }

  async function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!officeName.trim()) return;
    const validAssignments = assignments.filter((a) => a.employmentTypeIds.length > 0);
    setSubmitting(true);
    const res = await fetch("/api/settings/offices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: officeName,
        assignments: validAssignments.map((a) => ({
          jobTypeId: a.jobTypeId,
          employmentTypeIds: a.employmentTypeIds,
        })),
      }),
    });
    if (res.ok) {
      toast.success("事業所を追加しました");
      setDialogOpen(false);
      fetchOffices();
    } else {
      const data = await res.json();
      toast.error(data.error);
    }
    setSubmitting(false);
  }

  // --- 事業所名編集 ---
  async function handleEditName(id: string) {
    const res = await fetch(`/api/settings/offices/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName }),
    });
    if (res.ok) {
      toast.success("更新しました");
      setEditingId(null);
      fetchOffices();
    } else {
      toast.error("更新に失敗しました");
    }
  }

  // --- 事業所削除 ---
  async function handleDeleteOffice() {
    if (!deleteTarget) return;
    const res = await fetch(`/api/settings/offices/${deleteTarget.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("削除しました");
      if (expandedId === deleteTarget.id) {
        setExpandedId(null);
        setExpandedJobs([]);
      }
      fetchOffices();
    } else {
      toast.error("削除に失敗しました");
    }
    setDeleteTarget(null);
  }

  // --- 職種/勤務形態を事業所に追加 ---
  function openAddJobType(officeId: string) {
    setAddJobOfficeId(officeId);
    setAddJobMode("jobType");
    setSelectedJobType("");
    setSelectedETs([]);
    fetchMasters();
    setAddJobDialogOpen(true);
  }

  function openAddEmploymentType(officeId: string, jobTypeId: string) {
    setAddJobOfficeId(officeId);
    setAddJobMode("employmentType");
    setAddJobForJobTypeId(jobTypeId);
    setSelectedETs([]);
    fetchMasters();
    setAddJobDialogOpen(true);
  }

  async function handleAddJobSubmit() {
    const jobTypeId = addJobMode === "jobType" ? selectedJobType : addJobForJobTypeId;
    if (!jobTypeId || selectedETs.length === 0) {
      toast.error("職種と勤務形態を選択してください");
      return;
    }
    setSubmitting(true);
    const res = await fetch(`/api/offices/${addJobOfficeId}/jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobTypeId, employmentTypeIds: selectedETs }),
    });
    if (res.ok) {
      toast.success("求人を追加しました");
      setAddJobDialogOpen(false);
      fetchOffices();
      fetchOfficeJobs(addJobOfficeId);
    } else {
      const data = await res.json();
      toast.error(data.error);
    }
    setSubmitting(false);
  }

  // --- 個別求人削除 ---
  async function handleDeleteJob() {
    if (!deleteJobTarget) return;
    const res = await fetch(`/api/jobs/${deleteJobTarget.jobId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("削除しました");
      fetchOffices();
      if (expandedId) fetchOfficeJobs(expandedId);
    } else {
      toast.error("削除に失敗しました");
    }
    setDeleteJobTarget(null);
  }

  // --- グループ化 ---
  function groupJobs(jobs: OfficeJob[]): OfficeJobGroup[] {
    const groups: OfficeJobGroup[] = [];
    for (const job of jobs) {
      const jtId = job.JobType.id;
      let group = groups.find((g) => g.jobTypeId === jtId);
      if (!group) {
        group = { jobTypeId: jtId, jobTypeName: job.JobType.name, jobTypeColor: job.JobType.color || "#6b7280", jobs: [] };
        groups.push(group);
      }
      group.jobs.push(job);
    }
    return groups;
  }

  if (loading) return <p className="text-gray-500 text-center py-8">読み込み中...</p>;

  const groups = groupJobs(expandedJobs);
  const existingJobTypeIds = groups.map((g) => g.jobTypeId);
  const availableJobTypes = jobTypes.filter((jt) => !existingJobTypeIds.includes(jt.id));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold">事業所マスタ</h2>
        <Button size="sm" onClick={openCreateDialog}>
          <Plus className="w-4 h-4 mr-1.5" />事業所を追加
        </Button>
      </div>

      <div className="space-y-2">
        {offices.map((office) => {
          const isExpanded = expandedId === office.id;
          return (
            <Card key={office.id} className="overflow-hidden">
              {/* ヘッダー行 */}
              <CardContent className="flex items-center justify-between py-4">
                {editingId === office.id ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-8 text-sm"
                      autoFocus
                    />
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleEditName(office.id)}>
                      <Check className="w-4 h-4 text-green-600" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setEditingId(null)}>
                      <X className="w-4 h-4 text-gray-400" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <button
                      className="flex items-center gap-3 text-left flex-1 min-w-0"
                      onClick={() => toggleExpand(office.id)}
                    >
                      <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                        <Building2 className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{office.name}</p>
                        <p className="text-xs text-gray-500">{office.jobCount}件の求人</p>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                      )}
                    </button>
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <Button
                        variant="ghost" size="sm" className="h-8 w-8 p-0"
                        onClick={() => { setEditingId(office.id); setEditName(office.name); }}
                      >
                        <Pencil className="w-3.5 h-3.5 text-gray-400" />
                      </Button>
                      <Button
                        variant="ghost" size="sm" className="text-red-500 hover:text-red-700 h-8 w-8 p-0"
                        onClick={() => setDeleteTarget(office)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>

              {/* 展開: 職種→勤務形態 */}
              {isExpanded && (
                <div className="border-t bg-gray-50/50 px-4 py-3 space-y-3">
                  {expandLoading ? (
                    <p className="text-xs text-gray-500 text-center py-4">読み込み中...</p>
                  ) : groups.length === 0 ? (
                    <p className="text-xs text-gray-500 text-center py-4">
                      職種が登録されていません
                    </p>
                  ) : (
                    groups.map((group) => (
                      <div key={group.jobTypeId} className="bg-white rounded-lg border overflow-hidden">
                        <div className="px-3 py-2 bg-gray-50 border-b flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: group.jobTypeColor }} />
                            <span className="text-xs font-semibold text-gray-700">{group.jobTypeName}</span>
                          </div>
                          <Button
                            variant="ghost" size="sm" className="text-xs h-6 px-2 text-gray-500"
                            onClick={() => openAddEmploymentType(office.id, group.jobTypeId)}
                          >
                            <Plus className="w-3 h-3 mr-1" />勤務形態を追加
                          </Button>
                        </div>
                        {group.jobs.map((job) => (
                          <div key={job.id} className="px-3 py-2 border-b last:border-0 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-xs">{job.EmploymentType.name}</span>
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                {job.status === "draft" ? "下書き" :
                                 job.status === "confirmed" ? "確定済み" :
                                 job.status === "awaiting_republish" ? "再掲載待ち" : job.status}
                              </Badge>
                            </div>
                            <Button
                              variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-400 hover:text-red-600"
                              onClick={() => setDeleteJobTarget({
                                jobId: job.id,
                                label: `${group.jobTypeName} / ${job.EmploymentType.name}`,
                              })}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ))
                  )}
                  <Button
                    variant="outline" size="sm" className="text-xs w-full"
                    onClick={() => openAddJobType(office.id)}
                  >
                    <Plus className="w-3 h-3 mr-1" />職種を追加
                  </Button>
                </div>
              )}
            </Card>
          );
        })}
        {offices.length === 0 && (
          <p className="text-center text-gray-500 py-8">事業所が登録されていません</p>
        )}
      </div>

      {/* 新規事業所ダイアログ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>事業所を追加</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-5 mt-2">
            <div className="space-y-2">
              <Label>事業所名</Label>
              <Input
                value={officeName}
                onChange={(e) => setOfficeName(e.target.value)}
                placeholder="有料老人ホームたいよう本館"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>職種を選択</Label>
              {jobTypes.length === 0 ? (
                <p className="text-xs text-gray-500">先に「職種マスタ」タブで職種を登録してください</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {jobTypes.map((jt) => {
                    const selected = assignments.some((a) => a.jobTypeId === jt.id);
                    return (
                      <Button key={jt.id} type="button" variant={selected ? "default" : "outline"} size="sm" className="text-xs h-7" onClick={() => toggleJobType(jt)}>
                        {selected && <Check className="w-3 h-3 mr-1" />}{jt.name}
                      </Button>
                    );
                  })}
                </div>
              )}
            </div>
            {assignments.map((a) => (
              <div key={a.jobTypeId} className="space-y-2 p-3 rounded-lg bg-gray-50 border">
                <Label className="text-xs">{a.jobTypeName} の勤務形態</Label>
                {employmentTypes.length === 0 ? (
                  <p className="text-xs text-gray-500">先に「勤務形態マスタ」タブで登録してください</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {employmentTypes.map((et) => {
                      const selected = a.employmentTypeIds.includes(et.id);
                      return (
                        <Button key={et.id} type="button" variant={selected ? "default" : "outline"} size="sm" className="text-xs h-7" onClick={() => toggleEmploymentType(a.jobTypeId, et.id)}>
                          {selected && <Check className="w-3 h-3 mr-1" />}{et.name}
                        </Button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
            {assignments.some((a) => a.employmentTypeIds.length > 0) && (
              <div className="text-xs text-gray-500 bg-blue-50 rounded px-3 py-2">
                {assignments.reduce((sum, a) => sum + a.employmentTypeIds.length, 0)}件の求人が作成されます
              </div>
            )}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "作成中..." : "事業所を作成"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* 職種/勤務形態追加ダイアログ */}
      <Dialog open={addJobDialogOpen} onOpenChange={setAddJobDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {addJobMode === "jobType" ? "職種を追加" : "勤務形態を追加"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {addJobMode === "jobType" && (
              <div className="space-y-2">
                <Label>職種</Label>
                {availableJobTypes.length === 0 ? (
                  <p className="text-xs text-gray-500">追加可能な職種がありません</p>
                ) : (
                  <Select value={selectedJobType} onValueChange={setSelectedJobType}>
                    <SelectTrigger><SelectValue placeholder="職種を選択" /></SelectTrigger>
                    <SelectContent>
                      {availableJobTypes.map((jt) => (
                        <SelectItem key={jt.id} value={jt.id}>{jt.name}</SelectItem>
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
                  // 勤務形態追加モード: 既存を除外
                  if (addJobMode === "employmentType") {
                    const exists = expandedJobs.some(
                      (j) => j.JobType.id === addJobForJobTypeId && j.EmploymentType.id === et.id
                    );
                    if (exists) return null;
                  }
                  return (
                    <Button
                      key={et.id} type="button" variant={selected ? "default" : "outline"} size="sm" className="text-xs h-7"
                      onClick={() => setSelectedETs((prev) => selected ? prev.filter((id) => id !== et.id) : [...prev, et.id])}
                    >
                      {selected && <Check className="w-3 h-3 mr-1" />}{et.name}
                    </Button>
                  );
                })}
              </div>
            </div>
            <Button
              className="w-full"
              disabled={submitting || selectedETs.length === 0 || (addJobMode === "jobType" && !selectedJobType)}
              onClick={handleAddJobSubmit}
            >
              {submitting ? "追加中..." : `${selectedETs.length}件の求人を追加`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 事業所削除確認 */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>「{deleteTarget?.name}」を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この事業所に紐づく全ての求人（{deleteTarget?.jobCount}件）とその履歴データも削除されます。この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteOffice} className="bg-red-600 hover:bg-red-700">削除する</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 個別求人削除確認 */}
      <AlertDialog open={!!deleteJobTarget} onOpenChange={(open) => !open && setDeleteJobTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>「{deleteJobTarget?.label}」を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この求人と関連する履歴データが全て削除されます。この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteJob} className="bg-red-600 hover:bg-red-700">削除する</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
