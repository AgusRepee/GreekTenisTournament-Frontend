import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { readIsAdmin } from '@/lib/adminAuth';

type Props = {
  children: ReactNode;
};

export default function ProtectedAdminRoute({ children }: Props) {
  const location = useLocation();

  if (!readIsAdmin()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
