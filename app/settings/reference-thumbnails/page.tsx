"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Upload, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { fileToCompressedDataUrl } from "@/lib/client-image";

type ReferenceSlot = 1 | 2 | 3 | 4 | 5;

interface ReferenceThumbnailItem {
  id: string;
  slot: ReferenceSlot;
  url: string;
  description: string | null;
  createdAt: string;
}

const SLOT_SECTIONS: { slot: ReferenceSlot; title: string; description: string }[] = [
  {
    slot: 1,
    title: "1枚目（クリック率重視）",
    description: "人物1名+キャッチコピー文字入りの構図事例。テキストのフォント・サイズ・人物の配置が参考にされます",
  },
  {
    slot: 2,
    title: "2枚目（職場の雰囲気）",
    description: "スタッフ2〜3名が楽しく働くシーンの構図事例",
  },
  {
    slot: 3,
    title: "3枚目（事業所の様子）",
    description: "職場空間が伝わる構図事例",
  },
  {
    slot: 4,
    title: "4枚目（待遇・数字訴求）",
    description: "給与・休日などの数字コピーを載せる構図事例。未登録の間は構図参考なしで生成されます",
  },
  {
    slot: 5,
    title: "5枚目（働く人・仕事シーン）",
    description: "実際の業務の1コマが伝わる構図事例。未登録の間は構図参考なしで生成されます",
  },
];

export default function ReferenceThumbnailsPage() {
  const [items, setItems] = useState<ReferenceThumbnailItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingSlot, setUploadingSlot] = useState<number | null>(null);
  const [descriptions, setDescriptions] = useState<Record<number, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<ReferenceThumbnailItem | null>(null);
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  useEffect(() => { fetchItems(); }, []);

  async function fetchItems() {
    const res = await fetch("/api/reference-thumbnails");
    if (res.ok) setItems(await res.json());
    else toast.error("参考サムネの取得に失敗しました");
    setLoading(false);
  }

  async function handleUpload(slot: ReferenceSlot, e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    const input = fileInputRefs.current[slot];
    if (!files?.length) return;
    setUploadingSlot(slot);

    try {
      const images: string[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;
        images.push(await fileToCompressedDataUrl(file));
      }
      if (images.length === 0) return;

      const res = await fetch("/api/reference-thumbnails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images,
          slot,
          description: descriptions[slot] || "",
        }),
      });
      if (res.ok) {
        toast.success(`${images.length}枚を登録しました`);
        setDescriptions((prev) => ({ ...prev, [slot]: "" }));
        fetchItems();
      } else {
        const data = await res.json();
        toast.error(data.error || "登録に失敗しました");
      }
    } catch {
      toast.error("画像の処理に失敗しました");
    } finally {
      setUploadingSlot(null);
      if (input) input.value = "";
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const res = await fetch(`/api/reference-thumbnails/${deleteTarget.id}`, { method: "DELETE" });
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
      <div className="mb-6">
        <h2 className="text-lg font-semibold">参考サムネ</h2>
        <p className="text-sm text-gray-500 mt-1">
          サムネイル生成時に構図（フォント・文字サイズ・人物の配置など）の参考として使われる事例画像です。
          全アカウント共通で反映され、スロットごとに求人内容に合う1枚をAIが自動選定します。
        </p>
      </div>

      <div className="space-y-8">
        {SLOT_SECTIONS.map(({ slot, title, description }) => {
          const slotItems = items.filter((item) => item.slot === slot);
          return (
            <section key={slot}>
              <div className="mb-2">
                <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
                <p className="text-xs text-gray-500">{description}</p>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {slotItems.map((item) => (
                  <div
                    key={item.id}
                    className="relative aspect-[4/3] rounded-lg overflow-hidden border bg-gray-100 group"
                  >
                    <img
                      src={item.url}
                      alt={item.description || `スロット${slot}の参考サムネ`}
                      className="w-full h-full object-cover"
                    />
                    {item.description && (
                      <span className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[10px] px-1.5 py-0.5 truncate">
                        {item.description}
                      </span>
                    )}
                    <button
                      onClick={() => setDeleteTarget(item)}
                      className="absolute top-1 right-1 w-6 h-6 bg-red-500/90 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="削除"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                <input
                  ref={(el) => { fileInputRefs.current[slot] = el; }}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handleUpload(slot, e)}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRefs.current[slot]?.click()}
                  disabled={uploadingSlot !== null}
                  className="aspect-[4/3] rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 flex flex-col items-center justify-center gap-1 transition-colors"
                >
                  {uploadingSlot === slot ? (
                    <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                  ) : (
                    <>
                      <Upload className="w-5 h-5 text-gray-400" />
                      <span className="text-[11px] text-gray-500">アップロード</span>
                    </>
                  )}
                </button>
              </div>

              <div className="mt-2 max-w-sm">
                <Input
                  value={descriptions[slot] || ""}
                  onChange={(e) =>
                    setDescriptions((prev) => ({ ...prev, [slot]: e.target.value }))
                  }
                  placeholder="メモ（任意。例: 介護向け・文字大きめ）— アップロード時に付与されます"
                  className="h-8 text-xs"
                />
              </div>
            </section>
          );
        })}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>この参考サムネを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              全アカウントのサムネイル生成で参照されなくなります。この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
