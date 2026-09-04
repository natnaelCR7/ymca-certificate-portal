import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase/config';
import {
  getUserProfile,
  AppUserProfile,
  ensureDefaultAdminExists,
  signInUser as apiSignInUser,
  registerUser as apiRegisterUser,
  logOutUser as apiLogOutUser
} from '../firebase/auth';
import {
  getGlobalPortalStatus,
  setGlobalPortalStatus,
  getProgramAvailabilityMap,
  setProgramAvailability
} from '../firebase/service';

interface AuthContextValue {
  firebaseUser: User | null;
  currentUser: AppUserProfile | null;
  isAdmin: boolean;
  isStudent: boolean;
  authLoading: boolean;
  portalActive: boolean;
  programAvailability: Record<string, boolean>;
  signIn: (email: string, pass: string) => Promise<{ success: boolean; user?: AppUserProfile; error?: string }>;
  signUp: (email: string, pass: string, displayName: string, telegramUsername: string) => Promise<{ success: boolean; user?: AppUserProfile; error?: string }>;
  logOut: () => Promise<void>;
  togglePortalStatus: (active: boolean) => Promise<void>;
  toggleProgramStatus: (program: string, active: boolean) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  firebaseUser: null,
  currentUser: null,
  isAdmin: false,
  isStudent: false,
  authLoading: true,
  portalActive: true,
  programAvailability: {},
  signIn: async () => ({ success: false }),
  signUp: async () => ({ success: false }),
  logOut: async () => {},
  togglePortalStatus: async () => {},
  toggleProgramStatus: async () => {},
  refreshProfile: async () => {}
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [currentUser, setCurrentUser] = useState<AppUserProfile | null>(() => {
    const cached = sessionStorage.getItem('ymca_active_user');
    if (cached) {
      try { return JSON.parse(cached); } catch (e) {}
    }
    return null;
  });
  const [authLoading, setAuthLoading] = useState(true);
  const [portalActive, setPortalActiveState] = useState<boolean>(() => getGlobalPortalStatus());
  const [programAvailability, setProgramAvailabilityState] = useState<Record<string, boolean>>(() => getProgramAvailabilityMap());

  useEffect(() => {
    ensureDefaultAdminExists().catch(() => {});
  }, []);

  const fetchProfile = async (uid: string) => {
    const profile = await getUserProfile(uid);
    if (profile) {
      setCurrentUser(profile);
      sessionStorage.setItem('ymca_active_user', JSON.stringify(profile));
    }
    return profile;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        await fetchProfile(user.uid);
      } else {
        const cached = sessionStorage.getItem('ymca_active_user');
        if (!cached) {
          setCurrentUser(null);
        }
      }
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  const signIn = async (email: string, pass: string) => {
    const res = await apiSignInUser(email, pass);
    if (res.success && res.user) {
      setCurrentUser(res.user);
      sessionStorage.setItem('ymca_active_user', JSON.stringify(res.user));
    }
    return res;
  };

  const signUp = async (email: string, pass: string, displayName: string, telegramUsername: string) => {
    const res = await apiRegisterUser(email, pass, displayName, telegramUsername);
    if (res.success && res.user) {
      setCurrentUser(res.user);
      sessionStorage.setItem('ymca_active_user', JSON.stringify(res.user));
    }
    return res;
  };

  const logOut = async () => {
    await apiLogOutUser();
    setCurrentUser(null);
    sessionStorage.removeItem('ymca_active_user');
  };

  const togglePortalStatus = async (active: boolean) => {
    await setGlobalPortalStatus(active);
    setPortalActiveState(active);
  };

  const toggleProgramStatus = async (program: string, active: boolean) => {
    await setProgramAvailability(program, active);
    setProgramAvailabilityState(prev => ({ ...prev, [program]: active }));
  };

  const refreshProfile = async () => {
    if (currentUser) {
      await fetchProfile(currentUser.uid);
    }
  };

  const isAdmin = !!currentUser && currentUser.role === 'admin';
  const isStudent = !!currentUser && currentUser.role === 'student';

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        currentUser,
        isAdmin,
        isStudent,
        authLoading,
        portalActive,
        programAvailability,
        signIn,
        signUp,
        logOut,
        togglePortalStatus,
        toggleProgramStatus,
        refreshProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
