import React from 'react';
import { 
  Calendar, 
  AlertTriangle, 
  FileCheck2, 
  GraduationCap, 
  RotateCcw, 
  FileSearch, 
  CheckCircle,
  HelpCircle,
  Info
} from 'lucide-react';
import { NoticeExtractionResult, Evidence } from '../../types/notice';

interface ExtractionResultsProps {
  result: NoticeExtractionResult;
  onReset: () => void;
  onOpenEvidence: (fieldName: string, evidence: Evidence) => void;
}

export const ExtractionResults: React.FC<ExtractionResultsProps> = ({
  result,
  onReset,
  onOpenEvidence,
}) => {
  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'Date not found';
    try {
      const parts = dateString.split('-');
      if (parts.length === 3) {
        const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
      }
      return dateString;
    } catch {
      return dateString;
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Notice Title & Summary Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-full uppercase tracking-wider">
              <FileCheck2 className="w-3.5 h-3.5" />
              Verified Extraction
            </span>
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 mt-2">
              {result.title || 'Untitled Notice'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onReset}
            className="self-start sm:self-auto px-4 py-2 border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-medium inline-flex items-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 shadow-sm"
          >
            <RotateCcw className="w-4 h-4 text-slate-500" />
            <span>Process another notice</span>
          </button>
        </div>

        {result.summary && (
          <div className="mt-4 text-sm text-slate-600 leading-relaxed bg-slate-50/70 p-4 rounded-xl border border-slate-100">
            <p className="font-semibold text-slate-800 text-xs uppercase tracking-wider mb-1">
              Notice Summary
            </p>
            <p>{result.summary}</p>
          </div>
        )}
      </div>

      {/* Grid: Deadlines, Eligibility, Documents */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Deadlines Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-900 font-bold">
                <Calendar className="w-5 h-5 text-indigo-600" />
                <span>Deadlines & Dates</span>
              </div>
              <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                {result.deadlines.length}
              </span>
            </div>

            {result.deadlines.length === 0 ? (
              <div className="py-8 text-center text-slate-400">
                <HelpCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs">No deadlines found in this notice.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {result.deadlines.map((item, idx) => (
                  <div
                    key={item.id || `deadline-${idx}`}
                    className="p-3.5 bg-slate-50/80 hover:bg-slate-50 rounded-xl border border-slate-200/80 transition-all space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-800 leading-snug">
                        {item.label}
                      </p>
                      {item.evidence && (
                        <button
                          type="button"
                          onClick={() => onOpenEvidence(item.label, item.evidence!)}
                          aria-label={`View source for ${item.label}`}
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center gap-1 hover:underline flex-shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 rounded"
                        >
                          <FileSearch className="w-3.5 h-3.5" />
                          <span>View source</span>
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className={`font-medium ${!item.date ? 'text-amber-600 italic' : 'text-slate-700'}`}>
                        {formatDate(item.date)}
                      </span>
                      {item.needs_confirmation && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          Deadline unclear, please confirm
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Eligibility Criteria Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-900 font-bold">
                <GraduationCap className="w-5 h-5 text-indigo-600" />
                <span>Eligibility Rules</span>
              </div>
              {result.eligibility?.evidence && (
                <button
                  type="button"
                  onClick={() => onOpenEvidence('Eligibility Rules', result.eligibility!.evidence!)}
                  aria-label="View source for Eligibility Rules"
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center gap-1 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 rounded"
                >
                  <FileSearch className="w-3.5 h-3.5" />
                  <span>View source</span>
                </button>
              )}
            </div>

            {!result.eligibility ? (
              <div className="py-8 text-center text-slate-400">
                <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs">No specific eligibility criteria specified.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Branches */}
                {result.eligibility.branches && result.eligibility.branches.length > 0 && (
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                      Eligible Branches
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {result.eligibility.branches.map((branch, bIdx) => (
                        <span
                          key={`branch-${bIdx}`}
                          className="px-2.5 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg"
                        >
                          {branch}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* CGPA */}
                {result.eligibility.min_cgpa !== undefined && result.eligibility.min_cgpa !== null && (
                  <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200/80">
                    <span className="text-xs font-medium text-slate-600">Minimum CGPA Required</span>
                    <span className="text-sm font-bold text-slate-900 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                      {result.eligibility.min_cgpa}
                    </span>
                  </div>
                )}

                {/* Years / Batch */}
                {result.eligibility.years && result.eligibility.years.length > 0 && (
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                      Eligible Batches / Years
                    </span>
                    <p className="text-xs text-slate-700 font-medium">
                      {result.eligibility.years.join(', ')}
                    </p>
                  </div>
                )}

                {/* Other Conditions */}
                {result.eligibility.other_conditions && result.eligibility.other_conditions.length > 0 && (
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                      Other Conditions
                    </span>
                    <ul className="space-y-1 text-xs text-slate-600">
                      {result.eligibility.other_conditions.map((cond, cIdx) => (
                        <li key={`cond-${cIdx}`} className="flex items-start gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                          <span>{cond}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Required Documents Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-900 font-bold">
                <FileCheck2 className="w-5 h-5 text-indigo-600" />
                <span>Required Documents</span>
              </div>
              <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                {result.required_documents.length}
              </span>
            </div>

            {result.required_documents.length === 0 ? (
              <div className="py-8 text-center text-slate-400">
                <HelpCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs">No required documents listed.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {result.required_documents.map((doc, dIdx) => (
                  <div
                    key={doc.id || `doc-${dIdx}`}
                    className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />
                      <p className="text-xs font-semibold text-slate-800 truncate">{doc.name}</p>
                    </div>

                    {doc.evidence && (
                      <button
                        type="button"
                        onClick={() => onOpenEvidence(doc.name, doc.evidence!)}
                        aria-label={`View source for ${doc.name}`}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center gap-1 hover:underline flex-shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 rounded"
                      >
                        <FileSearch className="w-3.5 h-3.5" />
                        <span>View source</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

