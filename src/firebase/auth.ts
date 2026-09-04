import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  getDocs,
  collection,
  updateDoc
} from 'firebase/firestore';
import { auth, db } from './config';

export type UserRole = 'admin' | 'student';

export interface AppUserProfile {
  uid: string;
  email: string;
  displayName: string;
  telegramUsername: string; // Required for all registered students
  role: UserRole;
  status: 'ACTIVE' | 'SUSPENDED';
  associatedCertificateIds: string[]; // 1-to-many relationship
  createdAt: string;
  lastLoginAt?: string;
  notes?: string;
}

const USERS_COLLECTION = 'registered_users';
const LOCAL_USERS_KEY = 'ymca_registered_users_v3';

// Seed generic test accounts (NO real student names as per strict privacy requirements)
const INITIAL_GENERIC_USERS: AppUserProfile[] = [
  {
    uid: 'admin-default-uid',
    email: 'systemadmin@ymca.org',
    displayName: 'System Administrator',
    telegramUsername: '@ymca_admin',
    role: 'admin',
    status: 'ACTIVE',
    associatedCertificateIds: [],
    createdAt: '2026-09-01T08:00:00.000Z',
    lastLoginAt: '2026-09-04T07:30:00.000Z'
  },
  {
    uid: 'demo-student-01',
    email: 'student.demo@example.com',
    displayName: 'Demo Student Account',
    telegramUsername: '@demo_student',
    role: 'student',
    status: 'ACTIVE',
    associatedCertificateIds: ['1941b070-ee2c-4f46-ce3c-f7daaba012b4'],
    createdAt: '2026-09-02T10:00:00.000Z',
    lastLoginAt: '2026-09-04T06:00:00.000Z'
  }
];

function getLocalUsers(): AppUserProfile[] {
  try {
    const saved = localStorage.getItem(LOCAL_USERS_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.warn('Failed to parse local users', e);
  }
  return [...INITIAL_GENERIC_USERS];
}

function saveLocalUsers(users: AppUserProfile[]) {
  try {
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
  } catch (e) {
    console.warn('Failed to save local users', e);
  }
}

// ─────────────────────────────────────────────
// User Profile Helpers
// ─────────────────────────────────────────────

export async function getUserProfile(uid: string): Promise<AppUserProfile | null> {
  try {
    const ref = doc(db, USERS_COLLECTION, uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data() as AppUserProfile;
    }
  } catch (e) {
    console.warn('Could not fetch user profile from Firestore:', e);
  }

  // Fallback to local
  const list = getLocalUsers();
  const found = list.find(u => u.uid === uid || u.email.toLowerCase() === uid.toLowerCase());
  return found || null;
}

export async function getAllRegisteredUsers(): Promise<AppUserProfile[]> {
  try {
    const ref = collection(db, USERS_COLLECTION);
    const snap = await getDocs(ref);
    if (!snap.empty) {
      const users: AppUserProfile[] = [];
      snap.forEach(d => users.push(d.data() as AppUserProfile));
      saveLocalUsers(users);
      return users;
    }
  } catch (e) {
    console.warn('Could not fetch all users from Firestore:', e);
  }
  return getLocalUsers();
}

// ─────────────────────────────────────────────
// Authentication Actions
// ─────────────────────────────────────────────

export async function signInUser(
  email: string,
  pass: string
): Promise<{ success: boolean; user?: AppUserProfile; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();

  // Special check for default system admin credentials
  if (cleanEmail === 'systemadmin@ymca.org' && pass === 'ymcaadmincert') {
    let profile: AppUserProfile = {
      uid: 'admin-default-uid',
      email: 'systemadmin@ymca.org',
      displayName: 'System Administrator',
      telegramUsername: '@ymca_admin',
      role: 'admin',
      status: 'ACTIVE',
      associatedCertificateIds: [],
      createdAt: '2026-09-01T08:00:00.000Z',
      lastLoginAt: new Date().toISOString()
    };
    try {
      const cred = await signInWithEmailAndPassword(auth, cleanEmail, pass);
      profile.uid = cred.user.uid;
    } catch (e) {}
    return { success: true, user: profile };
  }

  try {
    const cred = await signInWithEmailAndPassword(auth, cleanEmail, pass);
    let profile = await getUserProfile(cred.user.uid);

    if (!profile) {
      profile = {
        uid: cred.user.uid,
        email: cleanEmail,
        displayName: cred.user.displayName || cleanEmail.split('@')[0],
        telegramUsername: '@unregistered',
        role: 'student',
        status: 'ACTIVE',
        associatedCertificateIds: [],
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString()
      };
      await setDoc(doc(db, USERS_COLLECTION, cred.user.uid), profile);
    } else {
      try {
        await updateDoc(doc(db, USERS_COLLECTION, cred.user.uid), {
          lastLoginAt: new Date().toISOString()
        });
      } catch (e) {}
    }

    return { success: true, user: profile };
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
      return { success: false, error: 'Invalid email or password.' };
    }
    // Check local database for matching demo student
    const local = getLocalUsers();
    const matched = local.find(u => u.email.toLowerCase() === cleanEmail);
    if (matched) {
      return { success: true, user: matched };
    }
    return { success: false, error: 'Authentication failed. Please check your credentials.' };
  }
}

export async function registerUser(
  email: string,
  pass: string,
  displayName: string,
  telegramUsername: string
): Promise<{ success: boolean; user?: AppUserProfile; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = displayName.trim();
  let cleanTelegram = telegramUsername.trim();
  if (!cleanTelegram.startsWith('@')) {
    cleanTelegram = '@' + cleanTelegram;
  }

  let newUid = 'usr_' + Date.now();

  try {
    const cred = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
    newUid = cred.user.uid;
    await updateProfile(cred.user, { displayName: cleanName });
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === 'auth/email-already-in-use') {
      return { success: false, error: 'An account with this email already exists. Please sign in.' };
    }
    if (code === 'auth/weak-password') {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }
    console.warn('Firebase createUser failed, continuing with local store:', err);
  }

  const newProfile: AppUserProfile = {
    uid: newUid,
    email: cleanEmail,
    displayName: cleanName,
    telegramUsername: cleanTelegram,
    role: cleanEmail === 'systemadmin@ymca.org' ? 'admin' : 'student',
    status: 'ACTIVE',
    associatedCertificateIds: [],
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString()
  };

  try {
    await setDoc(doc(db, USERS_COLLECTION, newUid), newProfile);
  } catch (e) {
    console.warn('Failed to save user in Firestore:', e);
  }

  const local = getLocalUsers();
  local.unshift(newProfile);
  saveLocalUsers(local);

  return { success: true, user: newProfile };
}

export async function logOutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (e) {
    console.warn('SignOut failed:', e);
  }
}

// ─────────────────────────────────────────────
// Admin Management of Registered Users
// ─────────────────────────────────────────────

export async function toggleRegisteredUserRole(uid: string, newRole: UserRole): Promise<boolean> {
  try {
    const ref = doc(db, USERS_COLLECTION, uid);
    await updateDoc(ref, { role: newRole });
  } catch (e) {
    console.warn('Firestore update role failed:', e);
  }

  const local = getLocalUsers();
  const idx = local.findIndex(u => u.uid === uid);
  if (idx !== -1) {
    local[idx].role = newRole;
    saveLocalUsers(local);
    return true;
  }
  return false;
}

export async function updateRegisteredUserStatus(uid: string, newStatus: 'ACTIVE' | 'SUSPENDED'): Promise<boolean> {
  try {
    const ref = doc(db, USERS_COLLECTION, uid);
    await updateDoc(ref, { status: newStatus });
  } catch (e) {
    console.warn('Firestore update status failed:', e);
  }

  const local = getLocalUsers();
  const idx = local.findIndex(u => u.uid === uid);
  if (idx !== -1) {
    local[idx].status = newStatus;
    saveLocalUsers(local);
    return true;
  }
  return false;
}

export async function associateCertificateToUser(uid: string, certId: string): Promise<boolean> {
  const local = getLocalUsers();
  const idx = local.findIndex(u => u.uid === uid);
  if (idx !== -1) {
    const current = local[idx].associatedCertificateIds || [];
    if (!current.includes(certId)) {
      current.push(certId);
      local[idx].associatedCertificateIds = current;
      saveLocalUsers(local);
      try {
        const ref = doc(db, USERS_COLLECTION, uid);
        await updateDoc(ref, { associatedCertificateIds: current });
      } catch (e) {}
      return true;
    }
  }
  return false;
}

export async function removeAssociatedCertificate(uid: string, certId: string): Promise<boolean> {
  const local = getLocalUsers();
  const idx = local.findIndex(u => u.uid === uid);
  if (idx !== -1) {
    const current = (local[idx].associatedCertificateIds || []).filter(id => id !== certId);
    local[idx].associatedCertificateIds = current;
    saveLocalUsers(local);
    try {
      const ref = doc(db, USERS_COLLECTION, uid);
      await updateDoc(ref, { associatedCertificateIds: current });
    } catch (e) {}
    return true;
  }
  return false;
}

export async function ensureDefaultAdminExists(): Promise<void> {
  const DEFAULT_EMAIL = 'systemadmin@ymca.org';
  const DEFAULT_PASSWORD = 'ymcaadmincert';

  try {
    const cred = await signInWithEmailAndPassword(auth, DEFAULT_EMAIL, DEFAULT_PASSWORD);
    const profile = await getUserProfile(cred.user.uid);
    if (!profile) {
      await setDoc(doc(db, USERS_COLLECTION, cred.user.uid), {
        uid: cred.user.uid,
        email: DEFAULT_EMAIL,
        displayName: 'System Administrator',
        telegramUsername: '@ymca_admin',
        role: 'admin',
        status: 'ACTIVE',
        associatedCertificateIds: [],
        createdAt: new Date().toISOString()
      });
    }
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === 'auth/user-not-found' || code === 'auth/invalid-credential') {
      try {
        const newCred = await createUserWithEmailAndPassword(auth, DEFAULT_EMAIL, DEFAULT_PASSWORD);
        await setDoc(doc(db, USERS_COLLECTION, newCred.user.uid), {
          uid: newCred.user.uid,
          email: DEFAULT_EMAIL,
          displayName: 'System Administrator',
          telegramUsername: '@ymca_admin',
          role: 'admin',
          status: 'ACTIVE',
          associatedCertificateIds: [],
          createdAt: new Date().toISOString()
        });
      } catch (createErr) {}
    }
  }
}
