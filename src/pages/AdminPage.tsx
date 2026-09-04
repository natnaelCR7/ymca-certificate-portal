import React, { useState, useEffect } from 'react';
import {
  Shield, Plus, Search, RefreshCw, Download, Trash2,
  ExternalLink, Eye, EyeOff, Copy, Check, CheckCircle2,
  CloudUpload, LogOut, BarChart3, Users, Award, XCircle,
  ToggleLeft, ToggleRight, Edit3, Link as LinkIcon, Power,
  Clock, AlertTriangle, Layers, UserCheck, Send, Info
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { CertificateRecord, AVAILABLE_COURSES } from '../data/certifiedParticipants';
import {
  getAllRegisteredUsers,
  toggleRegisteredUserRole,
  updateRegisteredUserStatus,
  associateCertificateToUser,
  removeAssociatedCertificate,
  createAdminAccount,
  AppUserProfile,
  UserRole
} from '../firebase/auth';
import {
  getAllCertificates,
  getStudentGroupedRecords,
  StudentGroup,
  updateStudentNameInDataset,
  updateCertificateRecord,
  deleteCertificateRecord,
  createNewCertificate,
  syncBatchToFirestore
} from '../firebase/service';
import { downloadCertificatePdf, viewCertificatePdf } from '../utils/pdfGenerator';

type AdminTab = 'stats' | 'availability' | 'dataset' | 'registered';

export const AdminPage: React.FC = () => {
  const {
    currentUser,
    portalActive,
    togglePortalStatus,
    programAvailability,
    toggleProgramStatus,
    logOut
  } = useAuth();

  const [tab, setTab] = useState<AdminTab>('stats');

  // ── Data State ─────────────────────────────
  const [certs, setCerts] = useState<CertificateRecord[]>([]);
  const [studentGroups, setStudentGroups] = useState<StudentGroup[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<AppUserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Filters & Search ───────────────────────
  const [datasetSearch, setDatasetSearch] = useState('');
  const [datasetCourseFilter, setDatasetCourseFilter] = useState('ALL');
  const [datasetViewMode, setDatasetViewMode] = useState<'grouped' | 'list'>('grouped');

  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'ALL' | 'admin' | 'student'>('ALL');

  const [revealedPasscodes, setRevealedPasscodes] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // ── Modals State ───────────────────────────
  // 1. Edit Student Name Modal (Syncs across all certificates for student)
  const [editStudentGroup, setEditStudentGroup] = useState<StudentGroup | null>(null);
  const [newStudentNameInput, setNewStudentNameInput] = useState('');
  const [editingStudentSaving, setEditingStudentSaving] = useState(false);

  // 2. Edit Individual Certificate Modal
  const [editCertModal, setEditCertModal] = useState<CertificateRecord | null>(null);
  const [editCertCourse, setEditCertCourse] = useState('');
  const [editCertSaving, setEditCertSaving] = useState(false);

  // 3. Create New Certificate Modal
  const [createCertOpen, setCreateCertOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createCourse, setCreateCourse] = useState(AVAILABLE_COURSES[0]);
  const [createEmail, setCreateEmail] = useState('');
  const [creatingCert, setCreatingCert] = useState(false);

  // 4. Link Certificate to Registered User Modal
  const [linkUserModal, setLinkUserModal] = useState<AppUserProfile | null>(null);
  const [selectedCertIdToLink, setSelectedCertIdToLink] = useState('');

  // 5. Batch Sync
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  // 6. Create Admin Account Modal
  const [createAdminOpen, setCreateAdminOpen] = useState(false);
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newAdminTelegram, setNewAdminTelegram] = useState('');
  const [creatingAdmin, setCreatingAdmin] = useState(false);
  const [createAdminError, setCreateAdminError] = useState('');

  // Load all data
  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [allCerts, groups, usersList] = await Promise.all([
        getAllCertificates(),
        getStudentGroupedRecords(),
        getAllRegisteredUsers()
      ]);
      setCerts(allCerts);
      setStudentGroups(groups);
      setRegisteredUsers(usersList);
    } catch (e) {
      console.error('Failed to load admin data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  // ── Stats Calculations ─────────────────────
  const totalCerts = certs.length;
  const totalClaimed = certs.filter(c => c.claimed).length;
  const totalUnclaimed = totalCerts - totalClaimed;
  const totalRegisteredUsers = registeredUsers.length;
  const multiCertStudentsCount = studentGroups.filter(g => g.totalCertificates > 1).length;

  // ── Handlers ───────────────────────────────
  const handleSaveStudentNameEdit = async () => {
    if (!editStudentGroup || !newStudentNameInput.trim()) return;
    setEditingStudentSaving(true);
    try {
      await updateStudentNameInDataset(editStudentGroup.studentName, newStudentNameInput.trim());
      await loadAdminData();
      setEditStudentGroup(null);
    } catch (e) {
      console.error(e);
    } finally {
      setEditingStudentSaving(false);
    }
  };

  const handleSaveCertEdit = async () => {
    if (!editCertModal) return;
    setEditCertSaving(true);
    try {
      await updateCertificateRecord(editCertModal.id, { course: editCertCourse });
      await loadAdminData();
      setEditCertModal(null);
    } catch (e) {
      console.error(e);
    } finally {
      setEditCertSaving(false);
    }
  };

  const handleDeleteCert = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete this certificate for ${name}?`)) return;
    await deleteCertificateRecord(id);
    await loadAdminData();
  };

  const handleCreateNewCert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim()) return;
    setCreatingCert(true);
    try {
      await createNewCertificate(createName.trim(), createCourse, createEmail.trim() || undefined);
      await loadAdminData();
      setCreateCertOpen(false);
      setCreateName('');
      setCreateEmail('');
    } catch (e) {
      console.error(e);
    } finally {
      setCreatingCert(false);
    }
  };

  const handleLinkCertToUser = async () => {
    if (!linkUserModal || !selectedCertIdToLink) return;
    await associateCertificateToUser(linkUserModal.uid, selectedCertIdToLink);
    await loadAdminData();
    setLinkUserModal(null);
    setSelectedCertIdToLink('');
  };

  const handleRemoveCertFromUser = async (uid: string, certId: string) => {
    if (!window.confirm('Remove this certificate link from the user account?')) return;
    await removeAssociatedCertificate(uid, certId);
    await loadAdminData();
  };

  const handleCreateAdminAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminName.trim() || !newAdminEmail.trim() || !newAdminPassword.trim()) return;
    setCreatingAdmin(true);
    setCreateAdminError('');
    try {
      const result = await createAdminAccount(
        newAdminEmail.trim(),
        newAdminPassword.trim(),
        newAdminName.trim(),
        newAdminTelegram.trim() || '@admin'
      );
      if (!result.success) {
        setCreateAdminError(result.error || 'Failed to create admin account.');
        return;
      }
      await loadAdminData();
      setCreateAdminOpen(false);
      setNewAdminName('');
      setNewAdminEmail('');
      setNewAdminPassword('');
      setNewAdminTelegram('');
    } catch (err) {
      setCreateAdminError('An error occurred. Please try again.');
    } finally {
      setCreatingAdmin(false);
    }
  };

  const handleBatchSync = async () => {
    setSyncing(true);
    setSyncMsg('Writing 441 records to Firestore…');
    try {
      const res = await syncBatchToFirestore();
      setSyncMsg(`Sync complete! ${res.success} certificates synchronized.`);
      await loadAdminData();
    } catch (e) {
      setSyncMsg('Batch sync failed.');
    } finally {
      setSyncing(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtered dataset
  const filteredGroups = studentGroups.filter(g => {
    const q = datasetSearch.toLowerCase();
    const matchName = !q || g.studentName.toLowerCase().includes(q) || g.certificates.some(c => c.id.toLowerCase().includes(q) || c.course.toLowerCase().includes(q) || c.passcode.toLowerCase().includes(q));
    const matchCourse = datasetCourseFilter === 'ALL' || g.certificates.some(c => c.course === datasetCourseFilter);
    return matchName && matchCourse;
  });

  const filteredCertsList = certs.filter(c => {
    const q = datasetSearch.toLowerCase();
    const matchQ = !q || c.name.toLowerCase().includes(q) || c.course.toLowerCase().includes(q) || c.id.toLowerCase().includes(q) || c.passcode.toLowerCase().includes(q);
    const matchCourse = datasetCourseFilter === 'ALL' || c.course === datasetCourseFilter;
    return matchQ && matchCourse;
  });

  // Filtered registered users
  const filteredUsers = registeredUsers.filter(u => {
    const q = userSearch.toLowerCase();
    const matchQ = !q || u.displayName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.telegramUsername.toLowerCase().includes(q);
    const matchRole = userRoleFilter === 'ALL' || u.role === userRoleFilter;
    return matchQ && matchRole;
  });

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FFFFFF', display: 'flex', flexDirection: 'column' }}>
      {/* ── ADMIN HEADER (Strict White, Red, Grayscale - NO BLUE) ── */}
      <header style={{
        backgroundColor: '#0F172A',
        color: '#FFFFFF',
        borderBottom: '3px solid #C41230',
        padding: '0.85rem 1.5rem'
      }}>
        <div style={{
          maxWidth: '1360px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', padding: '3px 8px', display: 'flex', alignItems: 'center' }}>
              <img
                src="/logo.png"
                alt="YMCA"
                style={{ height: '32px', width: 'auto' }}
              />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
                  YMCA ETHIOPIA
                </span>
                <span style={{
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  backgroundColor: '#C41230',
                  color: '#FFFFFF',
                  padding: '2px 8px',
                  borderRadius: '4px'
                }}>
                  INTERNAL MANAGEMENT
                </span>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                Summer 2026 Certification Management System
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ fontSize: '0.82rem', color: '#CBD5E1' }}>
              Admin: <strong style={{ color: '#FFFFFF' }}>{currentUser?.email || 'systemadmin@ymca.org'}</strong>
            </div>

            <button
              onClick={() => loadAdminData()}
              className="btn-secondary"
              style={{ padding: '6px 12px', fontSize: '0.8rem', backgroundColor: '#1E293B', color: '#FFFFFF', borderColor: '#334155' }}
            >
              <RefreshCw size={13} className={loading ? 'spin' : ''} />
              Refresh
            </button>

            <button
              onClick={() => logOut()}
              className="btn-primary"
              style={{ padding: '6px 14px', fontSize: '0.8rem' }}
            >
              <LogOut size={13} />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* ── NAVIGATION TABS ───────────────────────────────────── */}
      <div style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid #E2E8F0', padding: '0 1.5rem' }}>
        <div style={{ maxWidth: '1360px', margin: '0 auto', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setTab('stats')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '1rem 1.25rem',
              fontSize: '0.9rem',
              fontWeight: 700,
              color: tab === 'stats' ? '#C41230' : '#475569',
              borderBottom: tab === 'stats' ? '3px solid #C41230' : '3px solid transparent',
              background: 'none',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer'
            }}
          >
            <BarChart3 size={17} />
            Overview & Statistics
          </button>

          <button
            onClick={() => setTab('availability')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '1rem 1.25rem',
              fontSize: '0.9rem',
              fontWeight: 700,
              color: tab === 'availability' ? '#C41230' : '#475569',
              borderBottom: tab === 'availability' ? '3px solid #C41230' : '3px solid transparent',
              background: 'none',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer'
            }}
          >
            <Power size={17} />
            Certificate Availability Management
          </button>

          <button
            onClick={() => setTab('dataset')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '1rem 1.25rem',
              fontSize: '0.9rem',
              fontWeight: 700,
              color: tab === 'dataset' ? '#C41230' : '#475569',
              borderBottom: tab === 'dataset' ? '3px solid #C41230' : '3px solid transparent',
              background: 'none',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer'
            }}
          >
            <Layers size={17} />
            Type A: Certificate Dataset ({certs.length})
          </button>

          <button
            onClick={() => setTab('registered')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '1rem 1.25rem',
              fontSize: '0.9rem',
              fontWeight: 700,
              color: tab === 'registered' ? '#C41230' : '#475569',
              borderBottom: tab === 'registered' ? '3px solid #C41230' : '3px solid transparent',
              background: 'none',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer'
            }}
          >
            <Users size={17} />
            Type B: Registered Users ({registeredUsers.length})
          </button>
        </div>
      </div>

      {/* ── MAIN CONTENT ──────────────────────────────────────── */}
      <main style={{ flex: 1, padding: '2rem 1.5rem', backgroundColor: '#F8FAFC' }}>
        <div style={{ maxWidth: '1360px', margin: '0 auto' }}>

          {/* ══════════════════════════════════════════════════════════
              SECTION 1: OVERVIEW & STATISTICS + GLOBAL PORTAL ON/OFF
             ══════════════════════════════════════════════════════════ */}
          {tab === 'stats' && (
            <div>
              {/* Global Portal Status Switch (Section 29 requirement) */}
              <div style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                padding: '1.5rem',
                marginBottom: '1.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Power size={20} color="#C41230" />
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                      Global Portal Status Control
                    </h3>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: '#64748B', margin: '4px 0 0' }}>
                    Switch the entire student portal availability between Active (ON) and Temporary Maintenance Closure (OFF).
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    backgroundColor: portalActive ? '#DCFCE7' : '#FEF2F2',
                    color: portalActive ? '#166534' : '#991B1B',
                    border: portalActive ? '1px solid #BBF7D0' : '1px solid #FCA5A5'
                  }}>
                    {portalActive ? '● ON — Portal Active' : '○ OFF — Temporarily Closed'}
                  </span>

                  <button
                    onClick={() => {
                      const next = !portalActive;
                      if (window.confirm(`Are you sure you want to turn the global portal ${next ? 'ON' : 'OFF'}?`)) {
                        togglePortalStatus(next);
                      }
                    }}
                    className={portalActive ? 'btn-secondary' : 'btn-primary'}
                    style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                  >
                    {portalActive ? 'Turn Portal OFF' : 'Turn Portal ON'}
                  </button>
                </div>
              </div>

              {/* Statistics Cards (Section 20 requirement) */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '1.25rem',
                marginBottom: '2rem'
              }}>
                <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '1.5rem', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748B' }}>TOTAL CERTIFICATE RECORDS</div>
                  <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#0F172A', marginTop: '0.25rem' }}>{totalCerts}</div>
                  <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '0.25rem' }}>Original 441 dataset records</div>
                </div>

                <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '1.5rem', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748B' }}>CERTIFICATES CLAIMED</div>
                  <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#166534', marginTop: '0.25rem' }}>{totalClaimed}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.25rem' }}>Downloaded with passcode</div>
                </div>

                <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '1.5rem', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748B' }}>CERTIFICATES UNCLAIMED</div>
                  <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#C41230', marginTop: '0.25rem' }}>{totalUnclaimed}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.25rem' }}>Pending student claim</div>
                </div>

                <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '1.5rem', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748B' }}>REGISTERED USERS</div>
                  <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#0F172A', marginTop: '0.25rem' }}>{totalRegisteredUsers}</div>
                  <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '0.25rem' }}>Accounts with Telegram handles</div>
                </div>

                <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '1.5rem', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748B' }}>STUDENTS WITH MULTIPLE CERTS</div>
                  <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#0F172A', marginTop: '0.25rem' }}>{multiCertStudentsCount}</div>
                  <div style={{ fontSize: '0.75rem', color: '#C41230', marginTop: '0.25rem' }}>1 student → many certificates</div>
                </div>
              </div>

              {/* Course Breakdown Table */}
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '1.5rem', border: '1px solid #E2E8F0' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', margin: '0 0 1rem' }}>
                  Course Completion Breakdown
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                  {AVAILABLE_COURSES.map(course => {
                    const count = certs.filter(c => c.course === course).length;
                    const claimedCount = certs.filter(c => c.course === course && c.claimed).length;
                    const isAvailable = programAvailability[course] !== false;
                    return (
                      <div key={course} style={{ padding: '1rem', borderRadius: '8px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '0.9rem', color: '#0F172A' }}>
                          <span>{course}</span>
                          <span style={{ color: '#C41230' }}>{count} certificates</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#64748B', marginTop: '8px' }}>
                          <span>Claimed: {claimedCount}</span>
                          <span style={{ fontWeight: 600, color: isAvailable ? '#166534' : '#854D0E' }}>
                            {isAvailable ? '✓ Available' : '○ Pending'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              SECTION 2: CERTIFICATE AVAILABILITY MANAGEMENT (Section 35)
             ══════════════════════════════════════════════════════════ */}
          {tab === 'availability' && (
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              padding: '1.5rem'
            }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  Certificate Availability Management
                </h2>
                <p style={{ fontSize: '0.85rem', color: '#64748B', margin: '4px 0 0' }}>
                  Control student access and certificate generation per course/field independently without affecting other programs.
                </p>
              </div>

              <div className="table-responsive">
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569' }}>
                      <th style={{ padding: '12px 16px', fontWeight: 700 }}>CERTIFICATE PROGRAM</th>
                      <th style={{ padding: '12px 16px', fontWeight: 700 }}>TOTAL RECORDS</th>
                      <th style={{ padding: '12px 16px', fontWeight: 700 }}>CLAIMED</th>
                      <th style={{ padding: '12px 16px', fontWeight: 700 }}>STATUS</th>
                      <th style={{ padding: '12px 16px', fontWeight: 700, textAlign: 'right' }}>PORTAL ACCESS CONTROL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {AVAILABLE_COURSES.map((course) => {
                      const totalInCourse = certs.filter(c => c.course === course).length;
                      const claimedInCourse = certs.filter(c => c.course === course && c.claimed).length;
                      const isAvailable = programAvailability[course] !== false;

                      return (
                        <tr key={course} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '14px 16px', fontWeight: 700, color: '#0F172A' }}>
                            {course}
                          </td>
                          <td style={{ padding: '14px 16px', color: '#475569' }}>
                            {totalInCourse}
                          </td>
                          <td style={{ padding: '14px 16px', color: '#166534', fontWeight: 600 }}>
                            {claimedInCourse}
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              backgroundColor: isAvailable ? '#DCFCE7' : '#FEF9C3',
                              color: isAvailable ? '#166534' : '#854D0E',
                              border: isAvailable ? '1px solid #BBF7D0' : '1px solid #FEF08A'
                            }}>
                              {isAvailable ? <CheckCircle2 size={13} /> : <Clock size={13} />}
                              {isAvailable ? 'Available' : 'Pending / Disabled'}
                            </span>
                          </td>
                          <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                            <button
                              onClick={() => toggleProgramStatus(course, !isAvailable)}
                              className={isAvailable ? 'btn-secondary' : 'btn-primary'}
                              style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                            >
                              {isAvailable ? 'Switch to OFF (Pending)' : 'Switch to ON (Available)'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              SECTION 3: TYPE A — CERTIFICATE DATASET (441 RECORDS)
             ══════════════════════════════════════════════════════════ */}
          {tab === 'dataset' && (
            <div>
              {/* Controls */}
              <div style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                padding: '1.5rem',
                marginBottom: '1.5rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                      Type A: Certificate Dataset (441 Records)
                    </h2>
                    <p style={{ fontSize: '0.85rem', color: '#64748B', margin: '4px 0 0' }}>
                      Master repository of certificate records. One student may possess multiple certificates.
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => setCreateCertOpen(true)}
                      className="btn-primary"
                      style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                    >
                      <Plus size={15} /> Add Certificate Record
                    </button>

                    <button
                      onClick={handleBatchSync}
                      disabled={syncing}
                      className="btn-secondary"
                      style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                    >
                      <CloudUpload size={15} />
                      {syncing ? 'Syncing…' : 'Sync 441 to Firestore'}
                    </button>
                  </div>
                </div>

                {syncMsg && (
                  <div style={{ padding: '8px 12px', backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', color: '#166534', borderRadius: '6px', fontSize: '0.82rem', marginBottom: '1rem' }}>
                    {syncMsg}
                  </div>
                )}

                {/* Filters & View Toggle */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', flex: '1 1 300px' }}>
                    <div style={{ position: 'relative', flex: '1 1 240px', display: 'flex', alignItems: 'center' }}>
                      <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: '12px' }} />
                      <input
                        type="text"
                        value={datasetSearch}
                        onChange={(e) => setDatasetSearch(e.target.value)}
                        placeholder="Search student name, passcode, or ID…"
                        style={{
                          width: '100%',
                          padding: '8px 12px 8px 36px',
                          fontSize: '0.88rem',
                          borderRadius: '8px',
                          border: '1px solid #CBD5E1',
                          outline: 'none'
                        }}
                      />
                    </div>

                    <select
                      value={datasetCourseFilter}
                      onChange={(e) => setDatasetCourseFilter(e.target.value)}
                      style={{
                        padding: '8px 12px',
                        fontSize: '0.88rem',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        outline: 'none',
                        backgroundColor: '#FFFFFF'
                      }}
                    >
                      <option value="ALL">All Programs ({certs.length})</option>
                      {AVAILABLE_COURSES.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'flex', gap: '4px', backgroundColor: '#F1F5F9', padding: '3px', borderRadius: '8px' }}>
                    <button
                      onClick={() => setDatasetViewMode('grouped')}
                      style={{
                        padding: '6px 12px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        backgroundColor: datasetViewMode === 'grouped' ? '#FFFFFF' : 'transparent',
                        color: datasetViewMode === 'grouped' ? '#C41230' : '#64748B'
                      }}
                    >
                      Grouped by Student (1-to-Many)
                    </button>
                    <button
                      onClick={() => setDatasetViewMode('list')}
                      style={{
                        padding: '6px 12px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        backgroundColor: datasetViewMode === 'list' ? '#FFFFFF' : 'transparent',
                        color: datasetViewMode === 'list' ? '#C41230' : '#64748B'
                      }}
                    >
                      Individual Record List
                    </button>
                  </div>
                </div>
              </div>

              {/* VIEW 1: GROUPED BY STUDENT (1-to-Many Relationship) */}
              {datasetViewMode === 'grouped' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {filteredGroups.slice(0, 80).map((group) => (
                    <div
                      key={group.studentName}
                      style={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: '12px',
                        border: '1px solid #E2E8F0',
                        padding: '1.25rem 1.5rem',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                              {group.studentName}
                            </h3>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              backgroundColor: group.totalCertificates > 1 ? '#FEF2F2' : '#F1F5F9',
                              color: group.totalCertificates > 1 ? '#C41230' : '#475569',
                              border: group.totalCertificates > 1 ? '1px solid #FCA5A5' : '1px solid #E2E8F0'
                            }}>
                              {group.totalCertificates} {group.totalCertificates === 1 ? 'Certificate' : 'Certificates'}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setEditStudentGroup(group);
                            setNewStudentNameInput(group.studentName);
                          }}
                          className="btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                        >
                          <Edit3 size={13} /> Edit Student Name (Syncs Across Certs)
                        </button>
                      </div>

                      {/* Certificates Table for this student */}
                      <div className="table-responsive">
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
                          <thead>
                            <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B' }}>
                              <th style={{ padding: '8px 12px', fontWeight: 700 }}>PROGRAM / COURSE</th>
                              <th style={{ padding: '8px 12px', fontWeight: 700 }}>CERTIFICATE ID</th>
                              <th style={{ padding: '8px 12px', fontWeight: 700 }}>PASSCODE</th>
                              <th style={{ padding: '8px 12px', fontWeight: 700 }}>STATUS</th>
                              <th style={{ padding: '8px 12px', fontWeight: 700, textAlign: 'right' }}>ACTIONS</th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.certificates.map(cert => {
                              const isRevealed = !!revealedPasscodes[cert.id];
                              return (
                                <tr key={cert.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                  <td style={{ padding: '10px 12px', fontWeight: 700, color: '#C41230' }}>
                                    {cert.course}
                                  </td>
                                  <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: '#475569' }}>
                                    {cert.id}
                                  </td>
                                  <td style={{ padding: '10px 12px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <span style={{ fontFamily: 'monospace', fontWeight: 700, backgroundColor: '#F1F5F9', padding: '2px 6px', borderRadius: '4px' }}>
                                        {isRevealed ? cert.passcode : '••••••••'}
                                      </span>
                                      <button
                                        onClick={() => setRevealedPasscodes(p => ({ ...p, [cert.id]: !p[cert.id] }))}
                                        style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}
                                      >
                                        {isRevealed ? <EyeOff size={13} /> : <Eye size={13} />}
                                      </button>
                                      <button
                                        onClick={() => copyToClipboard(cert.passcode, cert.id)}
                                        style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}
                                      >
                                        {copiedId === cert.id ? <Check size={13} color="#166534" /> : <Copy size={13} />}
                                      </button>
                                    </div>
                                  </td>
                                  <td style={{ padding: '10px 12px' }}>
                                    {cert.claimed ? (
                                      <span style={{ color: '#166534', fontWeight: 700, fontSize: '0.75rem' }}>✓ Claimed</span>
                                    ) : (
                                      <span style={{ color: '#854D0E', fontWeight: 600, fontSize: '0.75rem' }}>Unclaimed</span>
                                    )}
                                  </td>
                                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                                    <div style={{ display: 'inline-flex', gap: '4px' }}>
                                      <button
                                        onClick={() => {
                                          setEditCertModal(cert);
                                          setEditCertCourse(cert.course);
                                        }}
                                        title="Edit Certificate Course"
                                        style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #CBD5E1', background: '#FFFFFF', cursor: 'pointer' }}
                                      >
                                        <Edit3 size={12} />
                                      </button>
                                      <button
                                        onClick={() => downloadCertificatePdf(cert, window.location.origin, false)}
                                        title="Admin Download PDF"
                                        style={{ padding: '4px 8px', borderRadius: '4px', border: 'none', background: '#0F172A', color: '#FFFFFF', cursor: 'pointer' }}
                                      >
                                        <Download size={12} />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteCert(cert.id, cert.name)}
                                        title="Delete Certificate"
                                        style={{ padding: '4px 8px', borderRadius: '4px', border: 'none', background: '#FEF2F2', color: '#991B1B', cursor: 'pointer' }}
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* VIEW 2: INDIVIDUAL RECORD LIST */}
              {datasetViewMode === 'list' && (
                <div style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  overflow: 'hidden'
                }}>
                  <div className="table-responsive">
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569' }}>
                          <th style={{ padding: '12px 16px', fontWeight: 700 }}>STUDENT NAME</th>
                          <th style={{ padding: '12px 16px', fontWeight: 700 }}>COURSE</th>
                          <th style={{ padding: '12px 16px', fontWeight: 700 }}>CERTIFICATE ID</th>
                          <th style={{ padding: '12px 16px', fontWeight: 700 }}>PASSCODE</th>
                          <th style={{ padding: '12px 16px', fontWeight: 700 }}>STATUS</th>
                          <th style={{ padding: '12px 16px', fontWeight: 700, textAlign: 'right' }}>ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredCertsList.slice(0, 100).map(cert => {
                          const isRevealed = !!revealedPasscodes[cert.id];
                          return (
                            <tr key={cert.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                              <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0F172A' }}>
                                {cert.name}
                              </td>
                              <td style={{ padding: '12px 16px', fontWeight: 600, color: '#C41230' }}>
                                {cert.course}
                              </td>
                              <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#475569', fontSize: '0.8rem' }}>
                                {cert.id}
                              </td>
                              <td style={{ padding: '12px 16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <span style={{ fontFamily: 'monospace', fontWeight: 700, backgroundColor: '#F1F5F9', padding: '2px 6px', borderRadius: '4px' }}>
                                    {isRevealed ? cert.passcode : '••••••••'}
                                  </span>
                                  <button
                                    onClick={() => setRevealedPasscodes(p => ({ ...p, [cert.id]: !p[cert.id] }))}
                                    style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}
                                  >
                                    {isRevealed ? <EyeOff size={13} /> : <Eye size={13} />}
                                  </button>
                                </div>
                              </td>
                              <td style={{ padding: '12px 16px' }}>
                                {cert.claimed ? (
                                  <span style={{ color: '#166534', fontWeight: 700, fontSize: '0.75rem' }}>✓ Claimed</span>
                                ) : (
                                  <span style={{ color: '#854D0E', fontWeight: 600, fontSize: '0.75rem' }}>Unclaimed</span>
                                )}
                              </td>
                              <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                <div style={{ display: 'inline-flex', gap: '4px' }}>
                                  <button
                                    onClick={() => downloadCertificatePdf(cert, window.location.origin, false)}
                                    title="Download PDF"
                                    style={{ padding: '4px 8px', borderRadius: '4px', border: 'none', background: '#0F172A', color: '#FFFFFF', cursor: 'pointer' }}
                                  >
                                    <Download size={12} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteCert(cert.id, cert.name)}
                                    title="Delete"
                                    style={{ padding: '4px 8px', borderRadius: '4px', border: 'none', background: '#FEF2F2', color: '#991B1B', cursor: 'pointer' }}
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              SECTION 4: TYPE B — REGISTERED USERS MANAGEMENT
             ══════════════════════════════════════════════════════════ */}
          {tab === 'registered' && (
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              padding: '1.5rem'
            }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                    Type B: Registered Users Management
                  </h2>
                  <p style={{ fontSize: '0.85rem', color: '#64748B', margin: '4px 0 0' }}>
                    Accounts registered in the portal with their required Telegram usernames and associated certificates.
                  </p>
                </div>
                  <button
                    onClick={() => { setCreateAdminOpen(true); setCreateAdminError(''); }}
                    className="btn-primary"
                    style={{ padding: '8px 16px', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                  >
                    <Shield size={15} /> Create Admin Account
                  </button>
                </div>
              </div>

              {/* User Filters */}
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                <div style={{ position: 'relative', flex: '1 1 240px', display: 'flex', alignItems: 'center' }}>
                  <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: '12px' }} />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search name, email, or telegram…"
                    style={{
                      width: '100%',
                      padding: '8px 12px 8px 36px',
                      fontSize: '0.88rem',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      outline: 'none'
                    }}
                  />
                </div>

                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value as any)}
                  style={{
                    padding: '8px 12px',
                    fontSize: '0.88rem',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    outline: 'none',
                    backgroundColor: '#FFFFFF'
                  }}
                >
                  <option value="ALL">All Roles</option>
                  <option value="student">Students</option>
                  <option value="admin">Administrators</option>
                </select>
              </div>

              {/* Table */}
              <div className="table-responsive">
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569' }}>
                      <th style={{ padding: '12px 16px', fontWeight: 700 }}>STUDENT NAME</th>
                      <th style={{ padding: '12px 16px', fontWeight: 700 }}>EMAIL ADDRESS</th>
                      <th style={{ padding: '12px 16px', fontWeight: 700 }}>TELEGRAM</th>
                      <th style={{ padding: '12px 16px', fontWeight: 700 }}>ROLE</th>
                      <th style={{ padding: '12px 16px', fontWeight: 700 }}>ASSOCIATED CERTIFICATES</th>
                      <th style={{ padding: '12px 16px', fontWeight: 700, textAlign: 'right' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user.uid} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0F172A' }}>
                          {user.displayName}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#475569' }}>
                          {user.email}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#0F172A', fontWeight: 600 }}>
                          {user.telegramUsername || '—'}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            backgroundColor: user.role === 'admin' ? '#0F172A' : '#F1F5F9',
                            color: user.role === 'admin' ? '#FFFFFF' : '#475569'
                          }}>
                            {user.role.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {(user.associatedCertificateIds && user.associatedCertificateIds.length > 0) ? (
                              user.associatedCertificateIds.map(certId => {
                                const matchedCert = certs.find(c => c.id === certId);
                                return (
                                  <div key={certId} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem' }}>
                                    <span style={{ fontWeight: 600, color: '#C41230' }}>
                                      {matchedCert?.course || 'Certificate'}
                                    </span>
                                    <span style={{ fontFamily: 'monospace', color: '#64748B' }}>
                                      ({certId.slice(0, 8)}…)
                                    </span>
                                    <button
                                      onClick={() => handleRemoveCertFromUser(user.uid, certId)}
                                      title="Remove Link"
                                      style={{ background: 'none', border: 'none', color: '#991B1B', cursor: 'pointer', fontSize: '0.75rem' }}
                                    >
                                      ✕
                                    </button>
                                  </div>
                                );
                              })
                            ) : (
                              <span style={{ fontSize: '0.78rem', color: '#94A3B8' }}>No explicit links</span>
                            )}
                            <button
                              onClick={() => {
                                setLinkUserModal(user);
                                setSelectedCertIdToLink('');
                              }}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                fontSize: '0.75rem',
                                color: '#C41230',
                                background: 'none',
                                border: '1px dashed #FCA5A5',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                width: 'fit-content',
                                marginTop: '2px'
                              }}
                            >
                              <LinkIcon size={11} /> Link Certificate
                            </button>
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <button
                            onClick={() => toggleRegisteredUserRole(user.uid, user.role === 'admin' ? 'student' : 'admin').then(loadAdminData)}
                            className="btn-secondary"
                            style={{ padding: '5px 10px', fontSize: '0.78rem' }}
                          >
                            {user.role === 'admin' ? 'Demote' : 'Make Admin'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* ── MODAL 1: EDIT STUDENT NAME (SYNC TO ALL ASSOCIATED CERTS) ── */}
      {editStudentGroup && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '14px',
            width: '100%',
            maxWidth: '480px',
            overflow: 'hidden',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            border: '1px solid #E2E8F0'
          }}>
            <div style={{
              backgroundColor: '#0F172A',
              color: '#FFFFFF',
              padding: '1.25rem 1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>Edit Student Name in Dataset</div>
              <button onClick={() => setEditStudentGroup(null)} style={{ background: 'none', border: 'none', color: '#FFFFFF', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <p style={{ fontSize: '0.85rem', color: '#64748B', lineHeight: 1.5, margin: '0 0 1rem' }}>
                Updating this name will automatically synchronize across <strong>{editStudentGroup.totalCertificates} certificate record(s)</strong> for this student.
              </p>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  NEW STUDENT FULL NAME
                </label>
                <input
                  type="text"
                  value={newStudentNameInput}
                  onChange={(e) => setNewStudentNameInput(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '0.92rem',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    outline: 'none',
                    color: '#0F172A'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button onClick={() => setEditStudentGroup(null)} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.88rem' }}>
                  Cancel
                </button>
                <button
                  onClick={handleSaveStudentNameEdit}
                  disabled={editingStudentSaving || !newStudentNameInput.trim()}
                  className="btn-primary"
                  style={{ padding: '8px 20px', fontSize: '0.88rem' }}
                >
                  {editingStudentSaving ? 'Saving…' : 'Save & Synchronize'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: EDIT CERTIFICATE COURSE ──────────────────── */}
      {editCertModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '14px',
            width: '100%',
            maxWidth: '460px',
            overflow: 'hidden',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            border: '1px solid #E2E8F0'
          }}>
            <div style={{
              backgroundColor: '#0F172A',
              color: '#FFFFFF',
              padding: '1.25rem 1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>Edit Certificate Information</div>
              <button onClick={() => setEditCertModal(null)} style={{ background: 'none', border: 'none', color: '#FFFFFF', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.78rem', color: '#64748B' }}>STUDENT</div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>{editCertModal.name}</div>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  PROGRAM / COURSE
                </label>
                <select
                  value={editCertCourse}
                  onChange={(e) => setEditCertCourse(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.9rem',
                    backgroundColor: '#FFFFFF'
                  }}
                >
                  {AVAILABLE_COURSES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button onClick={() => setEditCertModal(null)} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.88rem' }}>
                  Cancel
                </button>
                <button
                  onClick={handleSaveCertEdit}
                  disabled={editCertSaving}
                  className="btn-primary"
                  style={{ padding: '8px 20px', fontSize: '0.88rem' }}
                >
                  {editCertSaving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 3: CREATE NEW CERTIFICATE ───────────────────── */}
      {createCertOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '14px',
            width: '100%',
            maxWidth: '480px',
            overflow: 'hidden',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            border: '1px solid #E2E8F0'
          }}>
            <div style={{
              backgroundColor: '#0F172A',
              color: '#FFFFFF',
              padding: '1.25rem 1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>Add Certificate Record</div>
              <button onClick={() => setCreateCertOpen(false)} style={{ background: 'none', border: 'none', color: '#FFFFFF', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>
            <form onSubmit={handleCreateNewCert} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  STUDENT FULL NAME
                </label>
                <input
                  type="text"
                  required
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="Enter student name"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  PROGRAM / COURSE
                </label>
                <select
                  value={createCourse}
                  onChange={(e) => setCreateCourse(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem', backgroundColor: '#FFFFFF' }}
                >
                  {AVAILABLE_COURSES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  STUDENT EMAIL (OPTIONAL)
                </label>
                <input
                  type="email"
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  placeholder="student@example.com"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setCreateCertOpen(false)} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.88rem' }}>
                  Cancel
                </button>
                <button type="submit" disabled={creatingCert} className="btn-primary" style={{ padding: '8px 20px', fontSize: '0.88rem' }}>
                  {creatingCert ? 'Saving…' : 'Save Certificate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 4: LINK CERTIFICATE TO USER ─────────────────── */}
      {linkUserModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '14px',
            width: '100%',
            maxWidth: '520px',
            overflow: 'hidden',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            border: '1px solid #E2E8F0'
          }}>
            <div style={{
              backgroundColor: '#0F172A',
              color: '#FFFFFF',
              padding: '1.25rem 1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>
                Link Certificate to {linkUserModal.displayName}
              </div>
              <button onClick={() => setLinkUserModal(null)} style={{ background: 'none', border: 'none', color: '#FFFFFF', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <p style={{ fontSize: '0.85rem', color: '#64748B', lineHeight: 1.5, margin: '0 0 1rem' }}>
                Select a certificate record to associate with this registered student account:
              </p>

              <select
                value={selectedCertIdToLink}
                onChange={(e) => setSelectedCertIdToLink(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.9rem',
                  marginBottom: '1.5rem',
                  backgroundColor: '#FFFFFF'
                }}
              >
                <option value="">-- Choose a Certificate Record --</option>
                {certs.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {c.course} ({c.passcode})
                  </option>
                ))}
              </select>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button onClick={() => setLinkUserModal(null)} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.88rem' }}>
                  Cancel
                </button>
                <button
                  onClick={handleLinkCertToUser}
                  disabled={!selectedCertIdToLink}
                  className="btn-primary"
                  style={{ padding: '8px 20px', fontSize: '0.88rem' }}
                >
                  Link Certificate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ── MODAL 5: CREATE ADMIN ACCOUNT ─────────────────────── */}
      {createAdminOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '14px',
            width: '100%',
            maxWidth: '480px',
            overflow: 'hidden',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            border: '1px solid #E2E8F0'
          }}>
            <div style={{
              backgroundColor: '#0F172A',
              color: '#FFFFFF',
              padding: '1.25rem 1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '3px solid #C41230'
            }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>Create Admin Account</div>
                <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '2px' }}>
                  New account will have Administrator role immediately
                </div>
              </div>
              <button
                onClick={() => setCreateAdminOpen(false)}
                style={{ background: 'none', border: 'none', color: '#FFFFFF', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAdminAccount} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {createAdminError && (
                <div style={{
                  padding: '10px 14px',
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FCA5A5',
                  color: '#991B1B',
                  borderRadius: '8px',
                  fontSize: '0.85rem'
                }}>
                  {createAdminError}
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  FULL NAME
                </label>
                <input
                  type="text"
                  required
                  value={newAdminName}
                  onChange={(e) => setNewAdminName(e.target.value)}
                  placeholder="Enter admin full name"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  EMAIL ADDRESS
                </label>
                <input
                  type="email"
                  required
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  placeholder="admin@ymca.org"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  PASSWORD (min. 6 characters)
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                  placeholder="Set a secure password"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  TELEGRAM USERNAME (optional)
                </label>
                <input
                  type="text"
                  value={newAdminTelegram}
                  onChange={(e) => setNewAdminTelegram(e.target.value)}
                  placeholder="@admin_username"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.25rem' }}>
                <button
                  type="button"
                  onClick={() => setCreateAdminOpen(false)}
                  className="btn-secondary"
                  style={{ padding: '9px 18px', fontSize: '0.88rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingAdmin}
                  className="btn-primary"
                  style={{ padding: '9px 22px', fontSize: '0.88rem' }}
                >
                  {creatingAdmin ? 'Creating…' : 'Create Admin Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
