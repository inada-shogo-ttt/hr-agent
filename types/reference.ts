export interface ReferencePostingData {
  id: string;
  title: string;
  platform: string;
  industry: string;
  jobType: string;
  postingData: Record<string, string>;
  performance?: string;
}
