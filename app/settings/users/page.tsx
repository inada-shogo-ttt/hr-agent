"use client";

import { useCallback, useEffect, useState } from "react";
import { useUser } from "@/app/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, UserPlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { UserRole } from "@/types/auth";
import { PLANS } from "@/lib/billing/plans";
import { PlanId } from "@/types/organization";

interface MemberRecord {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
}

interface OrgRecord {
  id: string;
  code: string;
  name: string;
  billingExempt: boolean;
  plan: PlanId | null;
  subscriptionStatus: string | null;
  User: MemberRecord[];
}

function planLabel(org: OrgRecord): string {
  if (org.billingExempt) return "課金免除";
  if (org.plan && org.subscriptionStatus === "active") {
    return PLANS[org.plan].name;
  }
  return "未契約";
}

function RoleBadge({ role }: { role: UserRole }) {
  if (role === "super_admin") {
    return <Badge className="bg-red-100 text-red-800">最高管理者</Badge>;
  }
  if (role === "admin") {
    return <Badge className="bg-blue-100 text-blue-800">管理者</Badge>;
  }
  return null;
}

interface MemberForm {
  name: string;
  email: string;
  password: string;
  role: "admin" | "member";
}

const EMPTY_MEMBER_FORM: MemberForm = {
  name: "",
  email: "",
  password: "",
  role: "member",
};

export default function OrganizationsPage() {
  const { user } = useUser();
  const isSuper = user?.role === "super_admin";

  const [orgs, setOrgs] = useState<OrgRecord[]>([]);
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgDialogOpen, setOrgDialogOpen] = useState(false);
  const [orgForm, setOrgForm] = useState({
    code: "",
    name: "",
    billingExempt: false,
  });
  // super_admin は対象組織ID、admin は自組織を表すダミー値をセットしてダイアログを開く
  const [memberDialogOrgId, setMemberDialogOrgId] = useState<string | null>(null);
  const [memberForm, setMemberForm] = useState<MemberForm>(EMPTY_MEMBER_FORM);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    if (isSuper) {
      const res = await fetch("/api/organizations");
      if (res.ok) setOrgs(await res.json());
    } else {
      const res = await fetch("/api/users");
      if (res.ok) setMembers(await res.json());
    }
    setLoading(false);
  }, [isSuper]);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user, fetchData]);

  async function handleCreateOrg(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    const res = await fetch("/api/organizations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orgForm),
    });

    if (res.ok) {
      toast.success("組織を作成しました");
      setOrgForm({ code: "", name: "", billingExempt: false });
      setOrgDialogOpen(false);
      fetchData();
    } else {
      const data = await res.json();
      toast.error(data.error || "作成に失敗しました");
    }
    setSubmitting(false);
  }

  async function handleToggleExempt(org: OrgRecord) {
    const res = await fetch(`/api/organizations/${org.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ billingExempt: !org.billingExempt }),
    });

    if (res.ok) {
      toast.success(
        !org.billingExempt ? "課金免除にしました" : "課金免除を解除しました"
      );
      fetchData();
    } else {
      toast.error("変更に失敗しました");
    }
  }

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    const body: Record<string, string> = {
      name: memberForm.name,
      email: memberForm.email,
      password: memberForm.password,
      role: memberForm.role,
    };
    // super_admin のみ対象組織を指定(admin はサーバ側で自組織に固定される)
    if (isSuper && memberDialogOrgId) body.orgId = memberDialogOrgId;

    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      toast.success("メンバーを追加しました");
      setMemberForm(EMPTY_MEMBER_FORM);
      setMemberDialogOrgId(null);
      fetchData();
    } else {
      const data = await res.json();
      toast.error(data.error || "追加に失敗しました");
    }
    setSubmitting(false);
  }

  async function handleToggleRole(member: MemberRecord) {
    const nextRole = member.role === "admin" ? "member" : "admin";
    const res = await fetch(`/api/users/${member.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: nextRole }),
    });

    if (res.ok) {
      toast.success(
        nextRole === "admin"
          ? `${member.name} を管理者にしました`
          : `${member.name} をユーザーにしました`
      );
      fetchData();
    } else {
      const data = await res.json();
      toast.error(data.error || "変更に失敗しました");
    }
  }

  async function handleDeleteMember(member: MemberRecord) {
    if (
      !confirm(`${member.name} を削除しますか？この操作は取り消せません。`)
    )
      return;

    const res = await fetch(`/api/users/${member.id}`, { method: "DELETE" });

    if (res.ok) {
      toast.success("メンバーを削除しました");
      fetchData();
    } else {
      const data = await res.json();
      toast.error(data.error || "削除に失敗しました");
    }
  }

  function renderMemberRow(member: MemberRecord) {
    const isSelf = member.id === user?.id;
    const canOperate = !isSelf && member.role !== "super_admin";
    return (
      <div key={member.id} className="flex items-center justify-between py-2">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600">
            {member.name.charAt(0)}
          </div>
          <div>
            <p className="text-sm text-gray-900">{member.name}</p>
            <p className="text-xs text-gray-500">{member.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <RoleBadge role={member.role} />
          {isSelf && <Badge variant="outline">自分</Badge>}
          {canOperate && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => handleToggleRole(member)}
              >
                {member.role === "admin" ? "ユーザーにする" : "管理者にする"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                onClick={() => handleDeleteMember(member)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return <p className="text-gray-500 text-center py-8">読み込み中...</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {isSuper ? "組織管理" : "メンバー管理"}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {isSuper
              ? "事業所IDの発行・メンバー管理・課金免除の設定"
              : "自組織のメンバーの追加・編集・削除"}
          </p>
        </div>
        {isSuper ? (
          <Dialog open={orgDialogOpen} onOpenChange={setOrgDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Building2 className="w-4 h-4 mr-1.5" />
                組織を追加
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>新しい組織を作成</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateOrg} className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label>事業所ID</Label>
                  <Input
                    value={orgForm.code}
                    onChange={(e) =>
                      setOrgForm({
                        ...orgForm,
                        code: e.target.value.toUpperCase(),
                      })
                    }
                    placeholder="例: ABC001"
                    required
                  />
                  <p className="text-xs text-gray-500">
                    ログイン時に入力してもらうIDです（3〜20文字の英数字）
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>組織名</Label>
                  <Input
                    value={orgForm.name}
                    onChange={(e) =>
                      setOrgForm({ ...orgForm, name: e.target.value })
                    }
                    placeholder="株式会社〇〇"
                    required
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={orgForm.billingExempt}
                    onChange={(e) =>
                      setOrgForm({ ...orgForm, billingExempt: e.target.checked })
                    }
                  />
                  課金免除（プラン契約なしで全機能を利用可能にする）
                </label>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? "作成中..." : "組織を作成"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        ) : (
          <Button size="sm" onClick={() => setMemberDialogOrgId("own")}>
            <UserPlus className="w-4 h-4 mr-1.5" />
            メンバー追加
          </Button>
        )}
      </div>

      {isSuper ? (
        <div className="space-y-4">
          {orgs.map((org) => (
            <Card key={org.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
                      <Building2 className="w-4 h-4 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {org.name}
                      </p>
                      <p className="text-xs text-gray-500 font-mono">
                        {org.code}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      className={
                        org.billingExempt
                          ? "bg-amber-100 text-amber-800"
                          : org.plan && org.subscriptionStatus === "active"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-600"
                      }
                    >
                      {planLabel(org)}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => handleToggleExempt(org)}
                    >
                      {org.billingExempt ? "免除を解除" : "課金免除にする"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setMemberDialogOrgId(org.id)}
                    >
                      <UserPlus className="w-3.5 h-3.5 mr-1" />
                      メンバー追加
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="divide-y divide-gray-100">
                  {org.User.map(renderMemberRow)}
                  {org.User.length === 0 && (
                    <p className="text-sm text-gray-500 py-2">
                      メンバーがいません
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {orgs.length === 0 && (
            <p className="text-center text-gray-500 py-8">
              組織がありません。「組織を追加」から作成してください。
            </p>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-4">
            <div className="divide-y divide-gray-100">
              {members.map(renderMemberRow)}
              {members.length === 0 && (
                <p className="text-sm text-gray-500 py-2">メンバーがいません</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog
        open={memberDialogOrgId !== null}
        onOpenChange={(open) => {
          if (!open) setMemberDialogOrgId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>メンバーを追加</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddMember} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>名前</Label>
              <Input
                value={memberForm.name}
                onChange={(e) =>
                  setMemberForm({ ...memberForm, name: e.target.value })
                }
                placeholder="山田 太郎"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>メールアドレス</Label>
              <Input
                type="email"
                value={memberForm.email}
                onChange={(e) =>
                  setMemberForm({ ...memberForm, email: e.target.value })
                }
                placeholder="email@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>パスワード</Label>
              <Input
                type="password"
                value={memberForm.password}
                onChange={(e) =>
                  setMemberForm({ ...memberForm, password: e.target.value })
                }
                placeholder="初期パスワード"
                required
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label>権限</Label>
              <Select
                value={memberForm.role}
                onValueChange={(v) =>
                  setMemberForm({ ...memberForm, role: v as "admin" | "member" })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">ユーザー</SelectItem>
                  <SelectItem value="admin">管理者</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                管理者は組織のメンバー・マスタ・プランを管理できます
              </p>
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "追加中..." : "メンバーを追加"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
