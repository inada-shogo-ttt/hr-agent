export type UserRole = "admin" | "editor" | "reviewer" | "publisher";

export type JobStatus = "draft" | "confirmed" | "awaiting_republish";

export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}
