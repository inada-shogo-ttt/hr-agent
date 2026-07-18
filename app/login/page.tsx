"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogIn } from "lucide-react";

const LOGIN_ERROR =
  "事業所ID、メールアドレス、またはパスワードが正しくありません";

export default function LoginPage() {
  const [orgCode, setOrgCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(LOGIN_ERROR);
      setLoading(false);
      return;
    }

    // 事業所IDの照合(不一致ならセッションを破棄)
    const res = await fetch("/api/auth/verify-org", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: orgCode }),
    });
    const result = res.ok ? await res.json() : { valid: false };

    if (!result.valid) {
      await supabase.auth.signOut();
      setError(LOGIN_ERROR);
      setLoading(false);
      return;
    }

    router.push("/jobs");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <span className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gray-900 text-white text-lg font-bold">
              採
            </span>
          </div>
          <CardTitle className="text-xl font-semibold">採用エージェント</CardTitle>
          <p className="text-sm text-gray-500 mt-1">
            アカウントにログインしてください
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="orgCode">事業所ID</Label>
              <Input
                id="orgCode"
                type="text"
                value={orgCode}
                onChange={(e) => setOrgCode(e.target.value)}
                placeholder="例: TTT001"
                autoCapitalize="characters"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">パスワード</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="パスワードを入力"
                required
              />
            </div>
            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">
                {error}
              </p>
            )}
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              <LogIn className="w-4 h-4 mr-2" />
              {loading ? "ログイン中..." : "ログイン"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
