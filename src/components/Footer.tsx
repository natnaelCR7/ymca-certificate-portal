import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer style={{
      backgroundColor: '#0F172A',
      color: '#94A3B8',
      borderTop: '1px solid #1E293B',
      padding: '3rem 1.25rem 1.75rem',
      marginTop: 'auto'
    }}>
      <div style={{
        maxWidth: '1240px',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '2.5rem',
        marginBottom: '2rem'
      }}>
        {/* Organization Info */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', padding: '3px 8px', display: 'flex', alignItems: 'center' }}>
              <img
                src="/logo.png"
                alt="YMCA Ethiopia"
                style={{ height: '36px', width: 'auto', objectFit: 'contain' }}
              />
            </div>
            <div>
              <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em', display: 'block' }}>
                YMCA <span style={{ color: '#F87171' }}>ETHIOPIA</span>
              </span>
              <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                Summer 2026 Certification Portal
              </span>
            </div>
          </div>
          <p style={{ fontSize: '0.88rem', lineHeight: 1.6, color: '#94A3B8', marginBottom: '1rem' }}>
            Official credential verification and student certificate distribution platform for graduates of the YMCA Ethiopia Summer 2026 Training Programs.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: '#CBD5E1' }}>
            <ShieldCheck size={16} color="#4ADE80" />
            <span>Anti-Fraud QR Code Verification</span>
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '1rem', letterSpacing: '0.04em' }}>
            QUICK ACCESS
          </h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <li>
              <Link to="/" style={{ color: '#94A3B8', fontSize: '0.88rem', transition: 'color 0.15s' }}>
                Home &amp; How It Works
              </Link>
            </li>
            <li>
              <Link to="/verify" style={{ color: '#94A3B8', fontSize: '0.88rem', transition: 'color 0.15s' }}>
                Verify Certificate by ID
              </Link>
            </li>
            <li>
              <Link to="/portal" style={{ color: '#94A3B8', fontSize: '0.88rem', transition: 'color 0.15s' }}>
                Student Certificate Portal
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div style={{
        maxWidth: '1240px',
        margin: '0 auto',
        paddingTop: '1.25rem',
        borderTop: '1px solid #1E293B',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        fontSize: '0.8rem',
        color: '#64748B'
      }}>
        <div>
          © {new Date().getFullYear()} National Council of YMCAs of Ethiopia. All Rights Reserved.
        </div>
        <div>
          Official Summer 2026 Certification Portal
        </div>
      </div>
    </footer>
  );
};
