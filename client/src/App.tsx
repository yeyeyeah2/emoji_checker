import type { ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { PageLoader } from './components/Feedback';
import { AdminPage } from './pages/AdminPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { StudentPage } from './pages/StudentPage';
import { TeacherPage } from './pages/TeacherPage';
import { homePathFor, useAuth } from './viewmodels/AuthProvider';

function RoleRedirect() {
  const { status, user } = useAuth();
  if (status === 'loading') return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={homePathFor(user.role)} replace />;
}

function RequireRole({ role, children }: { role: 'STUDENT' | 'TEACHER' | 'ADMIN'; children: ReactNode }) {
  const { status, user } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <PageLoader />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (user.role !== role) return <Navigate to={homePathFor(user.role)} replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/student"
        element={
          <RequireRole role="STUDENT">
            <StudentPage />
          </RequireRole>
        }
      />
      <Route
        path="/teacher"
        element={
          <RequireRole role="TEACHER">
            <TeacherPage />
          </RequireRole>
        }
      />
      <Route
        path="/admin"
        element={
          <RequireRole role="ADMIN">
            <AdminPage />
          </RequireRole>
        }
      />
      <Route path="/" element={<RoleRedirect />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
