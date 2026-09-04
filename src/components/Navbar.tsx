import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShieldCheck, UserCheck, Menu, X, Home, LogOut, User as UserIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, logOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  // Public navigation links only (NO admin links on public navbar)
  const navLinks = [
    { name: 'Home', path: '/', icon: <Home size={18} /> },
    { name: 'Verify Certificate', path: '/verify', icon: <ShieldCheck size={18} /> },
    { name: 'Student Portal', path: '/portal', icon: <UserCheck size={18} /> }
  ];

  const handleSignOut = async () => {
    await logOut();
    navigate('/');
  };

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      backgroundColor: '#FFFFFF',
      borderBottom: '1px solid #E2E8F0'
    }}>
      {/* Top Red Accent Bar */}
      <div style={{ height: '3px', backgroundColor: '#C41230' }} />

      <div style={{
        maxWidth: '1240px',
        margin: '0 auto',
        padding: '0 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '70px'
      }}>
        {/* Real Brand Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <img
            src="/logo.png"
            alt="YMCA Ethiopia Logo"
            style={{ height: '40px', width: 'auto', objectFit: 'contain' }}
          />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
                YMCA <span style={{ color: '#C41230' }}>ETHIOPIA</span>
              </span>
              <span style={{
                fontSize: '0.62rem',
                fontWeight: 700,
                color: '#C41230',
                backgroundColor: '#FEF2F2',
                padding: '2px 6px',
                borderRadius: '4px',
                border: '1px solid #FCA5A5'
              }}>
                PORTAL
              </span>
            </div>
            <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 500 }}>
              Summer 2026 Certification Portal
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav style={{ display: 'none', alignItems: 'center', gap: '0.5rem' }} className="desktop-nav">
          {navLinks.map((link) => {
            const active = isActive(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.5rem 0.95rem',
                  borderRadius: '6px',
                  fontSize: '0.88rem',
                  fontWeight: active ? 700 : 500,
                  color: active ? '#C41230' : '#334155',
                  backgroundColor: active ? '#FEF2F2' : 'transparent',
                  border: active ? '1px solid #FCA5A5' : '1px solid transparent',
                  transition: 'all 0.15s ease'
                }}
              >
                <span style={{ color: active ? '#C41230' : '#64748B' }}>{link.icon}</span>
                {link.name}
              </Link>
            );
          })}

          {/* User Sign In / Profile status */}
          {currentUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginLeft: '0.5rem', paddingLeft: '0.75rem', borderLeft: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: '#0F172A', fontWeight: 600 }}>
                <UserIcon size={16} color="#C41230" />
                <span>{currentUser.displayName || currentUser.email}</span>
              </div>
              <button
                onClick={handleSignOut}
                className="btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
              >
                <LogOut size={13} />
                Sign Out
              </button>
            </div>
          ) : (
            <Link
              to="/portal"
              className="btn-primary"
              style={{ marginLeft: '0.5rem', padding: '8px 16px', fontSize: '0.85rem' }}
            >
              Sign In
            </Link>
          )}
        </nav>

        {/* Mobile menu button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle Navigation"
          style={{
            display: 'flex',
            padding: '0.5rem',
            borderRadius: '6px',
            background: '#F1F5F9',
            color: '#334155',
            border: 'none',
            cursor: 'pointer'
          }}
          className="mobile-nav-btn"
        >
          {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div style={{
          backgroundColor: '#FFFFFF',
          borderTop: '1px solid #E2E8F0',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem'
        }}>
          {navLinks.map((link) => {
            const active = isActive(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '6px',
                  fontSize: '0.92rem',
                  fontWeight: active ? 700 : 500,
                  color: active ? '#C41230' : '#334155',
                  backgroundColor: active ? '#FEF2F2' : 'transparent'
                }}
              >
                <span style={{ color: active ? '#C41230' : '#64748B' }}>{link.icon}</span>
                {link.name}
              </Link>
            );
          })}

          {currentUser ? (
            <div style={{ marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ fontSize: '0.85rem', color: '#0F172A', fontWeight: 600 }}>
                Signed in as {currentUser.displayName || currentUser.email}
              </div>
              <button
                onClick={() => { setMobileMenuOpen(false); handleSignOut(); }}
                className="btn-secondary"
                style={{ justifyContent: 'center' }}
              >
                <LogOut size={15} /> Sign Out
              </button>
            </div>
          ) : (
            <Link
              to="/portal"
              onClick={() => setMobileMenuOpen(false)}
              className="btn-primary"
              style={{ textAlign: 'center', marginTop: '0.5rem' }}
            >
              Sign In to Student Portal
            </Link>
          )}
        </div>
      )}

      <style>{`
        @media (min-width: 768px) {
          .desktop-nav {
            display: flex !important;
          }
          .mobile-nav-btn {
            display: none !important;
          }
        }
      `}</style>
    </header>
  );
};
