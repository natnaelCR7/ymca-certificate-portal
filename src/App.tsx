import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomePage } from './pages/HomePage';
import { VerificationPage } from './pages/VerificationPage';
import { StudentPortalPage } from './pages/StudentPortalPage';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { AdminPage } from './pages/AdminPage';

// ─────────────────────────────────────────────────────────
// Inner router — has access to AuthContext
// ─────────────────────────────────────────────────────────
const AppRoutes: React.FC = () => {
  const { isAdmin, authLoading } = useAuth();

  // Don't render routes until we know the auth state
  if (authLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F8FAFC',
        color: '#64748B',
        fontSize: '0.95rem',
        gap: '0.75rem'
      }}>
        <span style={{
          width: '20px', height: '20px',
          border: '2px solid #CBD5E1',
          borderTopColor: '#C41230',
          borderRadius: '50%',
          display: 'inline-block',
          animation: 'spin 0.8s linear infinite'
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        Loading…
      </div>
    );
  }

  // ── Admins: completely separate experience ────────────────
  if (isAdmin) {
    return (
      // No Navbar / Footer for admins — they get the full admin shell
      <Routes>
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    );
  }

  // ── Regular (student / public) experience ────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <main style={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/verify" element={<VerificationPage />} />
          <Route path="/verify/:id" element={<VerificationPage />} />
          <Route path="/portal" element={<StudentPortalPage />} />
          <Route path="/login" element={<Navigate to="/portal" replace />} />
          {/* /admin shows the login page if not already authenticated as admin */}
          <Route path="/admin" element={<AdminLoginPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
};

// ─────────────────────────────────────────────────────────
// Root App — wraps everything in AuthProvider + BrowserRouter
// ─────────────────────────────────────────────────────────
export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
};
