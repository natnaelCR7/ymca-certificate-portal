import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch
} from 'firebase/firestore';
import { db } from './config';
import { CertificateRecord, INITIAL_CERTIFICATES, AVAILABLE_COURSES } from '../data/certifiedParticipants';

const COLLECTION_NAME = 'certificates';
const LOCAL_STORAGE_KEY = 'ymca_certificates_cache_v4';
const PORTAL_SETTINGS_KEY = 'ymca_portal_settings_v1';
const PROGRAM_SETTINGS_KEY = 'ymca_program_settings_v1';

export interface PortalSettings {
  portalActive: boolean; // ON vs OFF (Global Portal Status)
  lastUpdated: string;
}

export interface ProgramAvailability {
  program: string;
  available: boolean; // ON = Available, OFF = Pending / Disabled
  status: 'Available' | 'Pending';
}

export interface StudentGroup {
  studentName: string;
  certificates: CertificateRecord[];
  totalCertificates: number;
}

// ─────────────────────────────────────────────
// Global Portal & Program Availability Settings
// ─────────────────────────────────────────────

export function getGlobalPortalStatus(): boolean {
  try {
    const saved = localStorage.getItem(PORTAL_SETTINGS_KEY);
    if (saved) {
      const parsed: PortalSettings = JSON.parse(saved);
      return parsed.portalActive;
    }
  } catch (e) {}
  return true; // Default ON
}

export async function setGlobalPortalStatus(active: boolean): Promise<void> {
  const payload: PortalSettings = {
    portalActive: active,
    lastUpdated: new Date().toISOString()
  };
  try {
    localStorage.setItem(PORTAL_SETTINGS_KEY, JSON.stringify(payload));
    const ref = doc(db, 'system_settings', 'portal_status');
    await setDoc(ref, payload, { merge: true });
  } catch (e) {
    console.warn('Could not sync portal status to Firestore:', e);
  }
}

export function getProgramAvailabilityMap(): Record<string, boolean> {
  const defaults: Record<string, boolean> = {};
  AVAILABLE_COURSES.forEach(course => {
    defaults[course] = true; // All courses ON / Available by default
  });

  try {
    const saved = localStorage.getItem(PROGRAM_SETTINGS_KEY);
    if (saved) {
      return { ...defaults, ...JSON.parse(saved) };
    }
  } catch (e) {}
  return defaults;
}

export async function setProgramAvailability(program: string, available: boolean): Promise<void> {
  const current = getProgramAvailabilityMap();
  current[program] = available;
  try {
    localStorage.setItem(PROGRAM_SETTINGS_KEY, JSON.stringify(current));
    const ref = doc(db, 'system_settings', 'program_availability');
    await setDoc(ref, { settings: current, lastUpdated: new Date().toISOString() }, { merge: true });
  } catch (e) {
    console.warn('Could not sync program availability to Firestore:', e);
  }
}

// ─────────────────────────────────────────────
// Certificate Dataset (441 Records)
// ─────────────────────────────────────────────

function getLocalDataset(): CertificateRecord[] {
  try {
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (e) {
    console.warn('Could not read from localStorage', e);
  }
  return [...INITIAL_CERTIFICATES];
}

function saveLocalDataset(data: CertificateRecord[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Could not save to localStorage', e);
  }
}

export async function getAllCertificates(): Promise<CertificateRecord[]> {
  try {
    const colRef = collection(db, COLLECTION_NAME);
    const snapshot = await getDocs(colRef);
    if (!snapshot.empty) {
      const records: CertificateRecord[] = [];
      snapshot.forEach((doc) => {
        records.push(doc.data() as CertificateRecord);
      });
      saveLocalDataset(records);
      return records;
    }
  } catch (err) {
    console.warn('Firestore fetch failed, using local/cached dataset:', err);
  }
  return getLocalDataset();
}

export async function getCertificateById(id: string): Promise<CertificateRecord | null> {
  const cleanId = id.trim().toLowerCase();
  try {
    const docRef = doc(db, COLLECTION_NAME, cleanId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as CertificateRecord;
    }
  } catch (err) {
    console.warn('Firestore getById failed, checking local:', err);
  }

  const localList = getLocalDataset();
  const match = localList.find((c) => c.id.toLowerCase() === cleanId);
  return match || null;
}

// ─────────────────────────────────────────────
// 1-to-Many Student Relationship Logic
// ─────────────────────────────────────────────

/**
 * Returns all certificates belonging to a student (1-to-many relationship)
 */
export async function getCertificatesForStudent(
  studentName: string,
  associatedIds?: string[]
): Promise<CertificateRecord[]> {
  const all = await getAllCertificates();
  const normalizedName = studentName.trim().toLowerCase().replace(/\s+/g, ' ');

  const idSet = new Set((associatedIds || []).map(id => id.toLowerCase()));

  const matched = all.filter(c => {
    // 1. Matched by explicit associated Certificate ID
    if (idSet.has(c.id.toLowerCase())) return true;
    // 2. Matched by full student name
    const certName = c.name.trim().toLowerCase().replace(/\s+/g, ' ');
    return certName === normalizedName;
  });

  return matched;
}

/**
 * Groups all certificate records by student name to display 1-to-many groups
 */
export async function getStudentGroupedRecords(): Promise<StudentGroup[]> {
  const all = await getAllCertificates();
  const groupsMap: Record<string, CertificateRecord[]> = {};

  all.forEach(c => {
    const key = c.name.trim();
    if (!groupsMap[key]) {
      groupsMap[key] = [];
    }
    groupsMap[key].push(c);
  });

  const groups: StudentGroup[] = Object.keys(groupsMap).map(name => ({
    studentName: name,
    certificates: groupsMap[name],
    totalCertificates: groupsMap[name].length
  }));

  // Sort alphabetically
  groups.sort((a, b) => a.studentName.localeCompare(b.studentName));
  return groups;
}

/**
 * Updates a student's name across ALL their associated certificates in the dataset (synchronized edit)
 */
export async function updateStudentNameInDataset(
  oldName: string,
  newName: string
): Promise<number> {
  const cleanOld = oldName.trim().toLowerCase();
  const cleanNew = newName.trim();
  const all = getLocalDataset();
  let updatedCount = 0;

  for (let i = 0; i < all.length; i++) {
    if (all[i].name.trim().toLowerCase() === cleanOld) {
      all[i].name = cleanNew;
      updatedCount++;
      try {
        const docRef = doc(db, COLLECTION_NAME, all[i].id.toLowerCase());
        await updateDoc(docRef, { name: cleanNew });
      } catch (e) {}
    }
  }

  saveLocalDataset(all);
  return updatedCount;
}

/**
 * Updates an individual certificate record
 */
export async function updateCertificateRecord(
  id: string,
  updates: Partial<CertificateRecord>
): Promise<boolean> {
  const all = getLocalDataset();
  const idx = all.findIndex(c => c.id.toLowerCase() === id.toLowerCase());
  if (idx !== -1) {
    all[idx] = { ...all[idx], ...updates };
    saveLocalDataset(all);
    try {
      const docRef = doc(db, COLLECTION_NAME, id.toLowerCase());
      await updateDoc(docRef, updates);
    } catch (e) {}
    return true;
  }
  return false;
}

/**
 * Deletes a certificate record
 */
export async function deleteCertificateRecord(id: string): Promise<boolean> {
  const all = getLocalDataset();
  const filtered = all.filter(c => c.id.toLowerCase() !== id.toLowerCase());
  saveLocalDataset(filtered);
  try {
    const docRef = doc(db, COLLECTION_NAME, id.toLowerCase());
    await deleteDoc(docRef);
  } catch (e) {}
  return true;
}

/**
 * Creates a new certificate record
 */
export async function createNewCertificate(
  studentName: string,
  course: string,
  email?: string
): Promise<CertificateRecord> {
  const cleanName = studentName.trim();
  const clean = cleanName.replace(/[^A-Za-z]/g, '').toUpperCase();
  const prefix = clean.length >= 4 ? clean.slice(0, 4) : clean.padEnd(4, 'X');
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let rand = '';
  for (let i = 0; i < 4; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const passcode = `${prefix}-${rand}`;

  let newId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    newId = crypto.randomUUID();
  }

  const newCert: CertificateRecord = {
    id: newId,
    name: cleanName,
    course: course.trim(),
    programme: 'YMCA Ethiopia Summer Program 2026',
    duration: 'June – August 2026',
    issueDate: 'September 4, 2026',
    status: 'VALID',
    passcode,
    email: email ? email.trim() : undefined,
    sourceFile: 'admin_added',
    sourceLine: 1,
    claimed: false,
    claimedAt: null,
    downloadCount: 0,
    createdAt: new Date().toISOString()
  };

  const all = getLocalDataset();
  all.unshift(newCert);
  saveLocalDataset(all);

  try {
    const docRef = doc(db, COLLECTION_NAME, newCert.id.toLowerCase());
    await setDoc(docRef, newCert);
  } catch (e) {}

  return newCert;
}

/**
 * Marks certificate as claimed by student
 */
export async function claimCertificateByStudent(id: string): Promise<CertificateRecord | null> {
  const now = new Date().toISOString();
  const all = getLocalDataset();
  const idx = all.findIndex(c => c.id.toLowerCase() === id.toLowerCase());
  if (idx !== -1) {
    all[idx].claimed = true;
    all[idx].claimedAt = all[idx].claimedAt || now;
    all[idx].downloadCount = (all[idx].downloadCount || 0) + 1;
    saveLocalDataset(all);
    try {
      const docRef = doc(db, COLLECTION_NAME, id.toLowerCase());
      await updateDoc(docRef, {
        claimed: true,
        claimedAt: all[idx].claimedAt,
        downloadCount: all[idx].downloadCount
      });
    } catch (e) {}
    return all[idx];
  }
  return null;
}

/**
 * Records download count without claiming (for admin download)
 */
export async function recordDownloadCountOnly(id: string): Promise<void> {
  const all = getLocalDataset();
  const idx = all.findIndex(c => c.id.toLowerCase() === id.toLowerCase());
  if (idx !== -1) {
    all[idx].downloadCount = (all[idx].downloadCount || 0) + 1;
    saveLocalDataset(all);
    try {
      const docRef = doc(db, COLLECTION_NAME, id.toLowerCase());
      await updateDoc(docRef, { downloadCount: all[idx].downloadCount });
    } catch (e) {}
  }
}

/**
 * Batch Sync 441 dataset to Firestore
 */
export async function syncBatchToFirestore(
  onProgress?: (current: number, total: number) => void
): Promise<{ success: number; failed: number }> {
  const total = INITIAL_CERTIFICATES.length;
  let successCount = 0;
  let failedCount = 0;
  const batchSize = 50;

  for (let i = 0; i < total; i += batchSize) {
    const chunk = INITIAL_CERTIFICATES.slice(i, i + batchSize);
    try {
      const batch = writeBatch(db);
      for (const cert of chunk) {
        const docRef = doc(db, COLLECTION_NAME, cert.id.toLowerCase());
        batch.set(docRef, cert, { merge: true });
      }
      await batch.commit();
      successCount += chunk.length;
      if (onProgress) {
        onProgress(Math.min(i + batchSize, total), total);
      }
    } catch (e) {
      console.error(`Batch commit failed at index ${i}:`, e);
      failedCount += chunk.length;
    }
  }

  return { success: successCount, failed: failedCount };
}
