import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from './lib/router';
import { Shield } from 'lucide-react';
import { useAuthStore } from './stores/authStore';
import { ThemeProvider } from './lib/theme';
import Layout from './components/layout/Layout';
import LoginPage from './pages/LoginPage';
import HomeScreen from './pages/HomeScreen';
import DashboardPage from './pages/DashboardPage';
import ChatPage from './pages/ChatPage';
import KnowledgePage from './pages/KnowledgePage';
import EmergencyPage from './pages/EmergencyPage';
import RiskAssessmentPage from './pages/RiskAssessmentPage';
import ToolboxTalkPage from './pages/ToolboxTalkPage';
import ObservationsPage from './pages/ObservationsPage';
import GovernancePage from './pages/GovernancePage';
import AnalyticsPage from './pages/AnalyticsPage';
import PTWPage from './pages/PTWPage';
import IncidentPage from './pages/IncidentPage';
import LearningPage from './pages/LearningPage';
import AdminPage from './pages/AdminPage';
import type { UserRole } from './types';

function RequireAuth({ children, roles }: { children: React.ReactNode; roles?: UserRole[] }) {
  const { user, initialized } = useAuthStore();
  if (!initialized) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/home" replace />;
  return <>{children}</>;
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-navy-900 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 bg-flame-500 rounded-2xl flex items-center justify-center animate-pulse">
          <Shield className="w-7 h-7 text-white" />
        </div>
        <div className="text-navy-400 text-sm">Loading HSE OPS AI · NNPC Ltd</div>
      </div>
    </div>
  );
}

export default function App() {
  const { initialize, initialized, user } = useAuthStore();

  useEffect(() => { initialize(); }, []);

  if (!initialized) return <LoadingScreen />;

  return (
    <ThemeProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/home" replace /> : <LoginPage />} />

        <Route element={<RequireAuth><Layout /></RequireAuth>}>
          {/* Home — card launcher */}
          <Route path="/home" element={<HomeScreen />} />

          {/* Pages — rendered below HorizontalNav */}
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/knowledge" element={<KnowledgePage />} />
          <Route path="/emergency" element={<EmergencyPage />} />
          <Route path="/ptw" element={<PTWPage />} />
          <Route path="/risk-assessment" element={<RequireAuth roles={['admin','hse_manager','hse_advisor','supervisor','auditor']}><RiskAssessmentPage /></RequireAuth>} />
          <Route path="/toolbox" element={<ToolboxTalkPage />} />
          <Route path="/observations" element={<ObservationsPage />} />
          <Route path="/incident" element={<RequireAuth roles={['admin','hse_manager','hse_advisor','supervisor','auditor']}><IncidentPage /></RequireAuth>} />
          <Route path="/learning" element={<LearningPage />} />
          <Route path="/analytics" element={<RequireAuth roles={['admin','hse_manager','auditor']}><AnalyticsPage /></RequireAuth>} />
          <Route path="/governance" element={<RequireAuth roles={['admin','hse_manager','hse_advisor','auditor']}><GovernancePage /></RequireAuth>} />
          <Route path="/admin" element={<RequireAuth roles={['admin']}><AdminPage /></RequireAuth>} />
        </Route>

        <Route path="/" element={<Navigate to={user ? '/home' : '/login'} replace />} />
        <Route path="/dashboard" element={<Navigate to="/home" replace />} />
        <Route path="*" element={<Navigate to={user ? '/home' : '/login'} replace />} />
      </Routes>
    </BrowserRouter>
    </ThemeProvider>
  );
}
