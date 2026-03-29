import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AppUser, UserRole } from "@/types/auth";
import { NextResponse } from "next/server";

export async function getAuthUser(): Promise<AppUser | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("User")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  return {
    id: profile.id,
    email: profile.email,
    name: profile.name,
    role: profile.role as UserRole,
  };
}

export async function requireAuth(): Promise<
  { user: AppUser } | { error: NextResponse }
> {
  const user = await getAuthUser();
  if (!user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { user };
}

export async function requireRole(
  allowedRoles: UserRole[]
): Promise<{ user: AppUser } | { error: NextResponse }> {
  const result = await requireAuth();
  if ("error" in result) return result;

  if (!allowedRoles.includes(result.user.role)) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return result;
}
