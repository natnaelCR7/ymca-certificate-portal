import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ShieldCheck,
  Award,
  Search,
  CheckCircle2,
  ArrowRight,
  Lock,
  QrCode,
  FileCheck2,
  UserCheck,
  KeyRound,
  Download
} from 'lucide-react';
import { AVAILABLE_COURSES } from '../data/certifiedParticipants';

export const HomePage: React.FC = () => {
  const [searchId, setSearchId] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchId.trim()) {
      navigate(`/verify/${encodeURIComponent(searchId.trim())}`);
    }
  };

  const steps = [
    {
      num: '01',
      title: 'Create an Account or Sign In',
      desc: 'Register with your student details and Telegram username to access the secure certification dashboard.'
    },
    {
      num: '02',
      title: 'Access Associated Certificates',
      desc: 'View all certificates linked to your student profile across your completed Summer 2026 programs.'
    },
    {
      num: '03',
      title: 'Use Certificate ID for Verification',
      desc: 'Every certificate is assigned a unique, permanent Certificate ID used for instant validation.'
    },
    {
      num: '04',
      title: 'Use Passcode for Download',
      desc: 'Enter your assigned secret certificate passcode to claim and download your high-resolution official PDF.'
    },
    {
      num: '05',
      title: 'Universal Public Verification',
      desc: 'Employers, universities, and embassies can verify any certificate at any time via the verification page or QR code.'
    }
  ];

  return (
    <div style={{ backgroundColor: '#FFFFFF', minHeight: 'calc(100vh - 140px)' }}>
      {/* ── HERO SECTION ──────────────────────────────────────── */}
      <section style={{
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E2E8F0',
        padding: '4.5rem 1.25rem 3.5rem'
      }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', textAlign: 'center' }}>
          {/* Official Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.65rem',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FCA5A5',
            padding: '6px 16px',
            borderRadius: '24px',
            marginBottom: '1.5rem'
          }}>
            <img src="/logo.png" alt="YMCA" style={{ height: '20px', width: 'auto' }} />
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#C41230', letterSpacing: '0.03em' }}>
              NATIONAL COUNCIL OF YMCAS OF ETHIOPIA
            </span>
          </div>

          {/* Main Hero Title (Exact Requirement) */}
          <h1 style={{
            fontSize: 'clamp(2.1rem, 4.5vw, 3.2rem)',
            fontWeight: 800,
            lineHeight: 1.18,
            letterSpacing: '-0.03em',
            color: '#0F172A',
            marginBottom: '1.25rem'
          }}>
            The Official YMCA Summer 2026 <br />
            <span style={{ color: '#C41230' }}>Certification Portal</span>
          </h1>

          {/* Short Professional Explanation */}
          <p style={{
            fontSize: 'clamp(1rem, 1.8vw, 1.12rem)',
            color: '#475569',
            maxWidth: '680px',
            margin: '0 auto 2.5rem',
            lineHeight: 1.6
          }}>
            The official centralized registry for graduates of the YMCA Ethiopia Summer 2026 Training Programs. Access, claim, download, and verify your credentials with tamper-evident security.
          </p>

          {/* Quick Certificate Verification Search Box */}
          <div style={{
            maxWidth: '620px',
            margin: '0 auto',
            backgroundColor: '#FFFFFF',
            padding: '8px',
            borderRadius: '12px',
            border: '1px solid #CBD5E1',
            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.06)'
          }}>
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: '1 1 280px', display: 'flex', alignItems: 'center' }}>
                <Search size={18} color="#64748B" style={{ position: 'absolute', left: '14px' }} />
                <input
                  type="text"
                  value={searchId}
                  onChange={(e) => setSearchId(e.target.value)}
                  placeholder="Enter Certificate ID (e.g. 1941b070-ee2c...) or scan code"
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 42px',
                    fontSize: '0.92rem',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    outline: 'none',
                    color: '#0F172A',
                    backgroundColor: '#F8FAFC',
                    fontWeight: 500
                  }}
                />
              </div>
              <button
                type="submit"
                className="btn-primary"
                style={{ padding: '12px 22px', fontSize: '0.92rem' }}
              >
                <ShieldCheck size={18} />
                Verify Certificate
              </button>
            </form>
          </div>

          {/* Direct CTA to Student Portal */}
          <div style={{ marginTop: '1.75rem', display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <Link
              to="/portal"
              className="btn-primary"
              style={{ padding: '12px 24px', fontSize: '0.95rem' }}
            >
              <Award size={18} />
              Access Student Portal
              <ArrowRight size={16} />
            </Link>
            <Link
              to="/verify"
              className="btn-secondary"
              style={{ padding: '12px 22px', fontSize: '0.95rem' }}
            >
              <Search size={18} />
              Open Verification Page
            </Link>
          </div>
        </div>
      </section>

      {/* ── HOW THE PORTAL WORKS SECTION (Exact Requirement) ── */}
      <section style={{ padding: '4.5rem 1.25rem', backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#C41230', letterSpacing: '0.06em' }}>
              STEP-BY-STEP GUIDE
            </span>
            <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0F172A', marginTop: '0.35rem' }}>
              How the Certification Portal Works
            </h2>
            <p style={{ color: '#64748B', maxWidth: '580px', margin: '0.5rem auto 0', fontSize: '0.92rem' }}>
              A secure, transparent, and direct process for students and verifying organizations.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1.5rem'
          }}>
            {steps.map((step, idx) => (
              <div
                key={idx}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  padding: '1.75rem',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem'
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <span style={{
                    fontSize: '1.2rem',
                    fontWeight: 800,
                    color: '#C41230',
                    fontFamily: 'monospace'
                  }}>
                    {step.num}
                  </span>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: '#FEF2F2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#C41230'
                  }}>
                    {idx === 0 && <UserCheck size={16} />}
                    {idx === 1 && <Award size={16} />}
                    {idx === 2 && <FileCheck2 size={16} />}
                    {idx === 3 && <KeyRound size={16} />}
                    {idx === 4 && <ShieldCheck size={16} />}
                  </div>
                </div>

                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  {step.title}
                </h3>
                <p style={{ fontSize: '0.88rem', color: '#64748B', lineHeight: 1.55, margin: 0 }}>
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECURITY & VERIFICATION INFORMATION ─────────────── */}
      <section style={{ padding: '4rem 1.25rem', backgroundColor: '#FFFFFF' }}>
        <div style={{
          maxWidth: '1100px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '3rem',
          alignItems: 'center'
        }}>
          <div>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#C41230', letterSpacing: '0.06em' }}>
              CREDENTIAL INTEGRITY
            </span>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0F172A', marginTop: '0.35rem', marginBottom: '1rem' }}>
              Official Validation Standards
            </h2>
            <p style={{ color: '#475569', lineHeight: 1.6, fontSize: '0.92rem', marginBottom: '1.5rem' }}>
              Each YMCA Ethiopia certificate is embedded with an individual cryptographic QR code and unique Certificate ID. Verifying parties can confirm authenticity instantly with full confidence.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <div style={{ padding: '6px', borderRadius: '6px', backgroundColor: '#FEF2F2', color: '#C41230' }}>
                  <QrCode size={18} />
                </div>
                <div>
                  <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0F172A', margin: '0 0 2px' }}>
                    Instant QR Scan
                  </h4>
                  <p style={{ fontSize: '0.82rem', color: '#64748B', margin: 0 }}>
                    Directly opens the official verification record on any mobile device.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <div style={{ padding: '6px', borderRadius: '6px', backgroundColor: '#FEF2F2', color: '#C41230' }}>
                  <Lock size={18} />
                </div>
                <div>
                  <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0F172A', margin: '0 0 2px' }}>
                    Passcode Protected Downloads
                  </h4>
                  <p style={{ fontSize: '0.82rem', color: '#64748B', margin: 0 }}>
                    Certificates can only be downloaded by authorized students using their private passcode.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div style={{
            backgroundColor: '#0F172A',
            borderRadius: '16px',
            padding: '2rem',
            color: '#FFFFFF'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <img src="/logo.png" alt="YMCA" style={{ height: '32px', filter: 'brightness(0) invert(1)' }} />
              <div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>YMCA Ethiopia Verification Standard</div>
                <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Registry Active for Summer 2026 Cohort</div>
              </div>
            </div>

            <div style={{
              backgroundColor: '#1E293B',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1.25rem'
            }}>
              <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginBottom: '0.25rem' }}>OFFICIAL VERIFICATION URL</div>
              <code style={{ fontSize: '0.82rem', color: '#F87171', wordBreak: 'break-all' }}>
                https://portal.ymcaethiopia.org/verify/[CERTIFICATE-ID]
              </code>
            </div>

            <Link
              to="/verify"
              className="btn-primary"
              style={{ width: '100%', boxSizing: 'border-box' }}
            >
              Verify a Certificate Now
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
