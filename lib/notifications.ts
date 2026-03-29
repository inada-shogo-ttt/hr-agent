import { supabaseAdmin } from "@/lib/supabase/admin";

type NotificationType =
  | "publish_requested"
  | "publish_started"
  | "publish_completed"
  | "metrics_entered"
  | "all_expired"
  | "manuscript_modified";

export async function createNotification(
  userId: string,
  jobId: string,
  type: NotificationType,
  title: string,
  body?: string
) {
  await supabaseAdmin.from("Notification").insert({
    userId,
    jobId,
    type,
    title,
    body,
  });
}
