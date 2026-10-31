import React, { useState, useRef, ChangeEvent, DragEvent } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, X, Sparkles, FileUp } from 'lucide-react';

export type NoticeInput = 
  | { type: 'file'; file: File }
  | { type: 'text'; text: string };

interface NoticeUploadProps {
  onExtract: (input: NoticeInput) => void;
  isProcessing?: boolean;
}

const ALLOWED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg'];
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const MIN_TEXT_CHARS = 50;
const MAX_TEXT_CHARS = 15000;

export const NoticeUpload: React.FC<NoticeUploadProps> = ({ onExtract, isProcessing = false }) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  
  // File state
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Paste text state
  const [pastedText, setPastedText] = useState('');
  const [textError, setTextError] = useState<string | null>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const validateFile = (selectedFile: File): string | null => {
    if (selectedFile.size === 0) {
      return 'File is empty (0 bytes). Please select a valid document.';
    }

    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      return 'File size exceeds 10 MB limit. Please upload a smaller file.';
    }

    const fileExt = '.' + selectedFile.name.split('.').pop()?.toLowerCase();
    const isMimeValid = ALLOWED_MIME_TYPES.includes(selectedFile.type);
    const isExtValid = ALLOWED_EXTENSIONS.includes(fileExt);

    if (!isMimeValid && !isExtValid) {
      return 'Only .pdf, .png, .jpg, and .jpeg files are supported.';
    }

    return null;
  };

  const handleFileSelection = (newFile: File) => {
    const error = validateFile(newFile);
    if (error) {
      setFile(null);
      setFileError(error);
    } else {
      setFile(newFile);
      setFileError(null);
    }
  };

  const onFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelection(e.target.files[0]);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setFileError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleTextChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setPastedText(text);

    if (text.length > MAX_TEXT_CHARS) {
      setTextError(`Text exceeds maximum limit of ${MAX_TEXT_CHARS} characters.`);
    } else {
      setTextError(null);
    }
  };

  const handleLoadSample = () => {
    setActiveTab('paste');
    setPastedText(
      'Training and Placement Cell, MNNIT Allahabad\n' +
      'Notice: Campus Recruitment Drive 2026-27 for Google India Software Engineering Intern.\n\n' +
      'Eligible Candidates: Pre-Final Year B.Tech (Computer Science, Information Tech, Electronics & Communication) and 2nd Year MCA students.\n' +
      'Academic Criteria: Minimum CGPA of 7.50 with zero active backlogs at the time of portal registration.\n\n' +
      'Key Deadlines:\n' +
      '1. T&P Portal Registration & Resume Submission: 5th November 2026, 5:00 PM.\n' +
      '2. Online Coding Challenge: 12th November 2026 (Tentative date, assessment link sent 24h prior).\n' +
      '3. Technical and HR Interviews: To be notified following coding round results.\n\n' +
      'Required Documents:\n' +
      '- Latest verified semester grade cards authenticated by academic section.\n' +
      '- Standard single-page resume adhering to official MNNIT template.\n' +
      '- Copy of valid college identity card.'
    );
    setTextError(null);
  };

  const isFileValid = file !== null && fileError === null;
  const isTextValid = pastedText.trim().length >= MIN_TEXT_CHARS && pastedText.length <= MAX_TEXT_CHARS;
  const canSubmit = activeTab === 'upload' ? isFileValid : isTextValid;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || isProcessing) return;

    if (activeTab === 'upload' && file) {
      onExtract({ type: 'file', file });
    } else if (activeTab === 'paste' && isTextValid) {
      onExtract({ type: 'text', text: pastedText.trim() });
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Navigation Tabs & Sample Notice Quick Button */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/50 px-2">
        <div className="flex flex-1" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'upload'}
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-3.5 px-4 text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
              activeTab === 'upload'
                ? 'bg-white text-indigo-600 border-b-2 border-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload File</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'paste'}
            onClick={() => setActiveTab('paste')}
            className={`flex-1 py-3.5 px-4 text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
              activeTab === 'paste'
                ? 'bg-white text-indigo-600 border-b-2 border-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Paste Text</span>
          </button>
        </div>

        <button
          type="button"
          onClick={handleLoadSample}
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg border border-indigo-200 transition-colors inline-flex items-center gap-1.5 ml-2"
          title="Pre-populate with a real MNNIT placement circular"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
          <span className="hidden sm:inline">Try Sample Notice</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 md:p-8">
        {activeTab === 'upload' ? (
          <div>
            {!file ? (
              <div
                data-testid="dropzone"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label="Upload document dropzone: Drag & drop or click to browse"
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                  isDragging
                    ? 'border-indigo-500 bg-indigo-50/50 scale-[1.01]'
                    : 'border-slate-300 hover:border-indigo-400 bg-slate-50/40 hover:bg-slate-50'
                }`}
              >
                <div className="w-14 h-14 mx-auto mb-4 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 shadow-inner">
                  <FileUp className="w-7 h-7" />
                </div>
                <h3 className="text-base font-semibold text-slate-800 mb-1">
                  Drag and drop notice here, or <span className="text-indigo-600 underline">browse</span>
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Supports PDF, PNG, JPG and JPEG up to 10 MB
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  id="notice-file-input"
                  aria-label="Upload file"
                  accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                  onChange={onFileInputChange}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex items-center justify-between">
                <div className="flex items-center gap-3.5 overflow-hidden">
                  <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="truncate">
                    <p className="text-sm font-semibold text-slate-800 truncate">{file.name}</p>
                    <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                      <span>{file.type || 'Document'}</span>
                      <span>•</span>
                      <span>{formatFileSize(file.size)}</span>
                      <span className="inline-flex items-center text-emerald-600 gap-1 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                      </span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  aria-label="Remove file"
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}

            {fileError && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2.5 text-rose-700 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{fileError}</span>
              </div>
            )}
          </div>
        ) : (
          <div>
            <label htmlFor="pasted-notice" className="block text-sm font-medium text-slate-700 mb-2">
              Paste notice or email text
            </label>
            <textarea
              id="pasted-notice"
              rows={6}
              value={pastedText}
              onChange={handleTextChange}
              placeholder="Paste the notice, circular, or email text here..."
              className="w-full p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-slate-800 placeholder-slate-400 transition-colors focus-visible:outline-none resize-y"
            />
            
            <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
              <span>
                {pastedText.length < MIN_TEXT_CHARS ? (
                  <span className="text-amber-600 font-medium">
                    {pastedText.length} / {MIN_TEXT_CHARS} characters minimum
                  </span>
                ) : (
                  <span className="text-emerald-600 font-medium">
                    {pastedText.length} characters (meets minimum)
                  </span>
                )}
              </span>
              <span>{MAX_TEXT_CHARS - pastedText.length} remaining</span>
            </div>

            {textError && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2.5 text-rose-700 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{textError}</span>
              </div>
            )}
          </div>
        )}

        {/* Submit Action */}
        <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-end">
          <button
            type="submit"
            disabled={!canSubmit || isProcessing}
            className={`w-full sm:w-auto px-6 py-2.5 rounded-xl font-medium text-sm inline-flex items-center justify-center gap-2 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 shadow-sm ${
              canSubmit && !isProcessing
                ? 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-indigo-100 hover:shadow-md'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Extract details</span>
          </button>
        </div>
      </form>
    </div>
  );
};

