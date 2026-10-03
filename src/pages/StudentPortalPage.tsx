import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Award,
  Lock,
  Mail,
  User as UserIcon,
  Eye,
  EyeOff,
  Download,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  LogOut,
  Send,
  Clock,
  KeyRound,
  FileCheck2,
  XCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { CertificateRecord } from '../data/certifiedParticipants';
import { getCertificatesForStudent } from '../firebase/service';
import { downloadCertificatePdf, viewCertificatePdf } from '../utils/pdfGenerator';

export const StudentPortalPage: React.FC = () => {
  const {
    currentUser,
    isAdmin,
    portalActive,
    programAvailability,
    signIn,
    signUp,
    logOut
  } = useAuth();
  const navigate = useNavigate();

  // If authenticated as admin, redirect to /admin
  useEffect(() => {
    if (isAdmin) {
      navigate('/admin');
    }
  }, [isAdmin, navigate]);

  // Auth form state
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [telegramUsername, setTelegramUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [loading, setLoading] = useState(false);

  // Student certificates (1-to-many list)
  const [studentCerts, setStudentCerts] = useState<CertificateRecord[]>([]);
  const [certsLoading, setCertsLoading] = useState(false);

  // Per-certificate passcode visibility state (show/hide toggle)
  const [revealedPasscodes, setRevealedPasscodes] = useState<Record<string, boolean>>({});

  // Download state tracking (per cert)
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Load all certificates for authenticated student
  useEffect(() => {
    async function loadStudentCertificates() {
      if (!currentUser) {
        setStudentCerts([]);
        return;
      }
      setCertsLoading(true);
      try {
        const certs = await getCertificatesForStudent(
          currentUser.displayName,
          currentUser.associatedCertificateIds
        );
        setStudentCerts(certs);
      } catch (e) {
        console.error('Error loading student certificates:', e);
      } finally {
        setCertsLoading(false);
      }
    }
    loadStudentCertificates();
  }, [currentUser]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setLoading(true);

    try {
      if (isRegistering) {
        if (!displayName.trim()) {
          setAuthError('Please enter your full name.');
          setLoading(false);
          return;
        }
        if (!telegramUsername.trim()) {
          setAuthError('Telegram username is required.');
          setLoading(false);
          return;
        }
        const res = await signUp(email, password, displayName, telegramUsername);
        if (!res.success) {
          setAuthError(res.error || 'Registration failed.');
        }
      } else {
        const res = await signIn(email, password);
        if (!res.success) {
          setAuthError(res.error || 'Invalid credentials.');
        }
      }
    } catch (err) {
      setAuthError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * SCENARIO A — Authenticated student downloads their OWN certificate.
   * No passcode prompt. Direct download.
   */
  const handleDirectDownload = async (cert: CertificateRecord) => {
    setDownloadingId(cert.id);
    try {
      await downloadCertificatePdf(cert, undefined, true);
    } catch (e) {
      console.error('Download failed:', e);
      alert('Failed to generate the certificate PDF. Please try again.');
    } finally {
      setDownloadingId(null);
    }
  };

  const togglePasscodeReveal = (certId: string) => {
    setRevealedPasscodes((prev) => ({ ...prev, [certId]: !prev[certId] }));
  };

  // ─────────────────────────────────────────────────────────
  // 1. GLOBAL PORTAL OFF MAINTENANCE SCREEN
  // ─────────────────────────────────────────────────────────
  if (!portalActive && !isAdmin) {
    return (
      <div style={{
        minHeight: 'calc(100vh - 140px)',
        backgroundColor: '#FFFFFF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 1.25rem'
      }}>
        <div style={{
          maxWidth: '560px',
          width: '100%',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '16px',
          padding: '3rem 2rem',
          textAlign: 'center',
          boxShadow: '0 4px 12px rgba(15, 23, 42, 0.05)'
        }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            backgroundColor: '#FEF2F2',
            color: '#C41230',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem'
          }}>
            <Clock size={32} />
          </div>

          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.75rem' }}>
            The Certification Portal Is Currently Unavailable
          </h1>

          <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '2rem' }}>
            The YMCA Summer 2026 Certification Portal is temporarily unavailable. Please check back later.
          </p>

          <div style={{ padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '0.82rem', color: '#64748B' }}>
            National Council of YMCAs of Ethiopia • System Maintenance
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────
  // 2. UNAUTHENTICATED: SIGN IN / REGISTRATION FORM
  // ─────────────────────────────────────────────────────────
  if (!currentUser) {
    return (
      <div style={{
        minHeight: 'calc(100vh - 140px)',
        backgroundColor: '#F8FAFC',
        padding: '3.5rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          width: '100%',
          maxWidth: '460px',
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 4px 20px rgba(15, 23, 42, 0.06)',
          overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{
            backgroundColor: '#0F172A',
            padding: '2rem 1.5rem',
            textAlign: 'center',
            color: '#FFFFFF',
            borderBottom: '3px solid #C41230'
          }}>
            <div style={{ display: 'inline-flex', backgroundColor: '#FFFFFF', borderRadius: '8px', padding: '4px 10px', marginBottom: '0.75rem' }}>
              <img
                src="/logo.png"
                alt="YMCA"
                style={{ height: '34px', width: 'auto' }}
              />
            </div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.02em' }}>
              Student Certificate Portal
            </h2>
            <p style={{ fontSize: '0.82rem', color: '#94A3B8', margin: 0 }}>
              {isRegistering ? 'Register your account to access your certificates' : 'Sign in to access, claim, and download your certificates'}
            </p>
          </div>

          {/* Form Content */}
          <div style={{ padding: '2rem 1.5rem' }}>
            {authError && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FCA5A5',
                color: '#991B1B',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                marginBottom: '1.25rem'
              }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              {isRegistering && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    FULL NAME
                  </label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <UserIcon size={17} color="#94A3B8" style={{ position: 'absolute', left: '12px' }} />
                    <input
                      type="text"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Enter your full name"
                      style={{
                        width: '100%',
                        padding: '10px 12px 10px 38px',
                        fontSize: '0.9rem',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        outline: 'none',
                        color: '#0F172A'
                      }}
                    />
                  </div>
                </div>
              )}

              {isRegistering && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    TELEGRAM USERNAME (REQUIRED)
                  </label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Send size={16} color="#94A3B8" style={{ position: 'absolute', left: '12px' }} />
                    <input
                      type="text"
                      required
                      value={telegramUsername}
                      onChange={(e) => setTelegramUsername(e.target.value)}
                      placeholder="@username"
                      style={{
                        width: '100%',
                        padding: '10px 12px 10px 38px',
                        fontSize: '0.9rem',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        outline: 'none',
                        color: '#0F172A'
                      }}
                    />
                  </div>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  EMAIL ADDRESS
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Mail size={17} color="#94A3B8" style={{ position: 'absolute', left: '12px' }} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 38px',
                      fontSize: '0.9rem',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      outline: 'none',
                      color: '#0F172A'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  PASSWORD
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Lock size={17} color="#94A3B8" style={{ position: 'absolute', left: '12px' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    style={{
                      width: '100%',
                      padding: '10px 38px 10px 38px',
                      fontSize: '0.9rem',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      outline: 'none',
                      color: '#0F172A'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#94A3B8'
                    }}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
                style={{ width: '100%', marginTop: '0.5rem', padding: '12px' }}
              >
                {loading ? 'Please wait…' : (isRegistering ? 'Register Account' : 'Sign In')}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid #E2E8F0' }}>
              <button
                type="button"
                onClick={() => { setIsRegistering(!isRegistering); setAuthError(''); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#C41230',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {isRegistering ? 'Already have an account? Sign In' : 'New student? Register an account'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────
  // 3. AUTHENTICATED STUDENT DASHBOARD (1 STUDENT → MANY CERTS)
  // ─────────────────────────────────────────────────────────
  return (
    <div style={{ backgroundColor: '#FFFFFF', minHeight: 'calc(100vh - 140px)', padding: '2.5rem 1.25rem' }}>
      <div style={{ maxWidth: '1080px', margin: '0 auto' }}>
        {/* Welcome Banner */}
        <div style={{
          backgroundColor: '#F8FAFC',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          padding: '1.5rem',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#C41230', letterSpacing: '0.04em' }}>
              YMCA SUMMER 2026 STUDENT DASHBOARD
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginTop: '2px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                {currentUser.displayName}
              </h1>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 8px',
                fontSize: '0.72rem',
                fontWeight: 700,
                borderRadius: '4px',
                backgroundColor: '#F1F5F9',
                color: '#475569',
                border: '1px solid #E2E8F0'
              }}>
                <FileCheck2 size={12} color="#059669" /> Official Certified Record
              </span>
            </div>
            <div style={{ fontSize: '0.82rem', color: '#64748B', display: 'flex', gap: '1rem', marginTop: '4px' }}>
              <span>Email: {currentUser.email}</span>
              {currentUser.telegramUsername && <span>Telegram: {currentUser.telegramUsername}</span>}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '0.82rem',
              fontWeight: 700,
              backgroundColor: '#FEF2F2',
              color: '#C41230',
              border: '1px solid #FCA5A5'
            }}>
              {studentCerts.length} {studentCerts.length === 1 ? 'Certificate' : 'Certificates'} Associated
            </div>

            <button
              onClick={() => logOut()}
              className="btn-secondary"
              style={{ padding: '7px 14px', fontSize: '0.82rem' }}
            >
              <LogOut size={14} /> Sign Out
            </button>
          </div>
        </div>

        {/* Certificates List (1-to-many relationship) */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              My Certificates
            </h2>
          </div>

          {certsLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#64748B' }}>
              Loading your certificates…
            </div>
          ) : studentCerts.length === 0 ? (
            <div style={{
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '3rem 1.5rem',
              textAlign: 'center'
            }}>
              <Award size={40} color="#94A3B8" style={{ margin: '0 auto 1rem' }} />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.35rem' }}>
                No Certificates Found
              </h3>
              <p style={{ color: '#64748B', maxWidth: '480px', margin: '0 auto', fontSize: '0.88rem', lineHeight: 1.5 }}>
                Your account is active. If you have completed a course under a different registered name, an administrator will link your certificate records to your account.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {studentCerts.map((cert) => {
                const isProgramAvailable = programAvailability[cert.course] !== false;
                const statusLabel = isProgramAvailable ? 'Available' : 'Pending';
                const isPasscodeRevealed = revealedPasscodes[cert.id] || false;
                const isDownloadingThis = downloadingId === cert.id;

                return (
                  <div
                    key={cert.id}
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '12px',
                      border: '1px solid #E2E8F0',
                      padding: '1.5rem',
                      boxShadow: '0 2px 6px rgba(15, 23, 42, 0.04)'
                    }}
                  >
                    {/* Top row: course name + badges */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem' }}>
                      <div style={{ flex: '1 1 280px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A' }}>
                            {cert.course}
                          </span>

                          {/* Status Badge */}
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            backgroundColor: isProgramAvailable ? '#DCFCE7' : '#FEF9C3',
                            color: isProgramAvailable ? '#166534' : '#854D0E',
                            border: isProgramAvailable ? '1px solid #BBF7D0' : '1px solid #FEF08A'
                          }}>
                            {isProgramAvailable ? <CheckCircle2 size={13} /> : <Clock size={13} />}
                            {statusLabel}
                          </span>

                          {cert.claimed && (
                            <span style={{
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              backgroundColor: '#F1F5F9',
                              color: '#475569'
                            }}>
                              Claimed
                            </span>
                          )}
                        </div>

                        {/* Visible Certificate ID */}
                        <div style={{ fontSize: '0.8rem', color: '#64748B', fontFamily: 'monospace', marginBottom: '0.35rem' }}>
                          Certificate ID: <strong style={{ color: '#C41230' }}>{cert.id}</strong>
                        </div>

                        <div style={{ fontSize: '0.82rem', color: '#64748B' }}>
                          {cert.programme} • {cert.duration} • Issued: {cert.issueDate}
                        </div>

                        {/* Pending Message */}
                        {!isProgramAvailable && (
                          <div style={{
                            marginTop: '0.75rem',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            backgroundColor: '#FEF9C3',
                            border: '1px solid #FEF08A',
                            color: '#854D0E',
                            fontSize: '0.8rem',
                            lineHeight: 1.4
                          }}>
                            Your <strong>{cert.course}</strong> certificate is currently pending and will become available once processing is completed.
                          </div>
                        )}
                      </div>

                      {/* Actions column */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                        {isProgramAvailable ? (
                          <>
                            {/*
                             * SCENARIO A: Authenticated student — DIRECT DOWNLOAD.
                             * No passcode prompt. Student is already verified by login.
                             */}
                            <button
                              onClick={() => handleDirectDownload(cert)}
                              disabled={isDownloadingThis}
                              className="btn-primary"
                              style={{ padding: '9px 18px', fontSize: '0.88rem' }}
                            >
                              <Download size={16} />
                              {isDownloadingThis ? 'Generating…' : 'Download Certificate'}
                            </button>

                            <button
                              onClick={() => viewCertificatePdf(cert)}
                              className="btn-secondary"
                              style={{ padding: '9px 14px', fontSize: '0.88rem' }}
                            >
                              <ExternalLink size={15} /> Preview
                            </button>

                            <Link
                              to={`/verify/${cert.id}`}
                              className="btn-secondary"
                              style={{ padding: '9px 14px', fontSize: '0.88rem' }}
                            >
                              Verification
                            </Link>
                          </>
                        ) : (
                          <div style={{ fontSize: '0.85rem', color: '#854D0E', fontWeight: 600 }}>
                            Download Unavailable (Pending)
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Passcode Row — always visible with show/hide toggle */}
                    {isProgramAvailable && (
                      <div style={{
                        marginTop: '0.75rem',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        backgroundColor: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        flexWrap: 'wrap'
                      }}>
                        <KeyRound size={15} color="#64748B" style={{ flexShrink: 0 }} />
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748B', letterSpacing: '0.04em' }}>
                          CERTIFICATE PASSCODE:
                        </span>
                        <span style={{
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          fontSize: '0.92rem',
                          color: '#0F172A',
                          letterSpacing: isPasscodeRevealed ? '0.08em' : '0.2em'
                        }}>
                          {isPasscodeRevealed ? cert.passcode : '•'.repeat(Math.min(cert.passcode.length, 12))}
                        </span>
                        <button
                          type="button"
                          onClick={() => togglePasscodeReveal(cert.id)}
                          title={isPasscodeRevealed ? 'Hide passcode' : 'Show passcode'}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: 'none',
                            border: '1px solid #CBD5E1',
                            borderRadius: '5px',
                            padding: '4px 10px',
                            cursor: 'pointer',
                            color: '#64748B',
                            fontSize: '0.78rem',
                            fontWeight: 600
                          }}
                        >
                          {isPasscodeRevealed ? <EyeOff size={14} /> : <Eye size={14} />}
                          {isPasscodeRevealed ? 'Hide' : 'Reveal'}
                        </button>
                        <span style={{ fontSize: '0.75rem', color: '#94A3B8', marginLeft: 'auto' }}>
                          Keep this private — required for third-party verification downloads
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
