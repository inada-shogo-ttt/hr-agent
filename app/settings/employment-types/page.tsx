"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";

interface EmploymentTypeRecord {
  id: string;
  name: string;
  createdAt: string;
}

export default function EmploymentTypesPage() {
  const [items, setItems] = useState<EmploymentTypeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<EmploymentTypeRecord | null>(null);

  useEffect(() => { fetchItems(); }, []);

  async function fetchItems() {
    const res = await fetch("/api/settings/employment-types");
    if (res.ok) setItems(await res.json());
    setLoading(false);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const res = await fetch("/api/settings/employment-types", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });
    if (res.ok) {
      toast.success("勤務形態を追加しました");
      setNewName("");
      setDialogOpen(false);
      fetchItems();
    } else {
      const data = await res.json();
      toast.error(data.error);
    }
    setSubmitting(false);
  }

  async function handleEdit(id: string) {
    const res = await fetch(`/api/settings/employment-types/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName }),
    });
    if (res.ok) {
      toast.success("更新しました");
      setEditingId(null);
      fetchItems();
    } else {
      const data = await res.json();
      toast.error(data.error);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const res = await fetch(`/api/settings/employment-types/${deleteTarget.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("削除しました");
      fetchItems();
    } else {
      toast.error("削除に失敗しました");
    }
    setDeleteTarget(null);
  }

  if (loading) return <p className="text-gray-500 text-center py-8">読み込み中...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold">勤務形態マスタ</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-1.5" />勤務形態を追加</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>勤務形態を追加</DialogTitle></DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4 mt-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="正社員"
                required
              />
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "追加中..." : "追加"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {items.map((item) => (
          <Card key={item.id}>
            <CardContent className="flex items-center justify-between py-3">
              {editingId === item.id ? (
                <div className="flex items-center gap-2 flex-1">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-8 text-sm"
                    autoFocus
                  />
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleEdit(item.id)}>
                    <Check className="w-4 h-4 text-green-600" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setEditingId(null)}>
                    <X className="w-4 h-4 text-gray-400" />
                  </Button>
                </div>
              ) : (
                <>
                  <span className="text-sm font-medium">{item.name}</span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost" size="sm" className="h-8 w-8 p-0"
                      onClick={() => { setEditingId(item.id); setEditName(item.name); }}
                    >
                      <Pencil className="w-3.5 h-3.5 text-gray-400" />
                    </Button>
                    <Button
                      variant="ghost" size="sm" className="h-8 w-8 p-0"
                      onClick={() => setDeleteTarget(item)}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ))}
        {items.length === 0 && (
          <p className="text-center text-gray-500 py-8">勤務形態が登録されていません</p>
        )}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>「{deleteTarget?.name}」を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この勤務形態に紐づく全ての求人とその履歴データも削除されます。この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">削除する</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
