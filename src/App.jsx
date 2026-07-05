import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import CreapdLoading from '@/components/shared/CreapdLoading';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ProtectedRoute from '@/components/ProtectedRoute';
import CREAPModeLayout from '@/components/creap/CREAPModeLayout';
import ScrollToTop from './components/ScrollToTop';

import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import Dashboard from '@/pages/Dashboard';
import WeeklyPlanner from '@/pages/WeeklyPlanner';
import TodaysBrief from '@/pages/TodaysBrief';
import StoryQueue from '@/pages/StoryQueue';
import StoryIntelligenceReview from '@/pages/StoryIntelligenceReview';
import StoryDetail from '@/pages/StoryDetail';
import StoryLibrary from '@/pages/StoryLibrary';
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
import ProducerLayout from '@/components/layout/ProducerLayout';
import MusicLayout from '@/components/layout/MusicLayout';
import DashboardRouter from '@/components/DashboardRouter';
import Onboarding from '@/pages/Onboarding';
import ProductionTypes from '@/pages/ProductionTypes';
import CreapdHome from '@/pages/CreapdHome';
import MusicConfigure from '@/pages/MusicConfigure';
import MusicDashboard from '@/pages/MusicDashboard';
import MusicResearch from '@/pages/MusicResearch';
import MusicPlaylist from '@/pages/MusicPlaylist';
import MusicTopics from '@/pages/MusicTopics';
import MusicRundown from '@/pages/MusicRundown';
import MusicAssets from '@/pages/MusicAssets';
import MusicExport from '@/pages/MusicExport';
import TalkConfigure from '@/pages/TalkConfigure';
import TalkDashboard from '@/pages/TalkDashboard';
import TalkResearch from '@/pages/TalkResearch';
import TalkTopics from '@/pages/TalkTopics';
import TalkGuests from '@/pages/TalkGuests';
import TalkRundown from '@/pages/TalkRundown';
import TalkAssets from '@/pages/TalkAssets';
import TalkExport from '@/pages/TalkExport';
import CookingConfigure from '@/pages/CookingConfigure';
import CookingDashboard from '@/pages/CookingDashboard';
import CookingResearch from '@/pages/CookingResearch';
import CookingRecipes from '@/pages/CookingRecipes';
import CookingIngredients from '@/pages/CookingIngredients';
import CookingRundown from '@/pages/CookingRundown';
import CookingAssets from '@/pages/CookingAssets';
import CookingExport from '@/pages/CookingExport';
import SportsConfigure from '@/pages/SportsConfigure';
import SportsDashboard from '@/pages/SportsDashboard';
import SportsResearch from '@/pages/SportsResearch';
import SportsGames from '@/pages/SportsGames';
import SportsAthletes from '@/pages/SportsAthletes';
import SportsRundown from '@/pages/SportsRundown';
import SportsAssets from '@/pages/SportsAssets';
import SportsExport from '@/pages/SportsExport';
import CosmoConfigure from '@/pages/CosmoConfigure';
import CosmoDashboard from '@/pages/CosmoDashboard';
import CosmoResearch from '@/pages/CosmoResearch';
import CosmoTopics from '@/pages/CosmoTopics';
import CosmoGuests from '@/pages/CosmoGuests';
import CosmoRundown from '@/pages/CosmoRundown';
import CosmoAssets from '@/pages/CosmoAssets';
import CosmoExport from '@/pages/CosmoExport';
import DefaultProductionSettings from '@/pages/DefaultProductionSettings';
import Presentations from '@/pages/Presentations';
import PresentationReview from '@/pages/PresentationReview';
import TalkLayout from '@/components/layout/TalkLayout';
import CookingLayout from '@/components/layout/CookingLayout';
import SportsLayout from '@/components/layout/SportsLayout';
import CosmoLayout from '@/components/layout/CosmoLayout';
import SpiritualLayout from '@/components/layout/SpiritualLayout';
import SpiritualConfigure from '@/pages/SpiritualConfigure';
import SpiritualDashboard from '@/pages/SpiritualDashboard';
import SpiritualResearch from '@/pages/SpiritualResearch';
import SpiritualResearchDetail from '@/pages/SpiritualResearchDetail';
import SpiritualLibrary from '@/pages/SpiritualLibrary';
import LibraryReader from '@/pages/LibraryReader';
import LibraryWordStudy from '@/pages/LibraryWordStudy';
import LibraryCompare from '@/pages/LibraryCompare';
import LibraryLanguages from '@/pages/LibraryLanguages';
import SpiritualStudy from '@/pages/SpiritualStudy';
import SpiritualStudySession from '@/pages/SpiritualStudySession';
import SpiritualMessage from '@/pages/SpiritualMessage';
import SpiritualAssets from '@/pages/SpiritualAssets';
import SpiritualPackage from '@/pages/SpiritualPackage';
import SpiritualExport from '@/pages/SpiritualExport';
import WorldScriptureRegistry from '@/pages/admin/WorldScriptureRegistry';
import WorldScriptureRegistryDetail from '@/pages/admin/WorldScriptureRegistryDetail';
import ContentAcquisitionEngine from '@/pages/admin/ContentAcquisitionEngine';
import FoundationSeeder from '@/pages/admin/FoundationSeeder';
import SourceManagementCenter from '@/pages/admin/SourceManagementCenter';
import HandlerRegistry from '@/pages/admin/HandlerRegistry';
import TourControlCenter from '@/pages/admin/TourControlCenter';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <CreapdLoading size="lg" />
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
        <Route element={<CREAPModeLayout />}>
        <Route path="/home" element={<CreapdHome />} />
        <Route element={<ProducerLayout />}>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/dashboard" element={<Navigate to="/news/dashboard" replace />} />
          <Route path="/news/dashboard" element={<DashboardRouter />} />
          <Route path="/planner" element={<WeeklyPlanner />} />
          <Route path="/brief" element={<TodaysBrief />} />
          <Route path="/queue" element={<StoryQueue />} />
          <Route path="/review" element={<StoryIntelligenceReview />} />
          <Route path="/story/:id" element={<StoryDetail />} />
          <Route path="/library" element={<StoryLibrary />} />
          <Route path="/workspace" element={<StoryManager />} />
          <Route path="/production" element={<ProductionPackages />} />
          <Route path="/brands" element={<BrandProfiles />} />
          <Route path="/shows" element={<ShowProfiles />} />
          <Route path="/images" element={<ImageLibrary />} />
          <Route path="/export" element={<ExportCenter />} />
          <Route path="/research" element={<ResearchDesk />} />
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
          <Route path="/presentations" element={<Presentations />} />
          <Route path="/presentations/:id" element={<PresentationReview />} />
        </Route>

        {/* Onboarding & Production Type Selection */}
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/production-types" element={<Navigate to="/" replace />} />

        {/* Music Production */}
        <Route element={<MusicLayout />}>
          <Route path="/music/configure" element={<MusicConfigure />} />
          <Route path="/music/dashboard" element={<MusicDashboard />} />
          <Route path="/music/research" element={<MusicResearch />} />
          <Route path="/music/playlist" element={<MusicPlaylist />} />
          <Route path="/music/topics" element={<MusicTopics />} />
          <Route path="/music/rundown" element={<MusicRundown />} />
          <Route path="/music/assets" element={<MusicAssets />} />
          <Route path="/music/export" element={<MusicExport />} />
          <Route path="/settings/default-production" element={<DefaultProductionSettings />} />
        </Route>

        {/* Talk Production */}
        <Route element={<TalkLayout />}>
          <Route path="/talk/configure" element={<TalkConfigure />} />
          <Route path="/talk/dashboard" element={<TalkDashboard />} />
          <Route path="/talk/research" element={<TalkResearch />} />
          <Route path="/talk/topics" element={<TalkTopics />} />
          <Route path="/talk/guests" element={<TalkGuests />} />
          <Route path="/talk/rundown" element={<TalkRundown />} />
          <Route path="/talk/assets" element={<TalkAssets />} />
          <Route path="/talk/export" element={<TalkExport />} />
        </Route>

        {/* Cooking Production */}
        <Route element={<CookingLayout />}>
          <Route path="/cooking/configure" element={<CookingConfigure />} />
          <Route path="/cooking/dashboard" element={<CookingDashboard />} />
          <Route path="/cooking/research" element={<CookingResearch />} />
          <Route path="/cooking/recipes" element={<CookingRecipes />} />
          <Route path="/cooking/ingredients" element={<CookingIngredients />} />
          <Route path="/cooking/rundown" element={<CookingRundown />} />
          <Route path="/cooking/assets" element={<CookingAssets />} />
          <Route path="/cooking/export" element={<CookingExport />} />
        </Route>

        {/* Sports Production */}
        <Route element={<SportsLayout />}>
          <Route path="/sports/configure" element={<SportsConfigure />} />
          <Route path="/sports/dashboard" element={<SportsDashboard />} />
          <Route path="/sports/research" element={<SportsResearch />} />
          <Route path="/sports/games" element={<SportsGames />} />
          <Route path="/sports/athletes" element={<SportsAthletes />} />
          <Route path="/sports/rundown" element={<SportsRundown />} />
          <Route path="/sports/assets" element={<SportsAssets />} />
          <Route path="/sports/export" element={<SportsExport />} />
        </Route>

        {/* Cosmo Production */}
        <Route element={<CosmoLayout />}>
          <Route path="/cosmo/configure" element={<CosmoConfigure />} />
          <Route path="/cosmo/dashboard" element={<CosmoDashboard />} />
          <Route path="/cosmo/research" element={<CosmoResearch />} />
          <Route path="/cosmo/topics" element={<CosmoTopics />} />
          <Route path="/cosmo/guests" element={<CosmoGuests />} />
          <Route path="/cosmo/rundown" element={<CosmoRundown />} />
          <Route path="/cosmo/assets" element={<CosmoAssets />} />
          <Route path="/cosmo/export" element={<CosmoExport />} />
        </Route>

        {/* Spiritual Production */}
        <Route element={<SpiritualLayout />}>
          <Route path="/spiritual/configure" element={<SpiritualConfigure />} />
          <Route path="/spiritual/dashboard" element={<SpiritualDashboard />} />
          <Route path="/spiritual/research" element={<SpiritualResearch />} />
          <Route path="/spiritual/research/:researchItemId" element={<SpiritualResearchDetail />} />
          <Route path="/spiritual/library" element={<SpiritualLibrary />} />
          <Route path="/spiritual/library/reader/:textId" element={<LibraryReader />} />
          <Route path="/spiritual/library/word/:wordId" element={<LibraryWordStudy />} />
          <Route path="/spiritual/library/compare" element={<LibraryCompare />} />
          <Route path="/spiritual/library/compare/:comparisonId" element={<LibraryCompare />} />
          <Route path="/spiritual/library/languages" element={<LibraryLanguages />} />
          <Route path="/spiritual/study" element={<SpiritualStudy />} />
          <Route path="/spiritual/study/:sessionId" element={<SpiritualStudySession />} />
          <Route path="/spiritual/message" element={<SpiritualMessage />} />
          <Route path="/spiritual/assets" element={<SpiritualAssets />} />
          <Route path="/spiritual/package" element={<SpiritualPackage />} />
          <Route path="/spiritual/export" element={<SpiritualExport />} />
        </Route>

        {/* Admin */}
        <Route path="/admin/world-scripture-registry" element={<WorldScriptureRegistry />} />
        <Route path="/admin/world-scripture-registry/:id" element={<WorldScriptureRegistryDetail />} />
        <Route path="/admin/content-acquisition-engine" element={<ContentAcquisitionEngine />} />
        <Route path="/admin/foundation-seeder" element={<FoundationSeeder />} />
        <Route path="/admin/source-management-center" element={<SourceManagementCenter />} />
        <Route path="/admin/handler-registry" element={<HandlerRegistry />} />
        <Route path="/admin/tour-control-center" element={<TourControlCenter />} />
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