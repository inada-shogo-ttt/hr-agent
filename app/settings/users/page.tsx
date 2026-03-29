"use client";

import { useEffect, useState } from "react";
import { useUser } from "@/app/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { UserPlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { UserRole } from "@/types/auth";

interface UserRecord {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
}

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "管理者",
  editor: "作成者",
  reviewer: "承認者",
  publisher: "掲載担当",
};

const ROLE_COLORS: Record<UserRole, string> = {
  admin: "bg-red-100 text-red-800",
  editor: "bg-blue-100 text-blue-800",
  reviewer: "bg-green-100 text-green-800",
  publisher: "bg-purple-100 text-purple-800",
};

export default function UsersPage() {
  const { user } = useUser();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    email: "",
    name: "",
    role: "editor" as UserRole,
    password: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    const res = await fetch("/api/users");
    if (res.ok) {
      setUsers(await res.json());
    }
    setLoading(false);
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      toast.success("ユーザーを作成しました");
      setForm({ email: "", name: "", role: "editor", password: "" });
      setDialogOpen(false);
      fetchUsers();
    } else {
      const data = await res.json();
      toast.error(data.error || "作成に失敗しました");
    }
    setSubmitting(false);
  }

  async function handleRoleChange(userId: string, newRole: UserRole) {
    const res = await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });

    if (res.ok) {
      toast.success("ロールを変更しました");
      fetchUsers();
    } else {
      toast.error("変更に失敗しました");
    }
  }

  async function handleDelete(userId: string, userName: string) {
    if (!confirm(`${userName} を削除しますか？この操作は取り消せません。`)) return;

    const res = await fetch(`/api/users/${userId}`, { method: "DELETE" });

    if (res.ok) {
      toast.success("ユーザーを削除しました");
      fetchUsers();
    } else {
      const data = await res.json();
      toast.error(data.error || "削除に失敗しました");
    }
  }

  if (loading) {
    return <p className="text-gray-500 text-center py-8">読み込み中...</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">ユーザー管理</h2>
          <p className="text-sm text-gray-500 mt-1">
            チームメンバーの招待・ロール管理
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <UserPlus className="w-4 h-4 mr-1.5" />
              ユーザーを追加
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新しいユーザーを追加</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleInvite} className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>名前</Label>
                <Input
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                  placeholder="山田 太郎"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>メールアドレス</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm({ ...form, email: e.target.value })
                  }
                  placeholder="email@example.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>パスワード</Label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  placeholder="初期パスワード"
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label>ロール</Label>
                <Select
                  value={form.role}
                  onValueChange={(v) =>
                    setForm({ ...form, role: v as UserRole })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="editor">作成者 (Editor)</SelectItem>
                    <SelectItem value="publisher">掲載担当 (Publisher)</SelectItem>
                    <SelectItem value="admin">管理者 (Admin)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "作成中..." : "ユーザーを作成"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {users.map((u) => (
          <Card key={u.id}>
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium text-gray-600">
                  {u.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{u.name}</p>
                  <p className="text-xs text-gray-500">{u.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {u.id === user?.id ? (
                  <Badge className={ROLE_COLORS[u.role]}>
                    {ROLE_LABELS[u.role]}（自分）
                  </Badge>
                ) : (
                  <>
                    <Select
                      value={u.role}
                      onValueChange={(v) =>
                        handleRoleChange(u.id, v as UserRole)
                      }
                    >
                      <SelectTrigger className="w-32 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="editor">作成者</SelectItem>
                        <SelectItem value="publisher">掲載担当</SelectItem>
                        <SelectItem value="admin">管理者</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                      onClick={() => handleDelete(u.id, u.name)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {users.length === 0 && (
          <p className="text-center text-gray-500 py-8">
            ユーザーがいません。「ユーザーを追加」から招待してください。
          </p>
        )}
      </div>
    </div>
  );
}
