export type PublishRequestStatus =
  | "pending"
  | "publishing"
  | "completed"
  | "expired";

export type Platform = "indeed" | "airwork" | "jobmedley" | "hellowork";

export interface PublishRequest {
  id: string;
  jobId: string;
  platform: Platform;
  status: PublishRequestStatus;
  assignedTo: string;
  requestedBy: string;
  startDate: string | null;
  endDate: string | null;
  actualStartDate: string | null;
  actualEndDate: string | null;
  createdAt: string;
  updatedAt: string;
  assignedUser?: { id: string; name: string };
  requestedUser?: { id: string; name: string };
}
