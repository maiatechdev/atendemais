import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSenhas } from '../../context/SenhasContext';
import { canAccessModule, type ModuleKey } from '../../utils/access';

interface ProtectedRouteProps {
  moduleKey: ModuleKey;
  children: React.ReactNode;
}

export default function ProtectedRoute({ moduleKey, children }: ProtectedRouteProps) {
  const { authUser } = useSenhas();

  if (!authUser) return <Navigate to="/login" replace />;
  if (!canAccessModule(authUser, moduleKey)) return <Navigate to="/" replace />;

  return <>{children}</>;
}
