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
  notice_id: string;
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

export interface StudentProfile {
  branch: string;
  year: string;
  cgpa: number;
  active_backlogs: boolean;
}

export interface EligibilityEvaluation {
  eligible: boolean;
  branch_eligible: boolean;
  year_eligible: boolean;
  cgpa_eligible: boolean;
  reasons: string[];
  manual_checks: string[];
  evidence_snippet?: string | null;
}

export interface QuestionResponse {
  answer: string;
}

export interface CalendarSyncResponse {
  success: boolean;
  synced_events_count: number;
  message: string;
  events?: Array<{ title?: string; event_id?: string; html_link?: string }>;
}
