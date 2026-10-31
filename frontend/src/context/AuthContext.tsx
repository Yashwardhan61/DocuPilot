import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserProfile, LoginCredentials, SignupCredentials, AuthContextType } from '../types/auth';

const STORAGE_KEY = 'docupilot_auth_user';

const DEMO_STUDENT: UserProfile = {
  id: 'mnnit-student-2026',
  name: 'Yashwardhan Singh',
  email: 'yash.2024@mnnit.ac.in',
  branch: 'Computer Science & Engineering',
  year: '3rd Year B.Tech',
  provider: 'google',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Restore stored session on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch {
      console.warn('Failed to parse stored auth user');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveUserSession = (newUser: UserProfile | null) => {
    setUser(newUser);
    if (newUser) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const loginWithEmail = async (creds: LoginCredentials): Promise<void> => {
    // Simulated authentication delay
    await new Promise((resolve) => setTimeout(resolve, 400));
    
    // In demo environment, generate student profile from email
    const namePart = creds.email.split('@')[0].replace(/[._]/g, ' ');
    const formattedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);

    const loggedInUser: UserProfile = {
      id: `usr-${Date.now()}`,
      name: formattedName || 'MNNIT Student',
      email: creds.email,
      provider: 'email',
      branch: 'Computer Science',
      year: '3rd Year',
    };

    saveUserSession(loggedInUser);
  };

  const signupWithEmail = async (creds: SignupCredentials): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 400));

    const newUser: UserProfile = {
      id: `usr-${Date.now()}`,
      name: creds.name,
      email: creds.email,
      provider: 'email',
      branch: creds.branch || 'Engineering',
      year: creds.year || '3rd Year',
    };

    saveUserSession(newUser);
  };

  const loginWithGoogle = async (): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    saveUserSession(DEMO_STUDENT);
  };

  const loginAsDemoStudent = () => {
    saveUserSession(DEMO_STUDENT);
  };

  const logout = () => {
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

