import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
  Auth
} from 'firebase/auth';

const STORAGE_FIREBASE_CONFIG_KEY = 'docupilot_firebase_custom_config';

export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
}

// Production Firebase Web App Configuration for docupiolet
const REAL_FIREBASE_CONFIG: FirebaseWebConfig = {
  apiKey: "AIzaSyDDXRWkDjxCihqjxx8Zcksp1cBxDAXCK54",
  authDomain: "docupiolet.firebaseapp.com",
  projectId: "docupiolet",
  storageBucket: "docupiolet.firebasestorage.app",
  messagingSenderId: "346463722738",
  appId: "1:346463722738:web:fc17cf7b7875c5dc1c846b"
};

export const loadActiveFirebaseConfig = (): FirebaseWebConfig => {
  try {
    const custom = localStorage.getItem(STORAGE_FIREBASE_CONFIG_KEY);
    if (custom) {
      const parsed = JSON.parse(custom);
      if (parsed.apiKey && !parsed.apiKey.includes('Dummy')) {
        return parsed;
      }
    }
  } catch {
    // fallback
  }

  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || REAL_FIREBASE_CONFIG.apiKey,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || REAL_FIREBASE_CONFIG.authDomain,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || REAL_FIREBASE_CONFIG.projectId,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || REAL_FIREBASE_CONFIG.storageBucket,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || REAL_FIREBASE_CONFIG.messagingSenderId,
    appId: import.meta.env.VITE_FIREBASE_APP_ID || REAL_FIREBASE_CONFIG.appId
  };
};

export const isFirebaseConfigured = (): boolean => {
  const cfg = loadActiveFirebaseConfig();
  return Boolean(cfg.apiKey && !cfg.apiKey.includes('Dummy') && cfg.projectId);
};

export const saveFirebaseConfig = (cfg: FirebaseWebConfig): void => {
  localStorage.setItem(STORAGE_FIREBASE_CONFIG_KEY, JSON.stringify(cfg));
  window.location.reload();
};

const activeConfig = loadActiveFirebaseConfig();

// Initialize or retrieve Firebase App with real config
export const app: FirebaseApp = getApps().length > 0 
  ? getApp() 
  : initializeApp(activeConfig);

// Initialize Firebase Auth
export const auth: Auth = getAuth(app);

// Configure Google Auth Provider with Profile and Email scopes (non-sensitive for smooth verification)
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('profile');
googleProvider.addScope('email');
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.profile');
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.email');
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export { 
  signInWithPopup, 
  firebaseSignOut, 
  onAuthStateChanged, 
  GoogleAuthProvider 
};
export type { FirebaseUser };
