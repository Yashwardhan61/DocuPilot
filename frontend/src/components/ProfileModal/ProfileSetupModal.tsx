import React, { useState } from 'react';
import { GraduationCap, CheckCircle, ArrowRight, X } from 'lucide-react';
import { StudentProfile } from '../../types/notice';

interface ProfileSetupModalProps {
  isOpen: boolean;
  initialProfile: StudentProfile;
  onSave: (profile: StudentProfile) => void;
  onClose?: () => void;
  isMandatory?: boolean;
}

export const COURSES = [
  { id: 'B.Tech', name: 'B.Tech', desc: 'Bachelor of Technology' },
  { id: 'M.Tech', name: 'M.Tech', desc: 'Master of Technology' },
  { id: 'MCA', name: 'MCA', desc: 'Master of Computer Applications' },
  { id: 'MBA', name: 'MBA', desc: 'Master of Business Administration' },
  { id: 'M.Sc', name: 'M.Sc', desc: 'Master of Science' },
  { id: 'Ph.D.', name: 'Ph.D.', desc: 'Doctor of Philosophy' },
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

export const YEARS = [
  { id: '1st', label: '1st Year' },
  { id: '2nd', label: '2nd Year' },
  { id: '3rd', label: '3rd Year' },
  { id: '4th', label: '4th Year' },
];

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

  if (!isOpen) return null;

  const handleSelectDepartment = (code: string, name: string) => {
    setBranch(code);
    setDepartment(name);
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
              Department and Course are distinct. DocuPilot matches both to evaluate notice eligibility.
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
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
              Course / Degree Program
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {COURSES.map((c) => {
                const isSelected = course === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCourse(c.id)}
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

          {/* Section 3: Year & CPI in two columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Academic Year */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                Current Year
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {YEARS.map((y) => {
                  const isSelected = year === y.id;
                  return (
                    <button
                      key={y.id}
                      type="button"
                      onClick={() => setYear(y.id)}
                      className={`py-2 rounded-xl border text-xs font-bold transition-all text-center ${
                        isSelected
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {y.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Current CPI */}
            <div className="space-y-2">
              <label htmlFor="cgpaInput" className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                Current CPI / CGPA (0.0 - 10.0)
              </label>
              <div className="relative">
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
          </div>

          {/* Section 4: Active Backlogs */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-800 block">Active Backlogs</span>
              <span className="text-[11px] text-slate-500">Do you currently have any pending uncleared backlogs?</span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActiveBacklogs(false)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                  !activeBacklogs
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : 'bg-white text-slate-600 border-slate-200'
                }`}
              >
                No Backlogs
              </button>
              <button
                type="button"
                onClick={() => setActiveBacklogs(true)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                  activeBacklogs
                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                    : 'bg-white text-slate-600 border-slate-200'
                }`}
              >
                Has Backlogs
              </button>
            </div>
          </div>

          {/* Action Button */}
          <button
            type="submit"
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg"
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
