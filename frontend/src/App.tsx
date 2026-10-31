import React, { useState, useRef } from 'react';
import { NoticeUpload, NoticeInput } from './components/NoticeUpload/NoticeUpload';
import { LoadingSkeleton } from './components/LoadingSkeleton/LoadingSkeleton';
import { ExtractionResults } from './components/ExtractionResults/ExtractionResults';
import { EvidenceModal } from './components/EvidenceModal/EvidenceModal';
import { NoticeExtractionResult, ProcessingStep, Evidence } from './types/notice';
import { Sparkles, Compass } from 'lucide-react';

// Sample MNNIT notice extraction result for testing and demonstration
const SAMPLE_MNNIT_RESULT: NoticeExtractionResult = {
  notice_id: 'mnnit-tnp-2026-104',
  title: 'Campus Recruitment Drive 2026-27: Google India Software Engineering Intern',
  summary: 'Training and Placement Cell, MNNIT Allahabad invites applications from eligible Pre-Final Year B.Tech and MCA students for Summer Internship 2027.',
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
      evidence: {
        snippet: 'Students must submit semester grade sheets authenticated by the academic section.',
        page: 2,
      },
    },
    {
      id: 'doc-2',
      name: 'Single Page Resume (PDF format)',
      evidence: {
        snippet: 'Submit standard 1-page resume strictly adhering to MNNIT T&P template.',
        page: 2,
      },
    },
    {
      id: 'doc-3',
      name: 'College Identity Card Copy',
      evidence: {
        snippet: 'Self-attested copy of valid MNNIT student ID card is mandatory.',
        page: 2,
      },
    },
  ],
};

export const App: React.FC = () => {
  const [viewState, setViewState] = useState<'upload' | 'loading' | 'results'>('upload');
  const [currentStep, setCurrentStep] = useState<ProcessingStep>('reading');
  const [error, setError] = useState<string | null>(null);
  const [extractionResult, setExtractionResult] = useState<NoticeExtractionResult | null>(null);

  // Evidence Modal state
  const [evidenceModal, setEvidenceModal] = useState<{
    isOpen: boolean;
    fieldName: string;
    evidence: Evidence | null;
  }>({
    isOpen: false,
    fieldName: '',
    evidence: null,
  });

  const lastInputRef = useRef<NoticeInput | null>(null);
  const timeoutTimerRef = useRef<number | null>(null);

  const startExtractionPipeline = (input: NoticeInput) => {
    lastInputRef.current = input;
    setError(null);
    setViewState('loading');
    setCurrentStep('reading');

    // Simulate Network Timeout watchdog (30 seconds)
    if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);
    timeoutTimerRef.current = window.setTimeout(() => {
      setError('Extraction request timed out. The server took too long to respond. Please try again or paste text.');
    }, 30000);

    // Step progression animation (1: reading -> 2: extracting -> 3: documents -> 4: evidence -> Done)
    setTimeout(() => {
      setCurrentStep('extracting');
    }, 700);

    setTimeout(() => {
      setCurrentStep('documents');
    }, 1400);

    setTimeout(() => {
      setCurrentStep('evidence');
    }, 2100);

    setTimeout(() => {
      if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);
      setExtractionResult(SAMPLE_MNNIT_RESULT);
      setViewState('results');
    }, 2800);
  };

  const handleRetry = () => {
    if (lastInputRef.current) {
      startExtractionPipeline(lastInputRef.current);
    } else {
      setViewState('upload');
    }
  };

  const handleReset = () => {
    if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);
    lastInputRef.current = null;
    setError(null);
    setExtractionResult(null);
    setViewState('upload');
  };

  const handleOpenEvidence = (fieldName: string, evidence: Evidence) => {
    setEvidenceModal({
      isOpen: true,
      fieldName,
      evidence,
    });
  };

  const handleCloseEvidence = () => {
    setEvidenceModal((prev) => ({ ...prev, isOpen: false }));
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Navigation */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-100">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">DocuPilot</h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase">
                  ActionLens MNNIT
                </span>
              </div>
              <p className="text-xs text-slate-500">Notice-to-Action Agent for Students</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-emerald-700 font-medium bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              Gemini Vision & Extraction
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {viewState === 'upload' && (
          <div className="space-y-6">
            <div className="text-center max-w-xl mx-auto space-y-2 mb-8">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Turn any college circular into an action plan
              </h2>
              <p className="text-sm text-slate-600">
                Drop your PDF circular, notice image, or raw email text. We extract deadlines, eligibility conditions, and required documents with page-level evidence.
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
            onReset={handleReset}
            onOpenEvidence={handleOpenEvidence}
          />
        )}
      </main>

      {/* Evidence Source Modal */}
      <EvidenceModal
        isOpen={evidenceModal.isOpen}
        fieldName={evidenceModal.fieldName}
        evidence={evidenceModal.evidence}
        onClose={handleCloseEvidence}
      />

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-auto text-center text-xs text-slate-500">
        <p>DocuPilot (ActionLens) • Hacktoberfest Hack Day Prayagraj x CC Club MNNIT</p>
      </footer>
    </div>
  );
};

export default App;

