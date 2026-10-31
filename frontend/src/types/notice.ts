export interface Evidence {
  snippet: string;
  page: number | null;
}

export interface DeadlineItem {
  id?: string;
  label: string;
  date: string | null;
  needs_confirmation?: boolean;
  evidence?: Evidence;
}

export interface EligibilityInfo {
  branches?: string[];
  years?: string[];
  min_cgpa?: number | null;
  other_conditions?: string[];
  evidence?: Evidence;
}

export interface RequiredDocument {
  id?: string;
  name: string;
  evidence?: Evidence;
}

export interface TaskItem {
  id?: string;
  title: string;
  due?: string | null;
  done?: boolean;
}

export interface NoticeExtractionResult {
  notice_id?: string;
  title: string;
  summary?: string;
  deadlines: DeadlineItem[];
  eligibility?: EligibilityInfo | null;
  required_documents: RequiredDocument[];
  tasks?: TaskItem[];
}

export type ProcessingStep = 
  | 'reading'
  | 'extracting'
  | 'documents'
  | 'evidence';

export interface StepStatus {
  id: ProcessingStep;
  label: string;
}

