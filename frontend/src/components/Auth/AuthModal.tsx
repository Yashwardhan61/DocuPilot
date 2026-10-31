import React, { useState } from 'react';
import { Eye, EyeOff, ShieldCheck, Phone, Mail, Lock, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

// Inline Google SVG icon
const GoogleIcon = () => (
  <svg className="mr-2.5 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

export const AuthModal: React.FC = () => {
  const { loginWithEmail, signupWithEmail, loginWithGoogle, loginAsDemoStudent } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  
  // Form fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Validation rules
  const isValidEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
  const isValidPassword = (val: string) => val.length >= 8;
  const isValidPhone = (val: string) => {
    // Accepts 10 digits or standard international format (+91XXXXXXXXXX)
    const cleaned = val.replace(/[\s-]/g, '');
    return /^\+?[0-9]{10,13}$/.test(cleaned);
  };

  const canSubmitLogin = isValidEmail(email) && isValidPassword(password);
  const canSubmitSignup =
    fullName.trim().length >= 2 &&
    isValidEmail(email) &&
    isValidPhone(phone) &&
    isValidPassword(password) &&
    password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'signup' && !isValidPhone(phone)) {
      setError('Please provide a valid 10-digit phone number');
      return;
    }

    if (mode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        await loginWithEmail({ email, password });
      } else {
        await signupWithEmail({
          name: fullName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          password,
          confirmPassword,
        });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 sm:p-8 space-y-6 my-auto border border-slate-200">
        {/* Header */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-slate-900 text-white shadow-xs mb-1">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">DocuPilot</h1>
          <p className="text-xs text-slate-500">Notice-to-Action Agent for MNNIT Students</p>
        </div>

        {/* Tab Toggle */}
        <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'login'}
            onClick={() => { setMode('login'); setError(null); }}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
              mode === 'login' 
                ? 'bg-white text-slate-900 shadow-xs' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'signup'}
            onClick={() => { setMode('signup'); setError(null); }}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
              mode === 'signup' 
                ? 'bg-white text-slate-900 shadow-xs' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Direct Google Login */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={loginWithGoogle}
            className="flex items-center justify-center w-full py-2.5 px-4 border border-slate-300 rounded-xl hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors shadow-xs"
          >
            <GoogleIcon />
            <span>Continue with Google</span>
          </button>

          {mode === 'login' && (
            <button
              type="button"
              onClick={loginAsDemoStudent}
              className="w-full py-2 px-3 border border-dashed border-indigo-300 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-700 rounded-xl text-xs font-semibold transition-colors text-center"
            >
              Demo Student Quick Access
            </button>
          )}
        </div>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-[11px] font-medium text-slate-400 bg-white px-3">
            or continue with credentials
          </div>
        </div>

        {/* Email & Password Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'signup' && (
            <div>
              <label htmlFor="fullName" className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <UserIcon className="h-4 w-4" />
                </div>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  placeholder="e.g. Yashwardhan Singh"
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-xs font-semibold text-slate-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Mail className="h-4 w-4" />
              </div>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="student@mnnit.ac.in"
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            {email && !isValidEmail(email) && (
              <p className="text-[11px] text-amber-600 mt-1">Please enter a valid email address.</p>
            )}
          </div>

          {mode === 'signup' && (
            <div>
              <label htmlFor="phone" className="block text-xs font-semibold text-slate-700 mb-1">
                Phone Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Phone className="h-4 w-4" />
                </div>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  placeholder="10-digit mobile number"
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              {phone && !isValidPhone(phone) && (
                <p className="text-[11px] text-rose-600 mt-1">Please enter a valid 10-digit mobile number.</p>
              )}
            </div>
          )}

          <div>
            <label htmlFor="password" className="block text-xs font-semibold text-slate-700 mb-1">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="h-4 w-4" />
              </div>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="At least 8 characters"
                className="w-full pl-9 pr-10 py-2 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 right-0 px-3 flex items-center text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {password && !isValidPassword(password) && (
              <p className="text-[11px] text-amber-600 mt-1">Password must be at least 8 characters.</p>
            )}
          </div>

          {mode === 'signup' && (
            <div>
              <label htmlFor="confirmPassword" className="block text-xs font-semibold text-slate-700 mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Re-enter your password"
                  className="w-full pl-9 pr-10 py-2 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="text-[11px] text-rose-600 mt-1">Passwords do not match.</p>
              )}
            </div>
          )}

          {error && (
            <p role="alert" className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || (mode === 'login' ? !canSubmitLogin : !canSubmitSignup)}
            className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xs flex items-center justify-center gap-2"
          >
            {loading && (
              <svg className="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            )}
            <span>{mode === 'login' ? 'Sign In' : 'Complete Registration'}</span>
          </button>
        </form>

        {/* Footer switch */}
        <p className="text-center text-xs text-slate-500">
          {mode === 'login' ? (
            <>
              First time on DocuPilot?{' '}
              <button 
                type="button" 
                onClick={() => { setMode('signup'); setError(null); }} 
                className="text-indigo-600 hover:underline font-bold"
              >
                Create Account
              </button>
            </>
          ) : (
            <>
              Already registered?{' '}
              <button 
                type="button" 
                onClick={() => { setMode('login'); setError(null); }} 
                className="text-indigo-600 hover:underline font-bold"
              >
                Sign In
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
};

export default AuthModal;
