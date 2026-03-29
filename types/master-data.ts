import { JobStatus } from "./auth";

export interface JobType {
  id: string;
  name: string;
  createdAt: string;
}

export interface EmploymentType {
  id: string;
  name: string;
  createdAt: string;
}

export interface Office {
  id: string;
  name: string;
  createdBy: string | null;
  createdAt: string;
}

export interface JobWithMasters {
  id: string;
  officeId: string;
  jobTypeId: string;
  employmentTypeId: string;
  status: JobStatus;
  createdBy: string | null;
  assignedReviewer: string | null;
  createdAt: string;
  updatedAt: string;
  officeName: string;
  jobTypeName: string;
  employmentTypeName: string;
}

export interface OfficeAssignment {
  jobTypeId: string;
  employmentTypeIds: string[];
}
