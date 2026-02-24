import { redirect } from "next/navigation";

export default function NewPostingRedirect() {
  redirect("/jobs");
}
