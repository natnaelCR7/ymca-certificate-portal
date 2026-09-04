import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ShieldCheck,
  Search,
  Download,
  ExternalLink,
  CheckCircle2,
  Calendar,
  Award,
  KeyRound,
  XCircle,
  QrCode
} from 'lucide-react';
import { CertificateRecord } from '../data/certifiedParticipants';
import { getCertificateById } from '../firebase/service';
import { downloadCertificatePdf, viewCertificatePdf } from '../utils/pdfGenerator';

export const VerificationPage: React.FC = () => {
  const { id: paramId } = useParams<{ id?: string }>();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState(paramId || '');
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [cert, setCert] = useState<CertificateRecord | null>(null);

  // Passcode modal state
  const [passcodeModalOpen, setPasscodeModalOpen] = useState(false);
  const [enteredPasscode, setEnteredPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState('');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (paramId) {
      handleLookup(paramId);
    }
  }, [paramId]);

  const handleLookup = async (idToLook: string) => {
    const trimmed = idToLook.trim();
    if (!trimmed) return;

    setLoading(true);
    setSearched(true);

    try {
      const found = await getCertificateById(trimmed);
      setCert(found);
    } catch (err) {
      console.error('Error fetching certificate:', err);
      setCert(null);
    } finally {
      setLoading(false);
    }
  };

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/verify/${encodeURIComponent(searchQuery.trim())}`);
      handleLookup(searchQuery.trim());
    }
  };

  const handlePasscodeDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cert) return;

    const cleanEntered = enteredPasscode.trim().toUpperCase();
    const cleanExpected = cert.passcode.trim().toUpperCase();

    if (cleanEntered !== cleanExpected) {
      setPasscodeError('Invalid passcode. Please enter the correct secret passcode for this certificate.');
      return;
    }

    setPasscodeError('');
    setDownloading(true);

    try {
      await downloadCertificatePdf(cert, window.location.origin, true);
      setPasscodeModalOpen(false);
      setEnteredPasscode('');
    } catch (e) {
      setPasscodeError('Download failed. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#FFFFFF', minHeight: 'calc(100vh - 140px)', padding: '3rem 1.25rem' }}>
      <div style={{ maxWidth: '820px', margin: '0 auto' }}>
        {/* Verification Card Header */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '14px',
          border: '1px solid #E2E8F0',
          padding: '2rem',
          boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
          marginBottom: '2rem'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: '#FEF2F2',
              color: '#C41230',
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: 700,
              marginBottom: '0.75rem'
            }}>
              <ShieldCheck size={16} /> OFFICIAL CREDENTIAL REGISTRY
            </div>

            {/* Title (Section 16 requirement) */}
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              Certificate Verification
            </h1>
            <p style={{ color: '#64748B', fontSize: '0.9rem', marginTop: '0.35rem' }}>
              Verify the authenticity of YMCA Ethiopia Summer 2026 graduation credentials.
            </p>
          </div>

          {/* Search Form (Section 16 requirement) */}
          <form onSubmit={onSearchSubmit} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: '1 1 300px', display: 'flex', alignItems: 'center' }}>
              <Search size={18} color="#64748B" style={{ position: 'absolute', left: '14px' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter Certificate ID"
                style={{
                  width: '100%',
                  padding: '12px 14px 12px 42px',
                  fontSize: '0.92rem',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  outline: 'none',
                  color: '#0F172A'
                }}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ padding: '12px 24px', fontSize: '0.92rem' }}
            >
              {loading ? 'Verifying…' : 'Verify Certificate'}
            </button>
          </form>
        </div>

        {/* Verification Output */}
        {searched && (
          <div>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#64748B' }}>
                Checking certificate records…
              </div>
            ) : cert && cert.status === 'VALID' ? (
              /* Verified Result (Section 16 requirement) */
              <div style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '14px',
                border: '1px solid #BBF7D0',
                overflow: 'hidden',
                boxShadow: '0 4px 16px rgba(15, 23, 42, 0.05)'
              }}>
                {/* Verified Header */}
                <div style={{
                  backgroundColor: '#166534',
                  color: '#FFFFFF',
                  padding: '1.25rem 1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.75rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <CheckCircle2 size={24} color="#86EFAC" />
                    <div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, letterSpacing: '0.02em' }}>
                        ✓ VERIFIED
                      </div>
                      <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>
                        Authentic credential registered with YMCA Ethiopia
                      </div>
                    </div>
                  </div>

                  <div style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    padding: '4px 10px',
                    borderRadius: '4px'
                  }}>
                    Status: Valid
                  </div>
                </div>

                {/* Details Section */}
                <div style={{ padding: '2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                    <img src="/logo.png" alt="YMCA Ethiopia" style={{ height: '44px', width: 'auto' }} />
                  </div>

                  <div style={{
                    backgroundColor: '#F8FAFC',
                    borderRadius: '10px',
                    border: '1px solid #E2E8F0',
                    padding: '1.5rem',
                    marginBottom: '1.5rem'
                  }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
                      <div>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', letterSpacing: '0.04em' }}>
                          STUDENT NAME
                        </div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>
                          {cert.name}
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', letterSpacing: '0.04em' }}>
                          CERTIFICATE NAME / FIELD
                        </div>
                        <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#C41230', marginTop: '2px' }}>
                          {cert.course}
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', letterSpacing: '0.04em' }}>
                          PROGRAMME
                        </div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>
                          {cert.programme}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#64748B' }}>
                          {cert.duration} • Issued {cert.issueDate}
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', letterSpacing: '0.04em' }}>
                          CERTIFICATE ID
                        </div>
                        <div style={{ fontSize: '0.82rem', fontFamily: 'monospace', fontWeight: 700, color: '#0F172A', marginTop: '2px' }}>
                          {cert.id}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions (Section 17 requirement: download requires passcode) */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center' }}>
                    <button
                      onClick={() => {
                        setPasscodeModalOpen(true);
                        setEnteredPasscode('');
                        setPasscodeError('');
                      }}
                      className="btn-primary"
                      style={{ padding: '10px 22px', fontSize: '0.9rem' }}
                    >
                      <Download size={16} /> Download Certificate (Requires Passcode)
                    </button>

                    <button
                      onClick={() => viewCertificatePdf(cert)}
                      className="btn-secondary"
                      style={{ padding: '10px 18px', fontSize: '0.9rem' }}
                    >
                      <ExternalLink size={16} /> Preview Document
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Invalid / Not Found (Section 16 requirement) */
              <div style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '14px',
                border: '1px solid #FCA5A5',
                padding: '2.5rem 1.5rem',
                textAlign: 'center'
              }}>
                <div style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  backgroundColor: '#FEF2F2',
                  color: '#991B1B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1rem'
                }}>
                  <XCircle size={28} />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#991B1B', margin: '0 0 0.5rem' }}>
                  Certificate Not Found
                </h3>
                <p style={{ color: '#64748B', maxWidth: '440px', margin: '0 auto 1.25rem', fontSize: '0.88rem' }}>
                  No certificate record matches the ID: <code>{searchQuery}</code>. Please verify the identifier or scan the official QR code.
                </p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="btn-secondary"
                  style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                >
                  Clear Search
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Passcode Modal for download on verification page */}
      {passcodeModalOpen && cert && (
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
            maxWidth: '440px',
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
              <div style={{ fontSize: '1rem', fontWeight: 800 }}>Enter Certificate Passcode</div>
              <button
                onClick={() => setPasscodeModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#FFFFFF', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePasscodeDownload} style={{ padding: '1.5rem' }}>
              <p style={{ fontSize: '0.85rem', color: '#64748B', lineHeight: 1.5, margin: '0 0 1rem' }}>
                Enter the secret passcode assigned to {cert.name} to generate and download the certificate.
              </p>

              {passcodeError && (
                <div style={{
                  padding: '8px 12px',
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FCA5A5',
                  color: '#991B1B',
                  borderRadius: '6px',
                  fontSize: '0.82rem',
                  marginBottom: '1rem'
                }}>
                  {passcodeError}
                </div>
              )}

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  CERTIFICATE PASSCODE
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <KeyRound size={17} color="#94A3B8" style={{ position: 'absolute', left: '12px' }} />
                  <input
                    type="text"
                    required
                    value={enteredPasscode}
                    onChange={(e) => setEnteredPasscode(e.target.value)}
                    placeholder="Enter passcode"
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 38px',
                      fontSize: '0.95rem',
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      letterSpacing: '0.05em',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      outline: 'none',
                      color: '#0F172A'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setPasscodeModalOpen(false)}
                  className="btn-secondary"
                  style={{ padding: '8px 16px', fontSize: '0.88rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={downloading}
                  className="btn-primary"
                  style={{ padding: '8px 20px', fontSize: '0.88rem' }}
                >
                  {downloading ? 'Downloading…' : 'Download Certificate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
