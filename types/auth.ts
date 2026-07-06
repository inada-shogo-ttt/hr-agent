export type UserRole = "admin" | "editor" | "reviewer" | "publisher";

export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}
