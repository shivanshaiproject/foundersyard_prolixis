import { useEffect, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ThemeProvider } from "next-themes";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { NetworkStatusBanner } from "@/components/shared/NetworkStatusBanner";
import { SplashScreen } from "@/components/shared/SplashScreen";

// Critical pages - load immediately
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Feed from "./pages/Feed";

// Lazy load other pages for better performance
const Profile = lazy(() => import("./pages/Profile"));
const PostDetail = lazy(() => import("./pages/PostDetail"));
const Explore = lazy(() => import("./pages/Explore"));
const Bookmarks = lazy(() => import("./pages/Bookmarks"));
const Settings = lazy(() => import("./pages/Settings"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Network = lazy(() => import("./pages/Network"));
const Forums = lazy(() => import("./pages/Forums"));
const ForumCategory = lazy(() => import("./pages/ForumCategory"));
const ForumThread = lazy(() => import("./pages/ForumThread"));
const TopicFeed = lazy(() => import("./pages/TopicFeed"));
const About = lazy(() => import("./pages/About"));
const Help = lazy(() => import("./pages/Help"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const CommunityGuidelines = lazy(() => import("./pages/CommunityGuidelines"));
const Features = lazy(() => import("./pages/Features"));
const Events = lazy(() => import("./pages/Events"));
const VIPMembership = lazy(() => import("./pages/VIPMembership"));
const FounderStories = lazy(() => import("./pages/FounderStories"));
const Blog = lazy(() => import("./pages/Blog"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Admin pages
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminContent = lazy(() => import("./pages/admin/AdminContent"));
const AdminReports = lazy(() => import("./pages/admin/AdminReports"));
const AdminVerification = lazy(() => import("./pages/admin/AdminVerification"));
const AdminAds = lazy(() => import("./pages/admin/AdminAds"));
const AdminStrikes = lazy(() => import("./pages/admin/AdminStrikes"));
const AdminShorts = lazy(() => import("./pages/admin/AdminShorts"));
const AdminSafety = lazy(() => import("./pages/admin/AdminSafety"));
const AdminAnnouncements = lazy(() => import("./pages/admin/AdminAnnouncements"));
const AdminAPIKeys = lazy(() => import("./pages/admin/AdminAPIKeys"));
const AdminSwarm = lazy(() => import("./pages/admin/AdminSwarm"));
const AdminSwarmPersonas = lazy(() => import("./pages/admin/AdminSwarmPersonas"));
const AdminSwarmPosts = lazy(() => import("./pages/admin/AdminSwarmPosts"));
const AdminSwarmComments = lazy(() => import("./pages/admin/AdminSwarmComments"));

// Ads pages
const AdsDashboardPage = lazy(() => import("./pages/ads/AdsDashboard"));
const CreateCampaignPage = lazy(() => import("./pages/ads/CreateCampaign"));
const CreateCPCCampaignPage = lazy(() => import("./pages/ads/CreateCPCCampaign"));
const CreateCPMCampaignPage = lazy(() => import("./pages/ads/CreateCPMCampaign"));
const AdsWalletPage = lazy(() => import("./pages/ads/AdsWallet"));
const AdsCampaignsPage = lazy(() => import("./pages/ads/AdsCampaigns"));
const AdAnalyticsPage = lazy(() => import("./pages/ads/AdAnalytics"));

// FounderStream pages
const StreamFeed = lazy(() => import("./pages/stream/StreamFeed"));
const VideoDetail = lazy(() => import("./pages/stream/VideoDetail"));
const Channel = lazy(() => import("./pages/stream/Channel"));
const Studio = lazy(() => import("./pages/stream/Studio"));
const StudioContent = lazy(() => import("./pages/stream/StudioContent"));
const StudioChannel = lazy(() => import("./pages/stream/StudioChannel"));

// Shorts pages
const ShortsFeed = lazy(() => import("./pages/shorts/ShortsFeed"));
const ShortsStudio = lazy(() => import("./pages/shorts/ShortsStudio"));

// Creator Studio
const FoundersStudio = lazy(() => import("./pages/creator/FoundersStudio"));

// Products
const Products = lazy(() => import("./pages/Products"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const SubmitProduct = lazy(() => import("./pages/SubmitProduct"));

// Sitemap
const Sitemap = lazy(() => import("./pages/Sitemap"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Welcome = lazy(() => import("./pages/Welcome"));
const ChooseUsername = lazy(() => import("./pages/ChooseUsername"));

// AdminRoute component (needs to be imported, not lazy)
import { AdminRoute } from "./components/admin/AdminRoute";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, sessionRestored, profile } = useAuth();
  const location = useLocation();

  if (!sessionRestored) {
    return <SplashScreen />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Username gate: if profile has no username, redirect to choose-username
  // Skip if already on choose-username or welcome
  const isOnboardingRoute = location.pathname === '/choose-username' || location.pathname === '/welcome';
  if (profile && !isOnboardingRoute) {
    if (!profile.username || profile.username.trim() === '') {
      return <Navigate to="/choose-username" replace />;
    }
    if (!(profile as any).has_onboarded) {
      return <Navigate to="/welcome" replace />;
    }
  }

  return <>{children}</>;
}

// Skeleton loading component instead of spinner
function PageSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="h-14 border-b border-border/40 bg-card animate-pulse" />
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-card rounded-2xl border border-border/40 p-4 animate-pulse">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-1/3" />
                <div className="h-3 bg-muted rounded w-1/4" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded w-full" />
              <div className="h-4 bg-muted rounded w-3/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PageLoader() {
  return <SplashScreen />;
}

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/features" element={<Features />} />
        <Route path="/events" element={<Events />} />
        <Route path="/vip" element={<VIPMembership />} />
        <Route path="/stories" element={<FounderStories />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/about" element={<About />} />
        <Route path="/help" element={<Help />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/guidelines" element={<CommunityGuidelines />} />
        {/* Public routes - allow guest browsing */}
        <Route path="/feed" element={<Feed />} />
        <Route path="/explore" element={<Suspense fallback={<PageLoader />}><Explore /></Suspense>} />
        <Route path="/post/:slug" element={<PostDetail />} />
        <Route
          path="/profile/:id"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/bookmarks"
          element={
            <ProtectedRoute>
              <Bookmarks />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <Notifications />
            </ProtectedRoute>
          }
        />
        <Route
          path="/network"
          element={
            <ProtectedRoute>
              <Network />
            </ProtectedRoute>
          }
        />
        {/* Public forum routes for SEO */}
        <Route path="/forums" element={<Forums />} />
        <Route path="/forums/:slug" element={<ForumCategory />} />
        <Route path="/forums/:categorySlug/:threadSlug" element={<ForumThread />} />
        <Route
          path="/topic/:category"
          element={<ProtectedRoute><TopicFeed /></ProtectedRoute>}
        />
        {/* Admin Routes */}
        <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
        <Route path="/admin/content" element={<AdminRoute><AdminContent /></AdminRoute>} />
        <Route path="/admin/reports" element={<AdminRoute><AdminReports /></AdminRoute>} />
        <Route path="/admin/verification" element={<AdminRoute><AdminVerification /></AdminRoute>} />
        <Route path="/admin/ads" element={<AdminRoute><AdminAds /></AdminRoute>} />
        <Route path="/admin/strikes" element={<AdminRoute><AdminStrikes /></AdminRoute>} />
        <Route path="/admin/shorts" element={<AdminRoute><AdminShorts /></AdminRoute>} />
        <Route path="/admin/safety" element={<AdminRoute><AdminSafety /></AdminRoute>} />
        <Route path="/admin/announcements" element={<AdminRoute><AdminAnnouncements /></AdminRoute>} />
        <Route path="/admin/api-keys" element={<AdminRoute><AdminAPIKeys /></AdminRoute>} />
        <Route path="/admin/swarm" element={<AdminRoute><AdminSwarm /></AdminRoute>} />
        <Route path="/admin/swarm/personas" element={<AdminRoute><AdminSwarmPersonas /></AdminRoute>} />
        <Route path="/admin/swarm/posts" element={<AdminRoute><AdminSwarmPosts /></AdminRoute>} />
        <Route path="/admin/swarm/comments" element={<AdminRoute><AdminSwarmComments /></AdminRoute>} />
        
        {/* Ads Routes */}
        <Route path="/ads/dashboard" element={<AdsDashboardPage />} />
        <Route path="/ads/create" element={<CreateCampaignPage />} />
        <Route path="/ads/create/cpc" element={<CreateCPCCampaignPage />} />
        <Route path="/ads/create/cpm" element={<CreateCPMCampaignPage />} />
        <Route path="/ads/wallet" element={<AdsWalletPage />} />
        <Route path="/ads/campaigns" element={<AdsCampaignsPage />} />
        <Route path="/ads/campaigns/:adId" element={<AdAnalyticsPage />} />
        
        {/* FounderStream Routes */}
        <Route path="/stream" element={<StreamFeed />} />
        <Route path="/stream/video/:id" element={<VideoDetail />} />
        <Route path="/stream/channel/:userId" element={<Channel />} />
        <Route path="/stream/studio" element={<ProtectedRoute><Studio /></ProtectedRoute>} />
        <Route path="/stream/studio/content" element={<ProtectedRoute><StudioContent /></ProtectedRoute>} />
        <Route path="/stream/studio/channel" element={<ProtectedRoute><StudioChannel /></ProtectedRoute>} />
        
        {/* Shorts Routes */}
        <Route path="/shorts" element={<Suspense fallback={<PageLoader />}><ShortsFeed /></Suspense>} />
        <Route path="/shorts/:shortId" element={<Suspense fallback={<PageLoader />}><ShortsFeed /></Suspense>} />
        <Route path="/shorts/studio" element={<Navigate to="/creator/studio" replace />} />
        
        {/* Products Routes */}
        <Route path="/products" element={<Products />} />
        <Route path="/products/new" element={<ProtectedRoute><SubmitProduct /></ProtectedRoute>} />
        <Route path="/products/:slug" element={<ProductDetail />} />
        
        {/* Creator Studio */}
        <Route path="/creator/studio" element={<ProtectedRoute><FoundersStudio /></ProtectedRoute>} />
        
        {/* Onboarding Routes - protected but skip onboarding guard */}
        <Route path="/choose-username" element={<ProtectedRoute><ChooseUsername /></ProtectedRoute>} />
        <Route path="/welcome" element={<ProtectedRoute><Welcome /></ProtectedRoute>} />
        
        {/* Sitemap */}
        <Route path="/sitemap.xml" element={<Sitemap />} />
        
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

const App = () => (
  <ErrorBoundary>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <NetworkStatusBanner />
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <AppRoutes />
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </ErrorBoundary>
);

export default App;
