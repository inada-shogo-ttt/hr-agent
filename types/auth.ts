// super_admin: 最高管理者(運営者)。全操作可能
// admin: 組織の管理者。自組織のメンバー管理・マスタ・プランのみ
// member: 一般ユーザー。設定画面は非表示
export type UserRole = "super_admin" | "admin" | "member";

export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  orgId: string;
}
