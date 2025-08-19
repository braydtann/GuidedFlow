import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!user) {
    // Redirect to login with return url
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole) {
    const hasRequiredRole = Array.isArray(requiredRole)
      ? requiredRole.includes(user.role)
      : user.role === requiredRole;

    if (!hasRequiredRole) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">🚫</div>
            <h1 className="text-2xl font-bold text-secondary-800 mb-2">Access Denied</h1>
            <p className="text-secondary-600 mb-4">
              You don't have permission to access this resource.
            </p>
            <p className="text-sm text-secondary-500">
              Required role: {Array.isArray(requiredRole) ? requiredRole.join(' or ') : requiredRole}
              <br />
              Your role: {user.role}
            </p>
          </div>
        </div>
      );
    }
  }

  return children;
};

export default ProtectedRoute;