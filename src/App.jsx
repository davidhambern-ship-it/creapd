import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ProtectedRoute from '@/components/ProtectedRoute';
import ScrollToTop from './components/ScrollToTop';

import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import Dashboard from '@/pages/Dashboard';
import WeeklyPlanner from '@/pages/WeeklyPlanner';
import TodaysBrief from '@/pages/TodaysBrief';
import ItemQueue from '@/pages/ItemQueue';
import StoryDetail from '@/pages/StoryDetail';
import ItemLibrary from '@/pages/ItemLibrary';
import StoryManager from '@/pages/StoryManager';
import ProductionPackages from '@/pages/ProductionPackages';
import BrandProfiles from '@/pages/BrandProfiles';
import ShowProfiles from '@/pages/ShowProfiles';
import ExportCenter from '@/pages/ExportCenter';
import ImageLibrary from '@/pages/ImageLibrary';
import ResearchDesk from '@/pages/ResearchDesk';
import Sources from '@/pages/Sources';
import ManualImport from '@/pages/ManualImport';
import ArchivePage from '@/pages/ArchivePage';
import AutomationCenter from '@/pages/AutomationCenter';
import SecurityCenter from '@/pages/SecurityCenter';
import AcceptanceChecklist from '@/pages/AcceptanceChecklist';
import SettingsPage from '@/pages/SettingsPage';
import UserProfile from '@/pages/UserProfile';
import Organizations from '@/pages/Organizations';
import ActivityCenter from '@/pages/ActivityCenter';
import TemplateLibrary from '@/pages/TemplateLibrary';
import ProductionTemplates from '@/pages/ProductionTemplates';
import PromptTemplates from '@/pages/PromptTemplates';
import ProductionTypeSelector from '@/pages/ProductionTypeSelector';
import ResearchCenter from '@/pages/ResearchCenter';
import ProductionProfileManager from '@/pages/ProductionProfileManager';
import ProducerLayout from '@/components/layout/ProducerLayout';
import MusicDashboard from '@/pages/MusicDashboard';
import MusicResearchCenter from '@/pages/MusicResearchCenter';
import PlaylistBuilder from '@/pages/PlaylistBuilder';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-berna-purple/30 border-t-berna-purple rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground font-mono">Loading Producer...</p>
        </div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<ProducerLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/music-dashboard" element={<MusicDashboard />} />
          <Route path="/music-research" element={<MusicResearchCenter />} />
          <Route path="/workspace" element={<PlaylistBuilder />} />
          <Route path="/select-type" element={<ProductionTypeSelector />} />
          <Route path="/planner" element={<WeeklyPlanner />} />
          <Route path="/brief" element={<TodaysBrief />} />
          <Route path="/queue" element={<ItemQueue />} />
          <Route path="/story/:id" element={<StoryDetail />} />
          <Route path="/library" element={<ItemLibrary />} />
          <Route path="/workspace" element={<StoryManager />} />
          <Route path="/research-center" element={<ResearchCenter />} />
          <Route path="/production" element={<ProductionPackages />} />
          <Route path="/brands" element={<BrandProfiles />} />
          <Route path="/shows" element={<ShowProfiles />} />
          <Route path="/images" element={<ImageLibrary />} />
          <Route path="/export" element={<ExportCenter />} />
          <Route path="/research" element={<ResearchDesk />} />
          <Route path="/research-center" element={<ResearchCenter />} />
          <Route path="/sources" element={<Sources />} />
          <Route path="/import" element={<ManualImport />} />
          <Route path="/archive" element={<ArchivePage />} />
          <Route path="/automation" element={<AutomationCenter />} />
          <Route path="/profile" element={<UserProfile />} />
          <Route path="/organizations" element={<Organizations />} />
          <Route path="/activity" element={<ActivityCenter />} />
          <Route path="/templates" element={<TemplateLibrary />} />
          <Route path="/graphics-templates" element={<ProductionTemplates />} />
          <Route path="/prompt-templates" element={<PromptTemplates />} />
          <Route path="/security" element={<SecurityCenter />} />
          <Route path="/checklist" element={<AcceptanceChecklist />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/select-production-type" element={<ProductionTypeSelector />} />
          <Route path="/profile-manager" element={<ProductionProfileManager />} />
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App