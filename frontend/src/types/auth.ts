export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  branch?: string;
  year?: string;
  provider: 'google' | 'email';
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface SignupCredentials {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  branch?: string;
  year?: string;
}

export interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginWithEmail: (creds: LoginCredentials) => Promise<void>;
  signupWithEmail: (creds: SignupCredentials) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginAsDemoStudent: () => void;
  logout: () => void;
}

