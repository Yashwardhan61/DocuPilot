import { 
  NoticeExtractionResult, 
  StudentProfile, 
  EligibilityEvaluation, 
  CalendarSyncResponse,
  QuestionResponse 
} from '../types/notice';
import { NoticeInput } from '../components/NoticeUpload/NoticeUpload';

const API_BASE = '/api';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export const api = {
  // Extract notice facts from PDF or raw text
  async extractNotice(input: NoticeInput): Promise<NoticeExtractionResult> {
    const formData = new FormData();

    if (input.type === 'file') {
      formData.append('file', input.file);
    } else {
      formData.append('raw_text', input.text);
      formData.append('text', input.text);
    }

    const response = await fetch(`${API_BASE}/notices`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      let errorMsg = 'Failed to process notice';
      try {
        const errorData = await response.json();
        errorMsg = errorData.detail || errorMsg;
      } catch {
        // use default
      }
      throw new ApiError(errorMsg, response.status);
    }

    const data = await response.json();
    return {
      notice_id: data.notice_id || 'notice-latest',
      title: data.title || 'Extracted Notice',
      summary: data.summary || '',
      deadlines: data.deadlines || [],
      eligibility: data.eligibility || {
        branches: [],
        years: [],
        min_cgpa: null,
        other_conditions: [],
      },
      required_documents: data.required_documents || [],
      tasks: data.tasks || [],
    };
  },

  // Check student eligibility for a notice
  async checkEligibility(
    noticeId: string,
    profile?: Partial<StudentProfile>
  ): Promise<EligibilityEvaluation> {
    const params = new URLSearchParams();
    if (profile?.branch) params.append('branch', profile.branch);
    if (profile?.year) params.append('year', profile.year);
    if (profile?.cgpa !== undefined) params.append('cgpa', profile.cgpa.toString());
    if (profile?.active_backlogs !== undefined) {
      params.append('active_backlogs', profile.active_backlogs.toString());
    }

    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await fetch(`${API_BASE}/notices/${noticeId}/eligibility${query}`);

    if (!response.ok) {
      throw new ApiError('Failed to calculate eligibility', response.status);
    }

    return response.json();
  },

  // Retrieve current student profile
  async getProfile(): Promise<StudentProfile> {
    try {
      const response = await fetch(`${API_BASE}/profile`);
      if (response.ok) {
        return response.json();
      }
    } catch {
      // fallback
    }
    return {
      branch: 'CSE',
      year: '3rd',
      cgpa: 8.0,
      active_backlogs: false,
    };
  },

  // Save student profile
  async saveProfile(profile: StudentProfile): Promise<StudentProfile> {
    const response = await fetch(`${API_BASE}/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    });

    if (!response.ok) {
      throw new ApiError('Failed to save profile', response.status);
    }

    return response.json();
  },

  // Grounded question answering
  async askQuestion(noticeId: string, question: string): Promise<string> {
    const response = await fetch(`${API_BASE}/notices/${noticeId}/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    });

    if (!response.ok) {
      let errorMsg = 'Failed to answer question';
      try {
        const errorData = await response.json();
        errorMsg = errorData.detail || errorMsg;
      } catch {
        // use default
      }
      throw new ApiError(errorMsg, response.status);
    }

    const data: QuestionResponse = await response.json();
    return data.answer;
  },

  // Sync to Google Calendar
  async syncGoogleCalendar(noticeId: string): Promise<CalendarSyncResponse> {
    const response = await fetch(`${API_BASE}/notices/${noticeId}/sync-google-calendar`, {
      method: 'POST',
    });

    if (!response.ok) {
      let errorMsg = 'Failed to sync with Google Calendar';
      try {
        const errorData = await response.json();
        errorMsg = errorData.detail || errorMsg;
      } catch {
        // use default
      }
      throw new ApiError(errorMsg, response.status);
    }

    return response.json();
  },

  // RFC 5545 calendar file download url
  getIcsDownloadUrl(noticeId: string): string {
    return `${API_BASE}/notices/${noticeId}/calendar.ics`;
  },
};
