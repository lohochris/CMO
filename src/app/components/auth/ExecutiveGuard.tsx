import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

interface GuardProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export const ExecutiveGuard: React.FC<GuardProps> = ({ children, allowedRoles }) => {
  const location = useLocation();

  // Retrieve current authenticated session
  const stored = localStorage.getItem('cmo_current_member') || localStorage.getItem('cmo_current_user');
  if (!stored) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  let user: any = {};
  try {
    user = JSON.parse(stored);
  } catch (e) {
    return <Navigate to="/login" replace />;
  }

  const memberId = (user.official_member_id || user.id || '').toUpperCase().trim();
  const role = (user.role || '').toLowerCase().trim();

  // 1. Permanent Institutional Office Key Bypass (Never block an office ID)
  if (memberId.startsWith('HCC-CMO-EXEC-') || memberId.startsWith('HCC-CMO-SPRT-') || user.is_executive || user.is_executive_office) {
    // Optional office-to-route verification:
    if (location.pathname.includes('treasur') && memberId !== 'HCC-CMO-EXEC-TR' && role !== 'super_admin' && role !== 'treasurer') {
      // Allow or route gracefully
    }
    return <>{children}</>;
  }

  // 2. Super Admin Bypass
  if (role === 'super_admin' || role === 'admin') {
    return <>{children}</>;
  }

  // 3. Role-based checks for real member profiles with executive roles
  if (allowedRoles && allowedRoles.length > 0) {
    const hasRole = allowedRoles.some((r) => r.toLowerCase() === role);
    if (!hasRole) {
      // Remove any blocking alert toast or error message that causes render traps
      return <Navigate to="/dashboard" replace />;
    }
  } else if (role === 'member' || role === 'regular') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ExecutiveGuard;
