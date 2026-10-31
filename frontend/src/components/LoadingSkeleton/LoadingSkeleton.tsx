import React from 'react';
import { Loader2, CheckCircle2, AlertTriangle, RotateCcw, ArrowLeft } from 'lucide-react';
import { ProcessingStep, StepStatus } from '../../types/notice';

interface LoadingSkeletonProps {
  currentStep: ProcessingStep;
  error?: string | null;
  onRetry: () => void;
  onCancel: () => void;
}

const STEPS: StepStatus[] = [
  { id: 'reading', label: 'Reading document...' },
  { id: 'extracting', label: 'Extracting deadlines & eligibility...' },
  { id: 'documents', label: 'Finding required documents...' },
  { id: 'evidence', label: 'Checking evidence for each item...' },
];

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  currentStep,
  error = null,
  onRetry,
  onCancel,
}) => {
  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep);
  const activeLabel = STEPS.find((s) => s.id === currentStep)?.label || 'Processing notice...';

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-fadeIn">
      {/* Screen Reader ARIA Live Status Announcer */}
      <div 
        role="status" 
        aria-live="polite" 
        aria-atomic="true" 
        className="sr-only"
      >
        {error ? `Processing error: ${error}` : activeLabel}
      </div>

      {/* Status Progress Header / Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
        {error ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-1">Notice Processing Failed</h3>
            <p className="text-sm text-slate-600 max-w-lg mx-auto mb-6">{error}</p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={onRetry}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium inline-flex items-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 shadow-sm"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Retry</span>
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium inline-flex items-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to upload</span>
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                  AI Extraction Pipeline
                </span>
                <h3 className="text-xl font-bold text-slate-900 mt-0.5">Analyzing Notice</h3>
              </div>
              <div className="flex items-center gap-2 bg-indigo-50 text-indigo-700 text-xs px-3 py-1.5 rounded-full font-medium">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Processing in progress</span>
              </div>
            </div>

            {/* Stepper Progress Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {STEPS.map((step, idx) => {
                let status: 'completed' | 'current' | 'pending' = 'pending';
                if (idx < currentStepIndex) status = 'completed';
                else if (idx === currentStepIndex) status = 'current';

                return (
                  <div
                    key={step.id}
                    data-testid={`step-${step.id}`}
                    data-status={status}
                    className={`p-3.5 rounded-xl border transition-all duration-200 ${
                      status === 'completed'
                        ? 'bg-emerald-50/60 border-emerald-200 text-emerald-800'
                        : status === 'current'
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-900 shadow-sm ring-1 ring-indigo-200'
                        : 'bg-slate-50 border-slate-200 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {status === 'completed' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      ) : status === 'current' ? (
                        <Loader2 className="w-4 h-4 text-indigo-600 animate-spin flex-shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-slate-300 flex-shrink-0" />
                      )}
                      <span className={`text-xs font-medium truncate ${status === 'current' ? 'font-semibold' : ''}`}>
                        {step.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Skeleton placeholders mimicking the final results layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
        {/* Title & Summary Skeleton */}
        <div 
          data-testid="skeleton-title-card"
          className="md:col-span-3 bg-white rounded-2xl p-6 border border-slate-200 space-y-3"
        >
          <div className="h-4 bg-slate-200 rounded w-1/4"></div>
          <div className="h-6 bg-slate-300 rounded w-2/3"></div>
          <div className="h-4 bg-slate-200 rounded w-full"></div>
          <div className="h-4 bg-slate-200 rounded w-4/5"></div>
        </div>

        {/* Deadlines Card Skeleton */}
        <div 
          data-testid="skeleton-deadlines-card"
          className="bg-white rounded-2xl p-6 border border-slate-200 space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="h-5 bg-slate-300 rounded w-1/2"></div>
            <div className="h-4 bg-slate-200 rounded w-8"></div>
          </div>
          <div className="space-y-3">
            <div className="p-3 bg-slate-50 rounded-xl space-y-2 border border-slate-100">
              <div className="h-4 bg-slate-200 rounded w-3/4"></div>
              <div className="h-3 bg-slate-200 rounded w-1/2"></div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl space-y-2 border border-slate-100">
              <div className="h-4 bg-slate-200 rounded w-2/3"></div>
              <div className="h-3 bg-slate-200 rounded w-1/3"></div>
            </div>
          </div>
        </div>

        {/* Eligibility Card Skeleton */}
        <div 
          data-testid="skeleton-eligibility-card"
          className="bg-white rounded-2xl p-6 border border-slate-200 space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="h-5 bg-slate-300 rounded w-1/2"></div>
            <div className="h-4 bg-slate-200 rounded w-8"></div>
          </div>
          <div className="space-y-3">
            <div className="h-4 bg-slate-200 rounded w-full"></div>
            <div className="h-4 bg-slate-200 rounded w-5/6"></div>
            <div className="flex gap-2">
              <div className="h-6 bg-slate-200 rounded-md w-12"></div>
              <div className="h-6 bg-slate-200 rounded-md w-12"></div>
              <div className="h-6 bg-slate-200 rounded-md w-12"></div>
            </div>
          </div>
        </div>

        {/* Documents Card Skeleton */}
        <div 
          data-testid="skeleton-documents-card"
          className="bg-white rounded-2xl p-6 border border-slate-200 space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="h-5 bg-slate-300 rounded w-1/2"></div>
            <div className="h-4 bg-slate-200 rounded w-8"></div>
          </div>
          <div className="space-y-2.5">
            <div className="h-9 bg-slate-50 rounded-xl border border-slate-100"></div>
            <div className="h-9 bg-slate-50 rounded-xl border border-slate-100"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

