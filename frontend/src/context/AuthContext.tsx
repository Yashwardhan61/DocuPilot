import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserProfile, LoginCredentials, SignupCredentials, AuthContextType } from '../types/auth';
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  firebaseSignOut, 
  onAuthStateChanged, 
  GoogleAuthProvider 
} from '../services/firebase';

const STORAGE_KEY = 'docupilot_auth_user';

const DEMO_STUDENT: UserProfile = {
  id: 'mnnit-student-2026',
  name: 'Yashwardhan Singh',
  email: 'yash.2024@mnnit.ac.in',
  phone: '9876543210',
  branch: 'Computer Science & Engineering',
  year: '3rd Year B.Tech',
  provider: 'google',
  calendarConnected: true,
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
};

const resolvePersonNameFromGoogle = (displayName: string | null | undefined, email: string | null | undefined): string => {
  if (displayName && displayName.trim()) {
    return displayName.trim();
  }
  if (email && email.includes('@')) {
    const localPart = email.split('@')[0].replace(/[._0-9-]/g, ' ').trim();
    if (localPart) {
      return localPart
        .split(' ')
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
    }
  }
  return 'Student';
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Restore stored session and observe Firebase Auth state
  useEffect(() => {
    // First load from localStorage for instant offline access
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch {
      console.warn('Failed to parse stored auth user');
    }

    // Subscribe to Firebase Authentication state changes
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const studentName = resolvePersonNameFromGoogle(firebaseUser.displayName, firebaseUser.email);
        const mappedUser: UserProfile = {
          id: firebaseUser.uid,
          name: studentName,
          email: firebaseUser.email || 'student@mnnit.ac.in',
          avatarUrl: firebaseUser.photoURL || undefined,
          provider: 'google',
          calendarConnected: true,
          branch: 'Computer Science & Engineering',
          year: '3rd Year B.Tech',
        };
        setUser(mappedUser);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(mappedUser));
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const saveUserSession = (newUser: UserProfile | null) => {
    setUser(newUser);
    if (newUser) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const loginWithGoogle = async (customEmail?: string, customName?: string): Promise<void> => {
    // If a custom email was typed, handle directly
    if (customEmail && customEmail.trim()) {
      const cleanEmail = customEmail.trim();
      const derivedName = customName?.trim() || resolvePersonNameFromGoogle(null, cleanEmail);

      const googleUser: UserProfile = {
        id: `g-${Date.now()}`,
        name: derivedName,
        email: cleanEmail,
        provider: 'google',
        calendarConnected: true,
        branch: 'Computer Science & Engineering',
        year: '3rd Year B.Tech',
      };
      saveUserSession(googleUser);
      return;
    }

    try {
      // Trigger genuine Firebase Google OAuth popup
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;
      const fUser = result.user;

      const studentName = resolvePersonNameFromGoogle(fUser.displayName, fUser.email);

      const profile: UserProfile = {
        id: fUser.uid,
        name: studentName,
        email: fUser.email || 'student@mnnit.ac.in',
        avatarUrl: fUser.photoURL || undefined,
        provider: 'google',
        calendarConnected: true,
        branch: 'Computer Science & Engineering',
        year: '3rd Year B.Tech',
      };

      if (token) {
        localStorage.setItem('google_calendar_access_token', token);
      }

      saveUserSession(profile);
    } catch (err: unknown) {
      console.error('Firebase authentication failure:', err);
      // Do not substitute with dummy demo user. Propagate genuine Firebase error to UI.
      throw err;
    }
  };

  const loginAsDemoStudent = () => {
    saveUserSession(DEMO_STUDENT);
  };

  const loginWithEmail = async (creds: LoginCredentials): Promise<void> => {
    await loginWithGoogle(creds.email);
  };

  const signupWithEmail = async (creds: SignupCredentials): Promise<void> => {
    await loginWithGoogle(creds.email, creds.name);
  };

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
    } catch {
      // ignore
    }
    localStorage.removeItem('google_calendar_access_token');
    saveUserSession(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        loginWithEmail,
        signupWithEmail,
        loginWithGoogle,
        loginAsDemoStudent,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
