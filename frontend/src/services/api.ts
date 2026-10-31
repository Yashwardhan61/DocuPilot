import { 
  NoticeExtractionResult, 
  StudentProfile, 
  EligibilityEvaluation, 
  CalendarSyncResponse,
  QuestionResponse,
  CourseMetadata
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
    if (profile?.course) params.append('course', profile.course);
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

  // Get duration and year structure for a course
  async getCourseDuration(course: string): Promise<CourseMetadata> {
    const response = await fetch(`${API_BASE}/course/duration?course=${encodeURIComponent(course)}`);
    if (!response.ok) {
      throw new ApiError('Failed to fetch course duration', response.status);
    }
    return response.json();
  },

  // Analyze a custom course with AI
  async analyzeCourse(course: string): Promise<CourseMetadata> {
    const response = await fetch(`${API_BASE}/course/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ course }),
    });
    if (!response.ok) {
      throw new ApiError('Failed to analyze course with AI', response.status);
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

  // Sync to Google Calendar with 12h & 3h prior reminders directly
  async syncGoogleCalendar(noticeId: string, email?: string, accessToken?: string): Promise<CalendarSyncResponse> {
    const params = new URLSearchParams();
    if (email) params.append('email', email);
    if (accessToken) params.append('access_token', accessToken);

    const query = params.toString() ? `?${params.toString()}` : '';
    const headers: Record<string, string> = {};
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const response = await fetch(`${API_BASE}/notices/${noticeId}/sync-google-calendar${query}`, {
      method: 'POST',
      headers,
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

  // RFC 5545 calendar file download url with 12h & 3h VALARM triggers
  getIcsDownloadUrl(noticeId: string, email?: string): string {
    return email
      ? `${API_BASE}/notices/${noticeId}/calendar.ics?email=${encodeURIComponent(email)}`
      : `${API_BASE}/notices/${noticeId}/calendar.ics`;
  },

  // Generates direct 1-click Google Calendar Web Intent URL for student's personal calendar
  generateDirectGoogleCalendarUrl(params: {
    noticeTitle: string;
    label: string;
    date: string;
    email?: string;
    snippet?: string;
  }): string {
    const cleanDate = params.date.replace(/[^0-9]/g, '');
    const dateFormatted = cleanDate.length >= 8 ? cleanDate.slice(0, 8) : new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const datesParam = `${dateFormatted}/${dateFormatted}`;

    const title = `[DocuPilot] ${params.label} - ${params.noticeTitle}`;
    const details = `Notice: ${params.noticeTitle}\nMilestone: ${params.label}\nEvidence: ${params.snippet || 'Extracted via DocuPilot'}\n\nAutomated reminder alarms: 12h & 3h prior scheduled.`;

    const urlParams = new URLSearchParams({
      action: 'TEMPLATE',
      text: title,
      dates: datesParam,
      details: details,
    });

    if (params.email && params.email.includes('@')) {
      urlParams.append('add', params.email);
      urlParams.append('authuser', params.email);
    }

    return `https://calendar.google.com/calendar/render?${urlParams.toString()}`;
  },
};
