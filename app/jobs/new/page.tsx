"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft } from "lucide-react";

export default function NewJobPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [officeName, setOfficeName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [employmentType, setEmploymentType] = useState("正社員");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!officeName || !jobTitle) return;

    setIsSubmitting(true);

    const res = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ officeName, jobTitle, employmentType }),
    });

    if (res.ok) {
      const job = await res.json();
      router.push(`/jobs/${job.id}`);
    } else {
      setIsSubmitting(false);
      alert("登録に失敗しました");
    }
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 py-8">
        <Link
          href="/jobs"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ChevronLeft className="w-4 h-4" />
          求人一覧に戻る
        </Link>

        <Card>
          <CardHeader>
            <CardTitle>新規求人を登録</CardTitle>
            <CardDescription>
              事業所名・職種・雇用形態を登録してください。登録後にTeam Aで原稿を作成できます。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="officeName">事業所名 *</Label>
                <Input
                  id="officeName"
                  value={officeName}
                  onChange={(e) => setOfficeName(e.target.value)}
                  placeholder="株式会社〇〇 渋谷事業所"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="jobTitle">職種 *</Label>
                <Input
                  id="jobTitle"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="営業事務、看護師、調理スタッフなど"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="employmentType">雇用形態 *</Label>
                <Select value={employmentType} onValueChange={setEmploymentType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="正社員">正社員</SelectItem>
                    <SelectItem value="パート">パート</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "登録中..." : "求人を登録する"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
