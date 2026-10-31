import React, { useEffect, useRef } from 'react';
import { X, FileText, Bookmark, ExternalLink } from 'lucide-react';
import { Evidence } from '../../types/notice';

interface EvidenceModalProps {
  isOpen: boolean;
  fieldName: string;
  evidence: Evidence | null;
  onClose: () => void;
}

export const EvidenceModal: React.FC<EvidenceModalProps> = ({
  isOpen,
  fieldName,
  evidence,
  onClose,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Keyboard navigation & Focus management
  useEffect(() => {
    if (!isOpen) return;

    // Focus close button on open
    const prevFocusedElement = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }

      // Simple focus trap within modal
      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // Restore focus to triggering button
      prevFocusedElement?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen || !evidence) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="evidence-dialog-title"
    >
      {/* Backdrop */}
      <div
        data-testid="modal-backdrop"
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity animate-fadeIn"
        aria-hidden="true"
      />

      {/* Modal Dialog Content */}
      <div
        ref={modalRef}
        className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-10 animate-scaleUp"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2 text-indigo-700">
            <Bookmark className="w-4 h-4" />
            <h3 id="evidence-dialog-title" className="text-sm font-semibold tracking-wide uppercase">
              Source Evidence
            </h3>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close evidence modal"
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Field Name</span>
            <p className="text-base font-bold text-slate-900 mt-0.5">{fieldName}</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Verbatim Document Snippet
              </span>
              {evidence.page !== null && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md border border-indigo-100">
                  <FileText className="w-3 h-3" />
                  Page {evidence.page}
                </span>
              )}
            </div>

            {/* Highlighted Snippet Box */}
            <div
              data-testid="evidence-snippet"
              className="p-4 bg-amber-50 border-l-4 border-amber-400 rounded-r-xl text-slate-800 text-sm leading-relaxed font-mono shadow-inner"
            >
              &ldquo;{evidence.snippet}&rdquo;
            </div>
          </div>

          <p className="text-xs text-slate-500 leading-normal flex items-start gap-1.5">
            <ExternalLink className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
            <span>
              This snippet represents the exact text extracted from the uploaded notice to verify accuracy and avoid AI hallucination.
            </span>
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

