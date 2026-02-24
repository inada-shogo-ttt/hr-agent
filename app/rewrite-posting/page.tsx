import { redirect } from "next/navigation";

export default function RewritePostingRedirect() {
  redirect("/jobs");
}
