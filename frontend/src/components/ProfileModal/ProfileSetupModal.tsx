import React, { useState, useEffect } from 'react';
import { GraduationCap, CheckCircle, ArrowRight, X, Sparkles, Clock, AlertCircle } from 'lucide-react';
import { StudentProfile } from '../../types/notice';
import { api } from '../../services/api';

interface ProfileSetupModalProps {
  isOpen: boolean;
  initialProfile: StudentProfile;
  onSave: (profile: StudentProfile) => void;
  onClose?: () => void;
  isMandatory?: boolean;
}

export interface YearOption {
  id: string;
  label: string;
  yearNumber: number;
  isPreFinal?: boolean;
  isFinal?: boolean;
}

export interface CourseDefinition {
  id: string;
  name: string;
  desc: string;
  duration: number;
  years: YearOption[];
}

export const COURSES: CourseDefinition[] = [
  {
    id: 'B.Tech',
    name: 'B.Tech',
    desc: 'Bachelor of Technology (4 Years)',
    duration: 4,
    years: [
      { id: '1st', label: '1st Year', yearNumber: 1 },
      { id: '2nd', label: '2nd Year', yearNumber: 2 },
      { id: '3rd', label: '3rd Year', yearNumber: 3, isPreFinal: true },
      { id: '4th', label: '4th Year', yearNumber: 4, isFinal: true },
    ],
  },
  {
    id: 'M.Tech',
    name: 'M.Tech',
    desc: 'Master of Technology (2 Years)',
    duration: 2,
    years: [
      { id: '1st', label: '1st Year', yearNumber: 1, isPreFinal: true },
      { id: '2nd', label: '2nd Year', yearNumber: 2, isFinal: true },
    ],
  },
  {
    id: 'MCA',
    name: 'MCA',
    desc: 'Master of Computer Applications (2 Years)',
    duration: 2,
    years: [
      { id: '1st', label: '1st Year', yearNumber: 1, isPreFinal: true },
      { id: '2nd', label: '2nd Year', yearNumber: 2, isFinal: true },
    ],
  },
  {
    id: 'MBA',
    name: 'MBA',
    desc: 'Master of Business Administration (2 Years)',
    duration: 2,
    years: [
      { id: '1st', label: '1st Year', yearNumber: 1, isPreFinal: true },
      { id: '2nd', label: '2nd Year', yearNumber: 2, isFinal: true },
    ],
  },
  {
    id: 'M.Sc',
    name: 'M.Sc',
    desc: 'Master of Science (2 Years)',
    duration: 2,
    years: [
      { id: '1st', label: '1st Year', yearNumber: 1, isPreFinal: true },
      { id: '2nd', label: '2nd Year', yearNumber: 2, isFinal: true },
    ],
  },
  {
    id: 'Ph.D.',
    name: 'Ph.D.',
    desc: 'Doctor of Philosophy (5 Years)',
    duration: 5,
    years: [
      { id: '1st', label: '1st Year', yearNumber: 1 },
      { id: '2nd', label: '2nd Year', yearNumber: 2 },
      { id: '3rd', label: '3rd Year', yearNumber: 3 },
      { id: '4th', label: '4th Year', yearNumber: 4, isPreFinal: true },
      { id: '5th', label: '5th Year', yearNumber: 5, isFinal: true },
    ],
  },
];

export const DEPARTMENTS = [
  { code: 'CSE', name: 'Computer Science & Engineering' },
  { code: 'IT', name: 'Information Technology' },
  { code: 'ECE', name: 'Electronics & Communication Engineering' },
  { code: 'EE', name: 'Electrical Engineering' },
  { code: 'ME', name: 'Mechanical Engineering' },
  { code: 'CE', name: 'Civil Engineering' },
  { code: 'CH', name: 'Chemical Engineering' },
  { code: 'BT', name: 'Biotechnology' },
];

export const getYearsForCourse = (courseId: string, customYears?: YearOption[]): YearOption[] => {
  if (customYears && customYears.length > 0) return customYears;
  const standard = COURSES.find((c) => c.id.toLowerCase() === courseId.toLowerCase());
  if (standard) return standard.years;
  // Fallback 4 years
  return [
    { id: '1st', label: '1st Year', yearNumber: 1 },
    { id: '2nd', label: '2nd Year', yearNumber: 2 },
    { id: '3rd', label: '3rd Year', yearNumber: 3, isPreFinal: true },
    { id: '4th', label: '4th Year', yearNumber: 4, isFinal: true },
  ];
};

export const ProfileSetupModal: React.FC<ProfileSetupModalProps> = ({
  isOpen,
  initialProfile,
  onSave,
  onClose,
  isMandatory = false,
}) => {
  const [course, setCourse] = useState<string>(initialProfile.course || 'B.Tech');
  const [department, setDepartment] = useState<string>(
    initialProfile.department || 'Computer Science & Engineering'
  );
  const [branch, setBranch] = useState<string>(initialProfile.branch || 'CSE');
  const [year, setYear] = useState<string>(initialProfile.year || '3rd');
  const [cgpa, setCgpa] = useState<number>(initialProfile.cgpa || 8.0);
  const [activeBacklogs, setActiveBacklogs] = useState<boolean>(initialProfile.active_backlogs || false);

  // AI custom course analysis state
  const [customCourseInput, setCustomCourseInput] = useState<string>('');
  const [isAnalyzingCourse, setIsAnalyzingCourse] = useState<boolean>(false);
  const [customYears, setCustomYears] = useState<YearOption[] | null>(null);
  const [aiAnalysisMessage, setAiAnalysisMessage] = useState<string | null>(null);

  // Determine active years for selected course
  const activeYears = getYearsForCourse(course, customYears || undefined);
  const currentCourseDef = COURSES.find((c) => c.id === course);
  const courseDuration = currentCourseDef?.duration || activeYears.length;
  const preFinalYearObj = activeYears.find((y) => y.isPreFinal);
  const finalYearObj = activeYears.find((y) => y.isFinal);

  // Clamp year whenever course or activeYears change
  useEffect(() => {
    const validIds = activeYears.map((y) => y.id);
    if (!validIds.includes(year)) {
      // Default to final year or highest valid year
      const fallbackYear = finalYearObj ? finalYearObj.id : validIds[validIds.length - 1];
      setYear(fallbackYear);
    }
  }, [course, activeYears, year, finalYearObj]);

  if (!isOpen) return null;

  const handleSelectCourse = (selectedCourseId: string) => {
    setCourse(selectedCourseId);
    setCustomYears(null);
    setAiAnalysisMessage(null);
    const target = COURSES.find((c) => c.id === selectedCourseId);
    if (target) {
      const validIds = target.years.map((y) => y.id);
      if (!validIds.includes(year)) {
        const fallback = target.years.find((y) => y.isFinal)?.id || validIds[validIds.length - 1];
        setYear(fallback);
      }
    }
  };

  const handleSelectDepartment = (code: string, name: string) => {
    setBranch(code);
    setDepartment(name);
  };

  const handleAnalyzeCustomCourseWithAi = async () => {
    const trimmed = customCourseInput.trim();
    if (!trimmed) return;
    setIsAnalyzingCourse(true);
    setAiAnalysisMessage(null);
    try {
      const meta = await api.analyzeCourse(trimmed);
      setCourse(meta.course);
      const mappedYears: YearOption[] = meta.years.map((y) => ({
        id: y.id,
        label: `${y.id} Year`,
        yearNumber: y.year_number,
        isPreFinal: y.is_pre_final,
        isFinal: y.is_final,
      }));
      setCustomYears(mappedYears);
      setYear(meta.final_year);
      setAiAnalysisMessage(
        `AI Analysis Verified: ${meta.course} (${meta.duration_years} Years duration). Pre-Final: ${meta.pre_final_year} Year, Final: ${meta.final_year} Year.`
      );
    } catch {
      setAiAnalysisMessage(`Configured standard duration for ${trimmed}.`);
    } finally {
      setIsAnalyzingCourse(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      course,
      department,
      branch,
      year,
      cgpa: parseFloat(Number(cgpa).toFixed(2)),
      active_backlogs: activeBacklogs,
      profile_completed: true,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl p-6 sm:p-8 space-y-6 my-auto text-slate-900">
        {/* Modal Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 mb-1">
              <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
              <span>Student Profile Configuration</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Select Your Academic Details
            </h2>
            <p className="text-xs text-slate-500">
              Department and Course are distinct. Academic standing (Final / Pre-Final Year) dynamically adapts to your course duration.
            </p>
          </div>
          {!isMandatory && onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Section 1: Course / Degree Program */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                Course / Degree Program
              </label>
              <span className="text-[11px] font-medium text-slate-500">
                Duration: {courseDuration} Years
              </span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {COURSES.map((c) => {
                const isSelected = course === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelectCourse(c.id)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all text-center ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {c.name}
                  </button>
                );
              })}
            </div>

            {/* AI Course Analyzer Option for Other Programs */}
            <div className="pt-1">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Other degree? e.g. Dual Degree, B.Arch"
                  value={customCourseInput}
                  onChange={(e) => setCustomCourseInput(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleAnalyzeCustomCourseWithAi}
                  disabled={isAnalyzingCourse || !customCourseInput.trim()}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 hover:border-indigo-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{isAnalyzingCourse ? 'Analyzing...' : 'AI Check'}</span>
                </button>
              </div>
              {aiAnalysisMessage && (
                <div className="mt-1.5 text-[11px] text-indigo-700 bg-indigo-50/70 border border-indigo-100 rounded-lg p-1.5">
                  {aiAnalysisMessage}
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Academic Department */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
              Academic Department
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DEPARTMENTS.map((d) => {
                const isSelected = branch === d.code;
                return (
                  <button
                    key={d.code}
                    type="button"
                    onClick={() => handleSelectDepartment(d.code, d.name)}
                    className={`p-2.5 rounded-xl border text-left text-xs transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-indigo-50/70 border-indigo-400 text-indigo-950 font-semibold'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div>
                      <span className="font-bold block">{d.code}</span>
                      <span className="text-[11px] text-slate-500 line-clamp-1">{d.name}</span>
                    </div>
                    {isSelected && <CheckCircle className="w-4 h-4 text-indigo-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Dynamic Year & Semantic Standing Card */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                Current Year ({course})
              </label>
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  {preFinalYearObj ? `${preFinalYearObj.id} Year is Pre-Final` : ''}
                  {preFinalYearObj && finalYearObj ? ' | ' : ''}
                  {finalYearObj ? `${finalYearObj.id} Year is Final` : ''}
                </span>
              </div>
            </div>

            {/* Dynamic Year Buttons */}
            <div className={`grid gap-2 ${activeYears.length === 2 ? 'grid-cols-2' : activeYears.length === 3 ? 'grid-cols-3' : activeYears.length === 5 ? 'grid-cols-5' : 'grid-cols-4'}`}>
              {activeYears.map((y) => {
                const isSelected = year === y.id;
                return (
                  <button
                    key={y.id}
                    type="button"
                    onClick={() => setYear(y.id)}
                    className={`py-2 px-2 rounded-xl border text-xs font-bold transition-all text-center flex flex-col items-center justify-center gap-1 ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>{y.label}</span>
                    {y.isFinal && (
                      <span
                        className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-md ${
                          isSelected
                            ? 'bg-indigo-500/30 text-indigo-200 border border-indigo-400/30'
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        }`}
                      >
                        Final Year
                      </span>
                    )}
                    {y.isPreFinal && (
                      <span
                        className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-md ${
                          isSelected
                            ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/30'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        Pre-Final
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 4: CPI & Backlogs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Current CPI */}
            <div className="space-y-2">
              <label htmlFor="cgpaInput" className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                Current CPI / CGPA (0.0 - 10.0)
              </label>
              <div>
                <input
                  id="cgpaInput"
                  type="number"
                  step="0.01"
                  min="0"
                  max="10"
                  required
                  value={cgpa}
                  onChange={(e) => setCgpa(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Active Backlogs */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                Active Backlogs
              </label>
              <div className="flex gap-2 h-[38px]">
                <button
                  type="button"
                  onClick={() => setActiveBacklogs(false)}
                  className={`flex-1 rounded-xl text-xs font-bold border transition-colors flex items-center justify-center ${
                    !activeBacklogs
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  No Backlogs
                </button>
                <button
                  type="button"
                  onClick={() => setActiveBacklogs(true)}
                  className={`flex-1 rounded-xl text-xs font-bold border transition-colors flex items-center justify-center ${
                    activeBacklogs
                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Has Backlogs
                </button>
              </div>
            </div>
          </div>

          {/* Academic Context Notice Card */}
          <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-3 flex items-start gap-2.5 text-xs text-slate-600">
            <AlertCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              Notices marked <strong>"Final Year"</strong> will match when you are in {finalYearObj?.id} Year of {course}. Notices marked <strong>"Pre-Final Year"</strong> (e.g. internships) will match when you are in {preFinalYearObj?.id} Year.
            </p>
          </div>

          {/* Action Button */}
          <button
            type="submit"
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg cursor-pointer"
          >
            <span>Save Profile & Continue to Notice Intake</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProfileSetupModal;
