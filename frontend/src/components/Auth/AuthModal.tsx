import React, { useState } from 'react';
import { Calendar, ShieldCheck, ArrowRight, CheckCircle2, Lock, AlertCircle, Settings } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { isFirebaseConfigured, loadActiveFirebaseConfig, saveFirebaseConfig, FirebaseWebConfig } from '../../services/firebase';

// Authentic Google SVG Icon
const GoogleIcon = () => (
  <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
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
  const { loginWithGoogle, loginAsDemoStudent } = useAuth();
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);

  // Custom Firebase configuration state
  const currentConfig = loadActiveFirebaseConfig();
  const [configForm, setConfigForm] = useState<FirebaseWebConfig>({
    apiKey: currentConfig.apiKey || '',
    authDomain: currentConfig.authDomain || '',
    projectId: currentConfig.projectId || '',
    appId: currentConfig.appId || '',
    storageBucket: currentConfig.storageBucket || '',
    messagingSenderId: currentConfig.messagingSenderId || '',
  });

  const configured = isFirebaseConfigured();

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setAuthError(null);
    try {
      await loginWithGoogle();
    } catch (err: unknown) {
      let message = 'Firebase authentication encountered an error.';
      if (err && typeof err === 'object') {
        const anyErr = err as { code?: string; message?: string };
        if (anyErr.code === 'auth/configuration-not-found' || anyErr.message?.includes('configuration-not-found')) {
          message = 'Firebase Authentication is not activated in project "docupiolet" yet. Open Firebase Console and click "Get started" under Authentication > Sign-in method > Google.';
        } else if (anyErr.code === 'auth/invalid-api-key' || anyErr.message?.includes('invalid-api-key')) {
          message = 'Firebase API Key is invalid or not yet configured. Please provide your real Firebase project keys below.';
          setShowConfig(true);
        } else if (anyErr.code === 'auth/popup-closed-by-user') {
          message = 'The Google sign-in popup was closed before authentication could finish.';
        } else if (anyErr.code === 'auth/unauthorized-domain') {
          message = 'This domain (localhost) is not in your Firebase Authorized Domains list. Add localhost in Firebase Console > Authentication > Settings > Authorized domains.';
        } else if (anyErr.message) {
          message = anyErr.message;
        }
      }
      setAuthError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!configForm.apiKey.trim() || !configForm.projectId.trim()) {
      setAuthError('API Key and Project ID are required.');
      return;
    }
    saveFirebaseConfig({
      ...configForm,
      authDomain: configForm.authDomain.trim() || `${configForm.projectId.trim()}.firebaseapp.com`,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200/70 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans text-slate-900">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Header Branding */}
        <div className="text-center space-y-3 mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-900 text-white shadow-md shadow-slate-900/10 mb-1">
            <ShieldCheck className="w-8 h-8 text-indigo-400" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">DocuPilot</h1>
          <p className="text-xs text-slate-600 max-w-sm mx-auto font-medium">
            Notice-to-Action Agent for MNNIT Allahabad Students
          </p>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <Lock className="w-3 h-3 text-indigo-600" />
            <span>Firebase Authentication & Google OAuth</span>
          </div>
        </div>

        {/* Light Theme Card */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/60 space-y-6">
          <div className="space-y-1.5 text-center">
            <h2 className="text-lg font-bold text-slate-900">Student Sign In</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Sign in with your student Google account to parse notices, verify eligibility, and sync reminders directly to your Google Calendar.
            </p>
          </div>

          {/* Config Alert if not configured */}
          {!configured && !authError && (
            <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1 text-left">
                <span className="font-semibold block">Firebase Project Setup Needed</span>
                <span className="text-[11px] text-amber-800 leading-normal block">
                  To authenticate via your real Google account on Firebase servers, enter your Firebase web app keys below or configure frontend/.env.
                </span>
                <button
                  type="button"
                  onClick={() => setShowConfig(true)}
                  className="text-[11px] font-bold text-indigo-700 hover:underline flex items-center gap-1 mt-1"
                >
                  <Settings className="w-3 h-3" />
                  <span>Enter Firebase Web Config</span>
                </button>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {authError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1 text-left flex-1">
                <span className="font-semibold block">Authentication Notice</span>
                <span className="text-[11px] text-rose-600 leading-normal block">{authError}</span>
                {authError.includes('docupiolet') && (
                  <a
                    href="https://console.firebase.google.com/project/docupiolet/authentication"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-1 text-[11px] font-bold text-indigo-700 hover:underline"
                  >
                    <span>Open Firebase Console Authentication</span>
                    <ArrowRight className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Primary Action: Continue with Google */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="flex items-center justify-center w-full py-3.5 px-4 bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-300 rounded-2xl text-sm font-semibold text-slate-800 transition-all shadow-xs hover:shadow-md disabled:opacity-60"
            >
              <GoogleIcon />
              <span>{loading ? 'Opening Firebase Google Popup...' : 'Continue with Google'}</span>
            </button>

            {/* Quick Demo Access for evaluators */}
            <button
              type="button"
              onClick={loginAsDemoStudent}
              className="flex items-center justify-center w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-slate-700 rounded-2xl text-xs font-semibold transition-colors"
            >
              <span>Demo Student Quick Access (yash.2024@mnnit.ac.in)</span>
            </button>
          </div>

          {/* Expandable Firebase Configuration Form */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowConfig(!showConfig)}
              className="text-xs text-slate-500 hover:text-slate-800 transition-colors w-full text-center flex items-center justify-center gap-1.5"
            >
              <Settings className="w-3.5 h-3.5 text-slate-400" />
              <span>{showConfig ? 'Hide Firebase Config' : 'Configure Real Firebase Project Keys'}</span>
            </button>

            {showConfig && (
              <form onSubmit={handleSaveConfig} className="space-y-3 pt-3 border-t border-slate-100 mt-2 text-left">
                <p className="text-[11px] text-slate-500">
                  Paste your Firebase Web credentials (from Firebase Console &gt; Project Settings &gt; General):
                </p>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">apiKey</label>
                  <input
                    type="text"
                    required
                    value={configForm.apiKey}
                    onChange={(e) => setConfigForm({ ...configForm, apiKey: e.target.value })}
                    placeholder="AIzaSy..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">authDomain</label>
                  <input
                    type="text"
                    value={configForm.authDomain}
                    onChange={(e) => setConfigForm({ ...configForm, authDomain: e.target.value })}
                    placeholder="my-project.firebaseapp.com"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">projectId</label>
                  <input
                    type="text"
                    required
                    value={configForm.projectId}
                    onChange={(e) => setConfigForm({ ...configForm, projectId: e.target.value })}
                    placeholder="my-project-id"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">appId</label>
                  <input
                    type="text"
                    value={configForm.appId}
                    onChange={(e) => setConfigForm({ ...configForm, appId: e.target.value })}
                    placeholder="1:123456789:web:abcdef..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-all shadow-xs"
                >
                  <span>Save Real Firebase Keys & Connect</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>
            )}
          </div>

          {/* Google Calendar Link Notification */}
          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 flex items-start gap-3">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800 shrink-0 mt-0.5">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="space-y-1 text-left">
              <p className="text-xs font-bold text-emerald-950">Google Calendar Connected</p>
              <p className="text-[11px] text-emerald-800/90 leading-relaxed">
                Signing in enables automated scheduling of 12-hour and 3-hour prior reminder alerts for all circular deadlines on your personal calendar.
              </p>
            </div>
          </div>

          {/* Verification Guarantee */}
          <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500 pt-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Deterministic verification • Grounded notice citations</span>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-slate-500">
          DocuPilot • Hacktoberfest Hack Day Prayagraj x CC Club MNNIT
        </p>
      </div>
    </div>
  );
};

export default AuthModal;
