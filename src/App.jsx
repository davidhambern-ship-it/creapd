import React, { lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate, useParams } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import CreapdLoading from '@/components/shared/CreapdLoading';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ProtectedRoute from '@/components/ProtectedRoute';
import CREAPModeLayout from '@/components/creap/CREAPModeLayout';
import ScrollToTop from './components/ScrollToTop';

const Login = lazy(() => import('@/pages/Login'));
const AuthDebug = lazy(() => import('@/pages/AuthDebug'));
const Register = lazy(() => import('@/pages/Register'));
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/ResetPassword'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const PodcastDashboard = lazy(() => import('@/pages/PodcastDashboard'));
const WeeklyPlanner = lazy(() => import('@/pages/WeeklyPlanner'));
const TodaysBrief = lazy(() => import('@/pages/TodaysBrief'));
const StoryQueue = lazy(() => import('@/pages/StoryQueue'));
const StoryIntelligenceReview = lazy(() => import('@/pages/StoryIntelligenceReview'));
const StoryDetail = lazy(() => import('@/pages/StoryDetail'));
const StoryLibrary = lazy(() => import('@/pages/StoryLibrary'));
const StoryManager = lazy(() => import('@/pages/StoryManager'));
const ProductionPackages = lazy(() => import('@/pages/ProductionPackages'));
const BrandProfiles = lazy(() => import('@/pages/BrandProfiles'));
const ShowProfiles = lazy(() => import('@/pages/ShowProfiles'));
const ExportCenter = lazy(() => import('@/pages/ExportCenter'));
const ImageLibrary = lazy(() => import('@/pages/ImageLibrary'));
const ResearchDesk = lazy(() => import('@/pages/ResearchDesk'));
const Sources = lazy(() => import('@/pages/Sources'));
const ManualImport = lazy(() => import('@/pages/ManualImport'));
const ArchivePage = lazy(() => import('@/pages/ArchivePage'));
const AutomationCenter = lazy(() => import('@/pages/AutomationCenter'));
const SecurityCenter = lazy(() => import('@/pages/SecurityCenter'));
const AcceptanceChecklist = lazy(() => import('@/pages/AcceptanceChecklist'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const UserProfile = lazy(() => import('@/pages/UserProfile'));
const Organizations = lazy(() => import('@/pages/Organizations'));
const ActivityCenter = lazy(() => import('@/pages/ActivityCenter'));
const TemplateLibrary = lazy(() => import('@/pages/TemplateLibrary'));
const ProductionTemplates = lazy(() => import('@/pages/ProductionTemplates'));
const PromptTemplates = lazy(() => import('@/pages/PromptTemplates'));
const ProducerLayout = lazy(() => import('@/components/layout/ProducerLayout'));
const MusicLayout = lazy(() => import('@/components/layout/MusicLayout'));
import DashboardRouter from '@/components/DashboardRouter';
const Onboarding = lazy(() => import('@/pages/Onboarding'));
const ProductionTypes = lazy(() => import('@/pages/ProductionTypes'));
const CreapdHome = lazy(() => import('@/pages/CreapdHome'));
const MusicConfigure = lazy(() => import('@/pages/MusicConfigure'));
const MusicDashboard = lazy(() => import('@/pages/MusicDashboard'));
const RadioLive = lazy(() => import('@/pages/RadioLive'));
const EmbedDemo = lazy(() => import('@/pages/EmbedDemo'));
const MusicResearch = lazy(() => import('@/pages/MusicResearch'));
const MusicPlaylist = lazy(() => import('@/pages/MusicPlaylist'));
const MusicTop10 = lazy(() => import('@/pages/MusicTop10'));
const MusicTopics = lazy(() => import('@/pages/MusicTopics'));
const MusicRundown = lazy(() => import('@/pages/MusicRundown'));
const MusicAssets = lazy(() => import('@/pages/MusicAssets'));
const RadioProductionTools = lazy(() => import('@/pages/RadioProductionTools'));
const TalkConfigure = lazy(() => import('@/pages/TalkConfigure'));
const TalkDashboard = lazy(() => import('@/pages/TalkDashboard'));
const TalkResearch = lazy(() => import('@/pages/TalkResearch'));
const TalkTopics = lazy(() => import('@/pages/TalkTopics'));
const TalkGuests = lazy(() => import('@/pages/TalkGuests'));
const TalkRundown = lazy(() => import('@/pages/TalkRundown'));
const TalkAssets = lazy(() => import('@/pages/TalkAssets'));
const TalkExport = lazy(() => import('@/pages/TalkExport'));
const TalkLive = lazy(() => import('@/pages/TalkLive'));
const ResearchConfigure = lazy(() => import('@/pages/ResearchConfigure'));
const ResearchDashboard = lazy(() => import('@/pages/ResearchDashboard'));
const ResearchTopics = lazy(() => import('@/pages/ResearchTopics'));
const ResearchManager = lazy(() => import('@/pages/ResearchManager'));
const ResearchDossier = lazy(() => import('@/pages/ResearchDossier'));
const ResearchAssets = lazy(() => import('@/pages/ResearchAssets'));
const ResearchExport = lazy(() => import('@/pages/ResearchExport'));
const ResearchArchive = lazy(() => import('@/pages/ResearchArchive'));
const DefaultProductionSettings = lazy(() => import('@/pages/DefaultProductionSettings'));
const Presentations = lazy(() => import('@/pages/Presentations'));
const PresentationEditor = lazy(() => import('@/pages/PresentationEditor'));
// Redirects /news/presentations/:id → /editor/:id (Navigate doesn't interpolate route params)
const RedirectToEditor = () => {
  const { id } = useParams();
  return <Navigate to={`/editor/${id}`} replace />;
};
const TalkLayout = lazy(() => import('@/components/layout/TalkLayout'));
const RPPLobby = lazy(() => import('@/pages/RPPLobby'));
const ResearchLayout = lazy(() => import('@/components/rpp/ResearchLayout'));
const SpiritualLayout = lazy(() => import('@/components/layout/SpiritualLayout'));
const SpiritualConfigure = lazy(() => import('@/pages/SpiritualConfigure'));
const SpiritualDashboard = lazy(() => import('@/pages/SpiritualDashboard'));
const SpiritualResearch = lazy(() => import('@/pages/SpiritualResearch'));
const SpiritualResearchDetail = lazy(() => import('@/pages/SpiritualResearchDetail'));
const SpiritualLibrary = lazy(() => import('@/pages/SpiritualLibrary'));
const LibraryReader = lazy(() => import('@/pages/LibraryReader'));
const LibraryWordStudy = lazy(() => import('@/pages/LibraryWordStudy'));
const LibraryCompare = lazy(() => import('@/pages/LibraryCompare'));
const LibraryLanguages = lazy(() => import('@/pages/LibraryLanguages'));
const SpiritualStudy = lazy(() => import('@/pages/SpiritualStudy'));
const SpiritualStudySession = lazy(() => import('@/pages/SpiritualStudySession'));
const SpiritualMessage = lazy(() => import('@/pages/SpiritualMessage'));
const SpiritualAssets = lazy(() => import('@/pages/SpiritualAssets'));
const SpiritualPackage = lazy(() => import('@/pages/SpiritualPackage'));
const SpiritualExport = lazy(() => import('@/pages/SpiritualExport'));
const WorldScriptureRegistry = lazy(() => import('@/pages/admin/WorldScriptureRegistry'));
const WorldScriptureRegistryDetail = lazy(() => import('@/pages/admin/WorldScriptureRegistryDetail'));
const ContentAcquisitionEngine = lazy(() => import('@/pages/admin/ContentAcquisitionEngine'));
const FoundationSeeder = lazy(() => import('@/pages/admin/FoundationSeeder'));
const SourceManagementCenter = lazy(() => import('@/pages/admin/SourceManagementCenter'));
const HandlerRegistry = lazy(() => import('@/pages/admin/HandlerRegistry'));
const CreapSettings = lazy(() => import('@/pages/admin/CreapSettings'));
import ControllerDashboard from '@/components/creapd/ControllerDashboard';
import StudioAvailabilityGate from '@/components/shared/StudioAvailabilityGate';
const AssetLibrary = lazy(() => import('@/pages/admin/AssetLibrary'));
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
    <Suspense
      fallback={
        <div className="fixed inset-0 flex items-center justify-center bg-background">
          <CreapdLoading size="lg" />
        </div>
      }
    >
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route path="/auth-debug" element={<AuthDebug />} />
        <Route element={<CREAPModeLayout />}>
        <Route path="/" element={<CreapdHome />} />
        <Route path="/home" element={<Navigate to="/" replace />} />
        <Route element={<ProducerLayout />}>
          {/* Podcast Production — user-facing routes. Legacy /news and /talk routes remain below during migration. */}
          <Route path="/podcast" element={<PodcastDashboard />} />
          <Route path="/podcast/dashboard" element={<Navigate to="/podcast" replace />} />
          <Route path="/podcast/setup" element={<TalkConfigure />} />
          <Route path="/podcast/planner" element={<WeeklyPlanner />} />
          <Route path="/podcast/research" element={<ResearchDesk />} />
          <Route path="/podcast/sources" element={<Sources />} />
          <Route path="/podcast/import" element={<ManualImport />} />
          <Route path="/podcast/brief" element={<TodaysBrief />} />
          <Route path="/podcast/queue" element={<StoryQueue />} />
          <Route path="/podcast/review" element={<StoryIntelligenceReview />} />
          <Route path="/podcast/story/:id" element={<StoryDetail />} />
          <Route path="/podcast/library" element={<StoryLibrary />} />
          <Route path="/podcast/workspace" element={<StoryManager />} />
          <Route path="/podcast/production" element={<ProductionPackages />} />
          <Route path="/podcast/guests" element={<TalkGuests />} />
          <Route path="/podcast/rundown" element={<TalkRundown />} />
          <Route path="/podcast/assets" element={<TalkAssets />} />
          <Route path="/podcast/archive" element={<ArchivePage />} />
          <Route path="/podcast/export" element={<ExportCenter />} />
          <Route path="/podcast/profile" element={<UserProfile />} />
          <Route path="/podcast/presentations" element={<Presentations />} />

          <Route path="/news/dashboard" element={<PodcastDashboard />} />
          <Route path="/news/planner" element={<WeeklyPlanner />} />
          <Route path="/news/brief" element={<TodaysBrief />} />
          <Route path="/news/queue" element={<StoryQueue />} />
          <Route path="/news/review" element={<StoryIntelligenceReview />} />
          <Route path="/news/story/:id" element={<StoryDetail />} />
          <Route path="/news/library" element={<StoryLibrary />} />
          <Route path="/news/workspace" element={<StoryManager />} />
          <Route path="/news/production" element={<ProductionPackages />} />
          <Route path="/news/brands" element={<BrandProfiles />} />
          <Route path="/news/shows" element={<ShowProfiles />} />
          <Route path="/news/images" element={<ImageLibrary />} />
          <Route path="/news/export" element={<ExportCenter />} />
          <Route path="/news/research" element={<ResearchDesk />} />
          <Route path="/news/sources" element={<Sources />} />
          <Route path="/news/import" element={<ManualImport />} />
          <Route path="/news/archive" element={<ArchivePage />} />
          <Route path="/news/automation" element={<AutomationCenter />} />
          <Route path="/news/profile" element={<UserProfile />} />
          <Route path="/news/organizations" element={<Organizations />} />
          <Route path="/news/activity" element={<ActivityCenter />} />
          <Route path="/news/templates" element={<TemplateLibrary />} />
          <Route path="/news/graphics-templates" element={<ProductionTemplates />} />
          <Route path="/news/prompt-templates" element={<PromptTemplates />} />
          <Route path="/news/security" element={<SecurityCenter />} />
          <Route path="/news/checklist" element={<AcceptanceChecklist />} />
          <Route path="/news/settings" element={<SettingsPage />} />
          <Route path="/news/presentations" element={<Presentations />} />
          <Route path="/news/presentations/:id" element={<RedirectToEditor />} />
          </Route>

          {/* ── Unified Presentations — accessible from any production profile ── */}
          <Route path="/presentations" element={<Presentations />} />
          <Route path="/presentations/:id" element={<RedirectToEditor />} />

          {/* CREAPD Presentation Editor — standalone full-screen */}
          <Route path="/editor" element={<PresentationEditor />} />
          <Route path="/editor/:id" element={<PresentationEditor />} />

        {/* Onboarding & Production Type Selection */}
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/production-types" element={<Navigate to="/" replace />} />

        {/* Podcast Studio — standalone execution cockpit */}
        <Route path="/podcast/studio" element={<TalkLive />} />
        <Route path="/talk/live" element={<TalkLive />} />

        {/* Radio Studio — full-screen live production workspace */}
        <Route path="/music/live" element={<RadioLive />} />

        {/* Music Production */}
        <Route element={<MusicLayout />}>
          <Route path="/music/configure" element={<MusicConfigure />} />
          <Route path="/music/dashboard" element={<MusicDashboard />} />
          <Route path="/music/embed-demo" element={<EmbedDemo />} />
          <Route path="/music/research" element={<MusicResearch />} />
          <Route path="/music/playlist" element={<MusicPlaylist />} />
          <Route path="/music/top10" element={<MusicTop10 />} />
          <Route path="/music/topics" element={<MusicTopics />} />
          <Route path="/music/rundown" element={<MusicRundown />} />
          <Route path="/music/assets" element={<MusicAssets />} />
          <Route path="/music/production-tools" element={<RadioProductionTools />} />
          <Route path="/settings/default-production" element={<DefaultProductionSettings />} />
        </Route>

        {/* Talk Production */}
        <Route element={<TalkLayout />}>
          <Route path="/talk/configure" element={<TalkConfigure />} />
          <Route path="/talk/dashboard" element={<Navigate to="/podcast" replace />} />
          <Route path="/talk/research" element={<TalkResearch />} />
          <Route path="/talk/topics" element={<TalkTopics />} />
          <Route path="/talk/guests" element={<TalkGuests />} />
          <Route path="/talk/rundown" element={<TalkRundown />} />
          <Route path="/talk/assets" element={<TalkAssets />} />
          <Route path="/talk/export" element={<TalkExport />} />
        </Route>

        {/* Research Production Profile */}
        <Route element={<ResearchLayout />}>
          <Route path="/research" element={<RPPLobby />} />
          <Route path="/research/dashboard" element={<Navigate to="/research" replace />} />
          <Route path="/research/configure" element={<ResearchConfigure />} />
          <Route path="/research/topics" element={<ResearchTopics />} />
          <Route path="/research/manager" element={<ResearchManager />} />
          <Route path="/research/dossier" element={<ResearchDossier />} />
          <Route path="/research/assets" element={<ResearchAssets />} />
          <Route path="/research/export" element={<ResearchExport />} />
          <Route path="/research/archive" element={<ResearchArchive />} />
        </Route>

        {/* Spiritual Production */}
        <Route element={<StudioAvailabilityGate studioKey="spiritual" />}>
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
        </Route>

        {/* Admin */}
        <Route path="/admin/world-scripture-registry" element={<WorldScriptureRegistry />} />
        <Route path="/admin/world-scripture-registry/:id" element={<WorldScriptureRegistryDetail />} />
        <Route path="/admin/content-acquisition-engine" element={<ContentAcquisitionEngine />} />
        <Route path="/admin/foundation-seeder" element={<FoundationSeeder />} />
        <Route path="/admin/source-management-center" element={<SourceManagementCenter />} />
        <Route path="/admin/handler-registry" element={<HandlerRegistry />} />
        <Route path="/admin/creap-settings" element={<CreapSettings />} />
        <Route path="/admin/controller-dashboard" element={<ControllerDashboard />} />
        <Route path="/admin/asset-library" element={<AssetLibrary />} />
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
    </Suspense>
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