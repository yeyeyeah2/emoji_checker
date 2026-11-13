import { Navigate, Route, Routes } from "react-router-dom";

import { useAuth } from "./auth";
import Layout from "./components/Layout";
import CoursesPage from "./pages/CoursesPage";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import RecordsPage from "./pages/RecordsPage";
import StatisticsPage from "./pages/StatisticsPage";
import UsersPage from "./pages/UsersPage";

function ProtectedApp() {
  const { token, user } = useAuth();
  if (!token || !user) return <Navigate to="/login" replace />;
  return (
    <Layout>
      <Routes>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="courses" element={<CoursesPage />} />
        <Route path="records" element={<RecordsPage />} />
        <Route path="statistics" element={<StatisticsPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  const { token, user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={token && user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route path="/*" element={<ProtectedApp />} />
    </Routes>
  );
}
