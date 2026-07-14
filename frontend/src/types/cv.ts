export type CvSectionType =
  | "basic_info"
  | "education"
  | "certificates"
  | "career"
  | "activities"
  | "projects";

export interface CvSection {
  sectionId: number;
  sectionType: CvSectionType;
  title: string;
  content: string;
  sortOrder: number;
}

export interface CvDocument {
  cvId: number;
  fileName: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  sections: CvSection[];
}
