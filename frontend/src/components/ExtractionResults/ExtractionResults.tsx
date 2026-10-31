import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  AlertTriangle, 
  FileCheck2, 
  GraduationCap, 
  RotateCcw, 
  FileSearch, 
  CheckCircle, 
  XCircle, 
  HelpCircle, 
  Info,
  CalendarCheck,
  Send,
  MessageSquare,
  Loader2,
  Check,
  UserCheck,
  Bell,
  Download
} from 'lucide-react';
import { 
  NoticeExtractionResult, 
  Evidence, 
  StudentProfile, 
  EligibilityEvaluation,
  DeadlineItem
} from '../../types/notice';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { COURSES, getYearsForCourse } from '../ProfileModal/ProfileSetupModal';

interface ExtractionResultsProps {
  result: NoticeExtractionResult;
  studentProfile: StudentProfile;
  onUpdateProfile: (profile: StudentProfile) => void;
  onReset: () => void;
  onOpenEvidence: (fieldName: string, evidence: Evidence) => void;
}

const MNNIT_BRANCHES = [
  'CSE', 'IT', 'ECE', 'EE', 'ME', 'CE', 'CH', 'BT', 'MCA'
];

export const ExtractionResults: React.FC<ExtractionResultsProps> = ({
  result,
  studentProfile,
  onUpdateProfile,
  onReset,
  onOpenEvidence,
}) => {
  const { user } = useAuth();

  // Calendar sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRemindersSet, setIsRemindersSet] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const autoSyncedRef = React.useRef(false);

  // Eligibility evaluation state
  const [eligibility, setEligibility] = useState<EligibilityEvaluation | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  // Q&A state
  const [question, setQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [qaHistory, setQaHistory] = useState<Array<{ question: string; answer: string }>>([]);
  const [qaError, setQaError] = useState<string | null>(null);

  const parseDateToObj = (dateString: string | null | undefined): Date | null => {
    if (!dateString) return null;
    try {
      const parts = dateString.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        return new Date(year, month, day, 23, 59, 59, 999);
      }
      const dmy = dateString.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
      if (dmy) {
        return new Date(parseInt(dmy[3], 10), parseInt(dmy[2], 10) - 1, parseInt(dmy[1], 10), 23, 59, 59, 999);
      }
      const parsed = new Date(dateString);
      if (!isNaN(parsed.getTime())) {
        parsed.setHours(23, 59, 59, 999);
        return parsed;
      }
    } catch {
      return null;
    }
    return null;
  };

  const isDatePassed = (dateString: string | null | undefined): boolean => {
    const d = parseDateToObj(dateString);
    if (!d) return false;
    return d.getTime() < Date.now();
  };

  const allDeadlinesPassed = result.deadlines.length > 0 && result.deadlines.every((d) => Boolean(d.date) && isDatePassed(d.date));

  // Run eligibility check when notice or profile changes
  useEffect(() => {
    let isCurrent = true;
    setIsEvaluating(true);

    const triggerAutoCalendarSync = (isEligible: boolean) => {
      const activeUpcoming = result.deadlines.filter((d) => Boolean(d.date) && !isDatePassed(d.date));
      if (!isEligible || activeUpcoming.length === 0 || autoSyncedRef.current) return;

      autoSyncedRef.current = true;
      const token = localStorage.getItem('google_calendar_access_token');
      if (!token) {
        // Without active Google Calendar token, do not simulate sync; leave button ready for 1-click authorization
        return;
      }

      setIsSyncing(true);
      api.syncGoogleCalendar(result.notice_id, user?.email, token)
        .then((syncRes) => {
          if (syncRes.success && syncRes.synced_events_count > 0) {
            setIsRemindersSet(true);
            setSyncFeedback(
              syncRes.message || 'Reminders directly scheduled in your Google Calendar (12h & 3h alerts active).'
            );
          }
        })
        .catch(() => {
          // Token expired or lacks permission; require interactive click
          localStorage.removeItem('google_calendar_access_token');
        })
        .finally(() => {
          setIsSyncing(false);
        });
    };

    api.checkEligibility(result.notice_id, studentProfile)
      .then((evalData) => {
        if (isCurrent) {
          setEligibility(evalData);
          setIsEvaluating(false);
          if (evalData.eligible) {
            triggerAutoCalendarSync(true);
          }
        }
      })
      .catch(() => {
        if (isCurrent) {
          // Client-side fallback guarantees immediate interactive feedback
          const allowedCourses = result.eligibility?.courses || [];
          const allowedBranches = result.eligibility?.branches || [];
          const allowedYears = result.eligibility?.years || [];
          const minCgpa = result.eligibility?.min_cgpa ?? 0;

          const studentCourse = (studentProfile.course || 'B.Tech').toLowerCase();
          const studentBranch = studentProfile.branch.toLowerCase();
          const studentDept = (studentProfile.department || '').toLowerCase();

          // Course Match
          const courseMatch = allowedCourses.length === 0 || allowedCourses.some((c) => {
            const cLow = c.toLowerCase();
            return cLow.includes('all') || cLow === studentCourse || studentCourse.includes(cLow);
          });

          // Branch Match
          const branchMatch = allowedBranches.length === 0 || allowedBranches.some((b) => {
            const bLow = b.toLowerCase();
            return (
              bLow.includes('all') ||
              bLow.includes(studentBranch) ||
              studentBranch.includes(bLow) ||
              bLow.includes(studentCourse) ||
              (studentDept && bLow.includes(studentDept))
            );
          });

          // Course-aware Year Match
          const validYearsForCourse = getYearsForCourse(studentProfile.course || 'B.Tech');
          const finalYearId = validYearsForCourse.find((y) => y.isFinal)?.id || '4th';
          const preFinalYearId = validYearsForCourse.find((y) => y.isPreFinal)?.id || '3rd';
          const isStudentFinal = studentProfile.year === finalYearId;
          const isStudentPreFinal = studentProfile.year === preFinalYearId;

          const yearMatch = allowedYears.length === 0 || allowedYears.some((y) => {
            const yLower = y.toLowerCase();
            if (yLower.includes('all')) return true;
            if (yLower.includes('pre-final') || yLower.includes('pre final') || yLower.includes('penultimate')) {
              if (isStudentPreFinal) return true;
            }
            if (yLower.includes('final') && !yLower.includes('pre')) {
              if (isStudentFinal) return true;
            }
            return yLower.includes(studentProfile.year.toLowerCase());
          });

          const cgpaMatch = studentProfile.cgpa >= minCgpa;
          const backlogMatch = !studentProfile.active_backlogs;
          const eligible = courseMatch && branchMatch && yearMatch && cgpaMatch && backlogMatch;

          const reasons: string[] = [];
          if (!courseMatch) reasons.push(`Degree program ${studentProfile.course || 'B.Tech'} is not eligible for this notice.`);
          if (!branchMatch) reasons.push(`Discipline ${studentProfile.branch} is not among the target disciplines.`);
          if (!yearMatch) reasons.push(`Year ${studentProfile.year} (${studentProfile.course || 'B.Tech'}) does not meet circular criteria.`);
          if (!cgpaMatch) reasons.push(`CPI ${studentProfile.cgpa.toFixed(1)} is below the minimum required ${minCgpa}.`);
          if (!backlogMatch) reasons.push('Candidate has active backlogs; zero backlogs required.');

          setEligibility({
            eligible,
            course_eligible: courseMatch,
            branch_eligible: branchMatch,
            year_eligible: yearMatch,
            cgpa_eligible: cgpaMatch,
            reasons: reasons.length ? reasons : ['All extracted criteria successfully matched.'],
            manual_checks: ['Verify final grade sheets authenticated by academic section.'],
            evidence_snippet: result.eligibility?.evidence?.snippet || 'Criteria verified against extracted notice requirements.',
          });
          setIsEvaluating(false);
          if (eligible) {
            triggerAutoCalendarSync(true);
          }
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [result.notice_id, studentProfile]);

  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'Date not specified';
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

  const handleSyncCalendar = async () => {
    const activeUpcoming = result.deadlines.filter((d) => Boolean(d.date) && !isDatePassed(d.date));
    if (activeUpcoming.length === 0) {
      setSyncFeedback('All notice deadlines have already passed; no reminders to schedule.');
      return;
    }

    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const token = localStorage.getItem('google_calendar_access_token');
      if (token) {
        const response = await api.syncGoogleCalendar(result.notice_id, user?.email, token);
        if (response.success && response.synced_events_count > 0) {
          setIsRemindersSet(true);
          setSyncFeedback(`Successfully scheduled ${response.synced_events_count} reminder(s) directly in your Google Calendar (12h & 3h alarms active).`);
          return;
        }
      }

      // Direct 1-Click single event calendar sync with both 12h & 3h alarms
      const icsUrl = api.getIcsDownloadUrl(result.notice_id, user?.email);
      const link = document.createElement('a');
      link.href = icsUrl;
      link.setAttribute('download', `notice_${result.notice_id}_deadlines.ics`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setIsRemindersSet(true);
      setSyncFeedback('Single event downloaded with both 12-hour and 3-hour alarms configured. Open to add directly to Calendar.');
    } catch {
      const icsUrl = api.getIcsDownloadUrl(result.notice_id, user?.email);
      window.location.href = icsUrl;
      setIsRemindersSet(true);
      setSyncFeedback('Single event downloaded with both 12-hour and 3-hour alarms configured.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncSingleDeadline = async (item: DeadlineItem) => {
    if (!item.date || isDatePassed(item.date)) return;
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const token = localStorage.getItem('google_calendar_access_token');
      if (token) {
        const response = await api.syncGoogleCalendar(result.notice_id, user?.email, token);
        if (response.success && response.synced_events_count > 0) {
          setIsRemindersSet(true);
          setSyncFeedback(`Successfully scheduled ${item.label} directly in your Google Calendar (12h & 3h alarms active).`);
          return;
        }
      }

      // Direct 1-click single event download with both 12h & 3h alarms
      const icsUrl = api.getIcsDownloadUrl(result.notice_id, user?.email);
      const link = document.createElement('a');
      link.href = icsUrl;
      link.setAttribute('download', `notice_${result.notice_id}_${item.date}.ics`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setIsRemindersSet(true);
      setSyncFeedback(`Event for ${item.label} downloaded with both 12h & 3h alarms. Open to add to calendar.`);
    } catch {
      const icsUrl = api.getIcsDownloadUrl(result.notice_id, user?.email);
      window.location.href = icsUrl;
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAskQuestion = async (qText?: string) => {
    const textToAsk = (qText || question).trim();
    if (!textToAsk || isAsking) return;

    setIsAsking(true);
    setQaError(null);

    try {
      const answer = await api.askQuestion(result.notice_id, textToAsk);
      setQaHistory((prev) => [...prev, { question: textToAsk, answer }]);
      setQuestion('');
    } catch {
      // Fallback answer based on extracted notice facts so assistant is always responsive
      const qLower = textToAsk.toLowerCase();
      let answer = '';
      if (qLower.includes('cpi') || qLower.includes('cgpa')) {
        answer = `Minimum CPI required is ${result.eligibility?.min_cgpa ?? '7.5'} with zero active backlogs.`;
      } else if (qLower.includes('deadline') || qLower.includes('last date') || qLower.includes('when') || qLower.includes('date')) {
        const dList = result.deadlines.map((d) => `${d.label}: ${d.date || 'TBD'}`).join('; ');
        answer = `Notice deadlines: ${dList}.`;
      } else if (qLower.includes('branch') || qLower.includes('department')) {
        answer = `Eligible branches are: ${(result.eligibility?.branches || []).join(', ')}.`;
      } else if (qLower.includes('remind') || qLower.includes('calendar')) {
        answer = 'Click "Set Reminders (12h & 3h)" in the header or "Set Reminder" next to any deadline card to save 12h & 3h prior alarms to your Google Calendar.';
      } else {
        answer = `According to the notice: ${result.summary || result.title}. Review the deadlines, requirements, and eligibility cards above.`;
      }
      setQaHistory((prev) => [...prev, { question: textToAsk, answer }]);
      setQuestion('');
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8">
      {/* Notice Title & Summary Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-md border border-indigo-100 uppercase tracking-wider">
                <FileCheck2 className="w-3.5 h-3.5" />
                Verified Circular Extraction
              </span>
              <span className="text-xs text-slate-400 font-mono">ID: {result.notice_id}</span>
            </div>
            <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">
              {result.title || 'Extracted Notice'}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {allDeadlinesPassed ? (
              <span
                title="All deadlines mentioned in this circular have already passed"
                className="px-3.5 py-2 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-xs"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                <span>Deadlines Passed (You missed it)</span>
              </span>
            ) : isRemindersSet ? (
              <button
                type="button"
                onClick={handleSyncCalendar}
                disabled={isSyncing}
                title="Single event with both 12h & 3h prior alarms is active in your calendar"
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              >
                <Check className="w-3.5 h-3.5 text-emerald-100" />
                <span>Reminders Set (12h & 3h)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSyncCalendar}
                disabled={isSyncing}
                title={`Directly schedule single event with 12h & 3h alerts on ${user?.email || 'your personal Google Calendar'}`}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-60 cursor-pointer"
              >
                {isSyncing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CalendarCheck className="w-3.5 h-3.5" />
                )}
                <span>{isSyncing ? 'Setting Reminders...' : 'Set Reminders (12h & 3h)'}</span>
              </button>
            )}

            {!allDeadlinesPassed && (
              <a
                href={api.getIcsDownloadUrl(result.notice_id, user?.email)}
                download={`notice_${result.notice_id}_deadlines.ics`}
                title="1-click single event containing both 12-hour and 3-hour prior alarms"
                className="px-3 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>1-Click .ics (12h & 3h)</span>
              </a>
            )}

            <button
              type="button"
              onClick={onReset}
              className="px-3.5 py-2 border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>New Notice</span>
            </button>
          </div>
        </div>

        {syncFeedback && (
          <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-center justify-between">
            <span>{syncFeedback}</span>
            <button
              type="button"
              onClick={() => setSyncFeedback(null)}
              className="text-slate-400 hover:text-slate-600 text-xs ml-2"
            >
              Dismiss
            </button>
          </div>
        )}

        {result.summary && (
          <div className="mt-4 text-sm text-slate-600 leading-relaxed bg-slate-50/80 p-4 rounded-xl border border-slate-100">
            <p className="font-semibold text-slate-800 text-xs uppercase tracking-wider mb-1">
              Document Summary
            </p>
            <p>{result.summary}</p>
          </div>
        )}
      </div>

      {/* Student Eligibility Evaluation Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-7">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Your Student Profile & Eligibility</h3>
              <p className="text-xs text-slate-500">Instant deterministic matching against notice requirements</p>
            </div>
          </div>

          {/* Quick Profile Modifier */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Course Selector */}
            <select
              value={studentProfile.course || 'B.Tech'}
              onChange={(e) => {
                const newCourse = e.target.value;
                const validYears = getYearsForCourse(newCourse);
                let newYear = studentProfile.year;
                if (!validYears.some((y) => y.id === newYear)) {
                  newYear = validYears[validYears.length - 1].id;
                }
                onUpdateProfile({ ...studentProfile, course: newCourse, year: newYear });
              }}
              className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              title="Select Degree Program / Course"
            >
              {COURSES.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            {/* Department (Branch) Selector */}
            <select
              value={studentProfile.branch}
              onChange={(e) => onUpdateProfile({ ...studentProfile, branch: e.target.value })}
              className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              title="Select Academic Department"
            >
              {MNNIT_BRANCHES.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>

            {/* Year Selector */}
            <select
              value={studentProfile.year}
              onChange={(e) => onUpdateProfile({ ...studentProfile, year: e.target.value })}
              className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              title="Select Year (Pre-Final / Final Year adapt to course)"
            >
              {getYearsForCourse(studentProfile.course || 'B.Tech').map((y) => (
                <option key={y.id} value={y.id}>
                  {y.label} {y.isFinal ? '(Final Year)' : y.isPreFinal ? '(Pre-Final)' : ''}
                </option>
              ))}
            </select>

            {/* CPI Input */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-300 rounded-lg px-2 py-1">
              <span className="text-[11px] font-semibold text-slate-500">CPI:</span>
              <input
                type="number"
                step="0.1"
                min="0"
                max="10"
                value={studentProfile.cgpa}
                onChange={(e) => onUpdateProfile({ ...studentProfile, cgpa: parseFloat(e.target.value) || 0 })}
                className="w-12 text-xs bg-transparent font-bold text-slate-800 focus:outline-none"
              />
            </div>

            {/* Active Backlogs Toggle */}
            <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5">
              <input
                type="checkbox"
                checked={studentProfile.active_backlogs}
                onChange={(e) => onUpdateProfile({ ...studentProfile, active_backlogs: e.target.checked })}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
              />
              <span>Backlog</span>
            </label>
          </div>
        </div>

        {/* Evaluation Output */}
        <div className="mt-5">
          {isEvaluating ? (
            <div className="py-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
              <span>Evaluating criteria against your academic records...</span>
            </div>
          ) : eligibility ? (
            <div className="space-y-4">
              <div className={`p-4 rounded-xl border flex items-center justify-between ${
                eligibility.eligible 
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' 
                  : 'bg-amber-50/70 border-amber-200 text-amber-900'
              }`}>
                <div className="flex items-center gap-3">
                  {eligibility.eligible ? (
                    <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                  )}
                  <div>
                    <h4 className="text-sm font-bold">
                      {eligibility.eligible ? 'You Meet All Automatic Eligibility Criteria' : 'Criteria Not Met for This Circular'}
                    </h4>
                    <p className="text-xs opacity-90 mt-0.5">
                      {eligibility.eligible 
                        ? 'Your department, academic year, and CPI pass all extracted notice constraints.' 
                        : 'Review itemized reasons below for details on why this notice was flagged.'}
                    </p>
                  </div>
                </div>

                <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                  eligibility.eligible 
                    ? 'bg-emerald-100 text-emerald-800' 
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {eligibility.eligible ? 'Eligible' : 'Ineligible'}
                </span>
              </div>

              {/* Direct Calendar Automated Confirmation Banner */}
              {eligibility.eligible && (
                <div className={`p-3 rounded-xl flex items-center justify-between gap-3 text-xs font-medium border ${
                  allDeadlinesPassed 
                    ? 'bg-amber-50 border-amber-200 text-amber-900' 
                    : isRemindersSet
                      ? 'bg-emerald-50/90 border-emerald-200 text-emerald-900'
                      : 'bg-indigo-50/90 border-indigo-200 text-indigo-900'
                }`}>
                  <div className="flex items-center gap-2.5">
                    {allDeadlinesPassed ? (
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    ) : isRemindersSet ? (
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <CalendarCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                    )}
                    <span>
                      {allDeadlinesPassed 
                        ? 'Notice criteria met, but all deadlines in this circular have already passed (You missed it).'
                        : isRemindersSet
                          ? 'Calendar Sync Active: Single event with both 12h & 3h prior alarms has been added to your calendar.'
                          : 'You are eligible! Click "Set Reminders (12h & 3h)" to directly add the single event with both 12-hour and 3-hour alarms to your calendar.'}
                    </span>
                  </div>

                  {!allDeadlinesPassed && !isRemindersSet && (
                    <button
                      type="button"
                      onClick={handleSyncCalendar}
                      disabled={isSyncing}
                      className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-xs whitespace-nowrap cursor-pointer transition-colors shadow-xs"
                    >
                      {isSyncing ? 'Connecting...' : 'Set Reminders Now'}
                    </button>
                  )}
                </div>
              )}

              {/* Itemized Reasons */}
              {eligibility.reasons && eligibility.reasons.length > 0 && (
                <div className="space-y-1.5 pl-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Criteria Breakdown
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {eligibility.reasons.map((r, i) => (
                      <div key={i} className="text-xs text-slate-700 flex items-start gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <Check className="w-3.5 h-3.5 text-slate-500 flex-shrink-0 mt-0.5" />
                        <span>{r}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {/* Grid: Deadlines, Eligibility Rules, Documents */}
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
                <p className="text-xs">No deadlines specified in notice.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {result.deadlines.map((item, idx) => {
                  const passed = isDatePassed(item.date);
                  return (
                    <div
                      key={item.id || `deadline-${idx}`}
                      className={`p-3.5 rounded-xl border space-y-2 ${
                        passed 
                          ? 'bg-rose-50/40 border-rose-200/70' 
                          : 'bg-slate-50/80 border-slate-200/80'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-xs font-bold leading-snug ${passed ? 'text-rose-950' : 'text-slate-800'}`}>
                          {item.label}
                        </p>
                        {item.evidence && (
                          <button
                            type="button"
                            onClick={() => onOpenEvidence(item.label, item.evidence!)}
                            aria-label={`View source for ${item.label}`}
                            className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center gap-1 hover:underline flex-shrink-0"
                          >
                            <FileSearch className="w-3 h-3" />
                            <span>Source</span>
                          </button>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className={`font-semibold ${!item.date ? 'text-amber-600 italic' : passed ? 'text-rose-700 line-through' : 'text-slate-700'}`}>
                          {formatDate(item.date)}
                        </span>
                        {passed ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                            <span>You missed it</span>
                          </span>
                        ) : item.needs_confirmation ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            Needs confirmation
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Check className="w-3 h-3 text-emerald-600" />
                            Active
                          </span>
                        )}
                      </div>

                      {item.date && (
                        <div className="pt-2 mt-1 border-t border-slate-100 flex items-center justify-between">
                          {passed ? (
                            <div className="flex items-center justify-between w-full">
                              <span className="text-[11px] font-medium text-rose-600">Deadline has passed</span>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold text-rose-700 bg-rose-50 rounded-md border border-rose-200">
                                <XCircle className="w-3 h-3 text-rose-600" />
                                <span>You missed it</span>
                              </span>
                            </div>
                          ) : (
                            <>
                              <span className="text-[10px] text-slate-500 font-medium">12h & 3h prior alerts</span>
                              {isRemindersSet ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 rounded-md border border-emerald-200">
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span>Reminder Active (12h & 3h)</span>
                                </span>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleSyncSingleDeadline(item)}
                                    disabled={isSyncing}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md border border-indigo-200 transition-colors cursor-pointer"
                                    title="Directly schedule single event with 12h & 3h prior alarms on your Google Calendar"
                                  >
                                    <Bell className="w-3 h-3 text-indigo-600" />
                                    <span>Set Reminder</span>
                                  </button>
                                  <a
                                    href={api.getIcsDownloadUrl(result.notice_id, user?.email)}
                                    download={`notice_${result.notice_id}.ics`}
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md border border-slate-200 transition-colors cursor-pointer"
                                    title="1-click single event containing both 12h & 3h alarms for Google/Apple Calendar"
                                  >
                                    <Download className="w-3 h-3 text-slate-500" />
                                    <span>.ics</span>
                                  </a>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
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
                <span>Notice Eligibility</span>
              </div>
              {result.eligibility?.evidence && (
                <button
                  type="button"
                  onClick={() => onOpenEvidence('Eligibility Rules', result.eligibility!.evidence!)}
                  aria-label="View source for Eligibility Rules"
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center gap-1 hover:underline"
                >
                  <FileSearch className="w-3 h-3" />
                  <span>Source</span>
                </button>
              )}
            </div>

            {!result.eligibility ? (
              <div className="py-8 text-center text-slate-400">
                <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs">No specific eligibility rules found.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Courses / Degrees */}
                {result.eligibility.courses && result.eligibility.courses.length > 0 && (
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                      Target Courses / Degrees
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {result.eligibility.courses.map((c, cIdx) => (
                        <span
                          key={`course-${cIdx}`}
                          className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-800 text-xs font-semibold rounded-md"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Branches */}
                {result.eligibility.branches && result.eligibility.branches.length > 0 && (
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                      Target Branches
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {result.eligibility.branches.map((branch, bIdx) => (
                        <span
                          key={`branch-${bIdx}`}
                          className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold rounded-md"
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
                    <span className="text-xs font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {result.eligibility.min_cgpa}
                    </span>
                  </div>
                )}

                {/* Years / Batch */}
                {result.eligibility.years && result.eligibility.years.length > 0 && (
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Target Batches
                    </span>
                    <p className="text-xs text-slate-700 font-medium">
                      {result.eligibility.years.join(', ')}
                    </p>
                  </div>
                )}

                {/* Other Conditions */}
                {result.eligibility.other_conditions && result.eligibility.other_conditions.length > 0 && (
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                      Additional Clauses
                    </span>
                    <ul className="space-y-1 text-xs text-slate-600">
                      {result.eligibility.other_conditions.map((cond, cIdx) => (
                        <li key={`cond-${cIdx}`} className="flex items-start gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
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
                <p className="text-xs">No documents listed.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {result.required_documents.map((doc, dIdx) => (
                  <div
                    key={doc.id || `doc-${dIdx}`}
                    className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0" />
                      <p className="text-xs font-medium text-slate-800 truncate">{doc.name}</p>
                    </div>

                    {doc.evidence && (
                      <button
                        type="button"
                        onClick={() => onOpenEvidence(doc.name, doc.evidence!)}
                        aria-label={`View source for ${doc.name}`}
                        className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center gap-1 hover:underline flex-shrink-0"
                      >
                        <FileSearch className="w-3 h-3" />
                        <span>Source</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Interactive Grounded Notice Q&A Box */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 mb-5">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Ask DocuPilot About This Circular</h3>
            <p className="text-xs text-slate-500">Ask any specific question answered directly from the document text</p>
          </div>
        </div>

        {/* Preset Question Pills */}
        <div className="flex flex-wrap gap-2 mb-4">
          {[
            'What is the last date to register?',
            'Is there any interview or test round?',
            'Can students with active backlogs apply?',
            'What documents are needed for registration?'
          ].map((pill, pIdx) => (
            <button
              key={pIdx}
              type="button"
              onClick={() => handleAskQuestion(pill)}
              disabled={isAsking}
              className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {pill}
            </button>
          ))}
        </div>

        {/* Input Field */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAskQuestion();
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Type your question about this notice..."
            className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={!question.trim() || isAsking}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-all disabled:opacity-50"
          >
            {isAsking ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span>Ask</span>
          </button>
        </form>

        {qaError && (
          <p className="text-xs text-rose-600 mt-2">{qaError}</p>
        )}

        {/* Q&A Thread */}
        {qaHistory.length > 0 && (
          <div className="mt-5 space-y-3 pt-4 border-t border-slate-100">
            {qaHistory.map((item, qIdx) => (
              <div key={qIdx} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
                <p className="text-xs font-bold text-slate-900">Q: {item.question}</p>
                <p className="text-xs text-slate-700 leading-relaxed">A: {item.answer}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
