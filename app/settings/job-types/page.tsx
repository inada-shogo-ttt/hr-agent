"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";

const COLOR_PALETTE = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308",
  "#84cc16", "#22c55e", "#10b981", "#14b8a6",
  "#06b6d4", "#0ea5e9", "#3b82f6", "#6366f1",
  "#8b5cf6", "#a855f7", "#d946ef", "#ec4899",
  "#f43f5e", "#78716c", "#6b7280", "#475569",
];

interface JobTypeRecord {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}

function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="w-7 h-7 rounded-full border-2 border-white shadow-sm shrink-0 transition-transform hover:scale-110"
          style={{ backgroundColor: value }}
        />
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <div className="grid grid-cols-5 gap-1.5">
          {COLOR_PALETTE.map((color) => (
            <button
              key={color}
              className={`w-7 h-7 rounded-full transition-transform hover:scale-110 ${
                value === color
                  ? "ring-2 ring-offset-1 ring-gray-900"
                  : ""
              }`}
              style={{ backgroundColor: color }}
              onClick={() => onChange(color)}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function JobTypesPage() {
  const [items, setItems] = useState<JobTypeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(COLOR_PALETTE[0]);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<JobTypeRecord | null>(null);

  useEffect(() => { fetchItems(); }, []);

  async function fetchItems() {
    const res = await fetch("/api/settings/job-types");
    if (res.ok) setItems(await res.json());
    setLoading(false);
  }

  function getNextColor() {
    const usedColors = items.map((i) => i.color);
    const available = COLOR_PALETTE.filter((c) => !usedColors.includes(c));
    return available.length > 0 ? available[0] : COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const res = await fetch("/api/settings/job-types", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, color: newColor }),
    });
    if (res.ok) {
      toast.success("職種を追加しました");
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
    const res = await fetch(`/api/settings/job-types/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName, color: editColor }),
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

  async function handleColorChange(id: string, color: string) {
    const res = await fetch(`/api/settings/job-types/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ color }),
    });
    if (res.ok) {
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, color } : i)));
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const res = await fetch(`/api/settings/job-types/${deleteTarget.id}`, { method: "DELETE" });
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
        <h2 className="text-lg font-semibold">職種マスタ</h2>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          if (open) setNewColor(getNextColor());
          setDialogOpen(open);
        }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-1.5" />職種を追加</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>職種を追加</DialogTitle></DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4 mt-2">
              <div className="flex items-center gap-3">
                <ColorPicker value={newColor} onChange={setNewColor} />
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="介護職"
                  required
                  className="flex-1"
                />
              </div>
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
                <div className="flex items-center gap-3 flex-1">
                  <ColorPicker value={editColor} onChange={setEditColor} />
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-8 text-sm flex-1"
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
                  <div className="flex items-center gap-3">
                    <ColorPicker
                      value={item.color}
                      onChange={(color) => handleColorChange(item.id, color)}
                    />
                    <span className="text-sm font-medium">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost" size="sm" className="h-8 w-8 p-0"
                      onClick={() => { setEditingId(item.id); setEditName(item.name); setEditColor(item.color); }}
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
          <p className="text-center text-gray-500 py-8">職種が登録されていません</p>
        )}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>「{deleteTarget?.name}」を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この職種に紐づく全ての求人とその履歴データも削除されます。この操作は取り消せません。
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
