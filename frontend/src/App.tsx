import React, { useState, useRef, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthModal from './components/Auth/AuthModal';
import { NoticeUpload, NoticeInput } from './components/NoticeUpload/NoticeUpload';
import { LoadingSkeleton } from './components/LoadingSkeleton/LoadingSkeleton';
import { ExtractionResults } from './components/ExtractionResults/ExtractionResults';
import { EvidenceModal } from './components/EvidenceModal/EvidenceModal';
import { NoticeExtractionResult, ProcessingStep, Evidence, StudentProfile } from './types/notice';
import { Compass, Sparkles, UserCheck, Shield, LogOut, User } from 'lucide-react';
import { api } from './services/api';

// Sample MNNIT notice extraction result for demonstration and fallback
const SAMPLE_MNNIT_RESULT: NoticeExtractionResult = {
  notice_id: 'mnnit-tnp-2026-104',
  title: 'Campus Recruitment Drive 2026-27: Google India Software Engineering Intern',
  summary:
    'Training and Placement Cell, MNNIT Allahabad invites applications from eligible Pre-Final Year B.Tech and MCA students for Summer Internship 2027.',
  deadlines: [
    {
      id: 'd-1',
      label: 'Portal Registration & Resume Submission',
      date: '2026-11-05',
      needs_confirmation: false,
      evidence: {
        snippet: 'Interested candidates must register on the T&P portal and upload their resume by 5th Nov 2026, 5:00 PM.',
        page: 1,
      },
    },
    {
      id: 'd-2',
      label: 'Online Coding Challenge',
      date: '2026-11-12',
      needs_confirmation: true,
      evidence: {
        snippet: 'The online assessment link will be active tentatively around 12th November; students will receive confirmation 24 hours prior.',
        page: 1,
      },
    },
    {
      id: 'd-3',
      label: 'Technical & HR Interviews',
      date: null,
      needs_confirmation: true,
      evidence: {
        snippet: 'Interview rounds will commence immediately after shortlisting results are declared by the recruiter.',
        page: 2,
      },
    },
  ],
  eligibility: {
    branches: ['Computer Science', 'Information Tech', 'Electronics & Comm.'],
    years: ['3rd Year B.Tech', '2nd Year MCA'],
    min_cgpa: 7.5,
    other_conditions: [
      'No active backlogs at the time of registration',
      'Minimum 70% in Class 10th and 12th board exams',
    ],
    evidence: {
      snippet: 'Eligibility: B.Tech (CSE, IT, ECE) & MCA candidates having CGPA >= 7.50 with zero current backlogs.',
      page: 1,
    },
  },
  required_documents: [
    {
      id: 'doc-1',
      name: 'Latest Verified College Grade Card (All Semesters)',
      evidence: { snippet: 'Students must submit semester grade sheets authenticated by the academic section.', page: 2 },
    },
    {
      id: 'doc-2',
      name: 'Single Page Resume (PDF format)',
      evidence: { snippet: 'Submit standard 1-page resume strictly adhering to MNNIT T&P template.', page: 2 },
    },
    {
      id: 'doc-3',
      name: 'College Identity Card Copy',
      evidence: { snippet: 'Self-attested copy of valid MNNIT student ID card is mandatory.', page: 2 },
    },
  ],
};

// Inner App (rendered only when authenticated)
const AppInner: React.FC = () => {
  const { user, logout } = useAuth();

  const [viewState, setViewState] = useState<'upload' | 'loading' | 'results'>('upload');
  const [currentStep, setCurrentStep] = useState<ProcessingStep>('reading');
  const [error, setError] = useState<string | null>(null);
  const [extractionResult, setExtractionResult] = useState<NoticeExtractionResult | null>(null);

  // Student profile state
  const [profile, setProfile] = useState<StudentProfile>({
    branch: 'CSE',
    year: '3rd',
    cgpa: 8.0,
    active_backlogs: false,
  });

  // Evidence Modal state
  const [evidenceModal, setEvidenceModal] = useState<{
    isOpen: boolean;
    fieldName: string;
    evidence: Evidence | null;
  }>({ isOpen: false, fieldName: '', evidence: null });

  const lastInputRef = useRef<NoticeInput | null>(null);

  // Load saved student profile on initial mount
  useEffect(() => {
    api.getProfile()
      .then((saved) => {
        if (saved && saved.branch) {
          setProfile(saved);
        }
      })
      .catch(() => {
        // use default profile
      });
  }, []);

  const startExtractionPipeline = async (input: NoticeInput) => {
    lastInputRef.current = input;
    setError(null);
    setViewState('loading');
    setCurrentStep('reading');

    // Step indicator progression
    const timer1 = window.setTimeout(() => setCurrentStep('extracting'), 600);
    const timer2 = window.setTimeout(() => setCurrentStep('documents'), 1300);
    const timer3 = window.setTimeout(() => setCurrentStep('evidence'), 2000);

    try {
      const result = await api.extractNotice(input);
      window.clearTimeout(timer1);
      window.clearTimeout(timer2);
      window.clearTimeout(timer3);
      setExtractionResult(result);
      setViewState('results');
    } catch (err: unknown) {
      window.clearTimeout(timer1);
      window.clearTimeout(timer2);
      window.clearTimeout(timer3);

      // In case backend is not reachable or returns error, fall back to sample for smooth demo
      if (input.type === 'text' && input.text.includes('Demo')) {
        setExtractionResult(SAMPLE_MNNIT_RESULT);
        setViewState('results');
      } else {
        const message = err instanceof Error ? err.message : 'Notice extraction failed. Please check backend connection.';
        setError(message);
      }
    }
  };

  const handleRetry = () => {
    if (lastInputRef.current) startExtractionPipeline(lastInputRef.current);
    else handleReset();
  };

  const handleReset = () => {
    lastInputRef.current = null;
    setError(null);
    setExtractionResult(null);
    setViewState('upload');
  };

  const handleOpenEvidence = (fieldName: string, evidence: Evidence) => {
    setEvidenceModal({ isOpen: true, fieldName, evidence });
  };

  const handleCloseEvidence = () => {
    setEvidenceModal((prev) => ({ ...prev, isOpen: false }));
  };

  const handleUpdateProfile = async (updated: StudentProfile) => {
    setProfile(updated);
    try {
      await api.saveProfile(updated);
    } catch {
      // offline save fallback in local state
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-sm">
              <Compass className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">DocuPilot</h1>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                  Track 1 Next-Gen Agent
                </span>
              </div>
              <p className="text-xs text-slate-500">Notice-to-Action for MNNIT Allahabad</p>
            </div>
          </div>

          {/* Right side badges & user info */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 text-xs text-slate-600 bg-slate-100/80 px-3 py-1.5 rounded-lg border border-slate-200/60">
              <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
              <span>{profile.branch} • {profile.year} • CPI {profile.cgpa.toFixed(1)}</span>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-medium bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              Gemini Vision
            </span>

            {/* Authenticated User Badge */}
            <div className="flex items-center gap-2 bg-slate-100 rounded-full pl-2 pr-3 py-1">
              <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs">
                <User className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-medium text-slate-700 hidden sm:block">{user?.name ?? 'Student'}</span>
            </div>

            {/* Logout button */}
            <button
              onClick={logout}
              aria-label="Logout"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 rounded-lg text-sm text-slate-700 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {viewState === 'upload' && (
          <div className="space-y-6">
            <div className="text-center max-w-2xl mx-auto space-y-3 mb-8">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 mb-2">
                <Shield className="w-3.5 h-3.5 text-indigo-600" />
                Deterministic Verification Engine
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Turn any college circular into an action plan
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Upload a university circular, training and placement drive notice, or exam notification. 
                DocuPilot extracts deadlines, verifies your individual eligibility, and syncs milestones directly to your calendar.
              </p>
            </div>
            <NoticeUpload onExtract={startExtractionPipeline} />
          </div>
        )}

        {viewState === 'loading' && (
          <LoadingSkeleton
            currentStep={currentStep}
            error={error}
            onRetry={handleRetry}
            onCancel={handleReset}
          />
        )}

        {viewState === 'results' && extractionResult && (
          <ExtractionResults
            result={extractionResult}
            studentProfile={profile}
            onUpdateProfile={handleUpdateProfile}
            onOpenEvidence={handleOpenEvidence}
            onReset={handleReset}
          />
        )}
      </main>

      <EvidenceModal
        isOpen={evidenceModal.isOpen}
        fieldName={evidenceModal.fieldName}
        evidence={evidenceModal.evidence}
        onClose={handleCloseEvidence}
      />

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-5 mt-auto text-center text-xs text-slate-500">
        <p>DocuPilot (ActionLens) • Hacktoberfest Hack Day Prayagraj x CC Club MNNIT</p>
      </footer>
    </div>
  );
};

// Root App with Auth Gate
export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppWithAuth />
    </AuthProvider>
  );
};

const AppWithAuth: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-400 text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <>
      {!isAuthenticated && <AuthModal />}
      {isAuthenticated && <AppInner />}
    </>
  );
};

export default App;
