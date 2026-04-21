import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Plus, Video, FileText, Clapperboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useCreatorStudio } from '@/hooks/useCreatorStudio';
import { StudioSidebar } from '@/components/creator/StudioSidebar';
import { StudioDashboard } from '@/components/creator/StudioDashboard';
import { StudioContent } from '@/components/creator/StudioContent';
import { StudioAnalytics } from '@/components/creator/StudioAnalytics';
import { CreateShortModal } from '@/components/shorts/CreateShortModal';

export default function FoundersStudio() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [createShortOpen, setCreateShortOpen] = useState(false);
  
  const {
    loading,
    posts,
    threads,
    videos,
    shorts,
    analytics,
    dailyStats,
    deletePost,
    deleteThread,
    deleteVideo,
    deleteShort,
    toggleVideoPublish,
    toggleShortPublish,
    refresh
  } = useCreatorStudio();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  if (authLoading || !user) {
    return (
      <div className="flex h-screen">
        <div className="w-64 bg-card border-r border-border p-4 space-y-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-16 w-full" />
          <div className="space-y-2 mt-8">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </div>
        <div className="flex-1 p-6 space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <StudioSidebar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/" className="flex items-center gap-2">
                <img src="/logo.png" alt="FoundersYard" className="h-8 w-8" />
              </Link>
              <h1 className="text-xl font-semibold">Founders Studio</h1>
            </div>

            <div className="flex items-center gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Create
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate('/feed')}>
                    <FileText className="h-4 w-4 mr-2" />
                    New Post
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/stream/studio')}>
                    <Video className="h-4 w-4 mr-2" />
                    Upload Video
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setCreateShortOpen(true)}>
                    <Clapperboard className="h-4 w-4 mr-2" />
                    Create Short
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Tab Content */}
        <div className="p-6">
          {loading ? (
            <div className="space-y-6">
              <div className="grid grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => (
                  <Skeleton key={i} className="h-24" />
                ))}
              </div>
              <div className="grid grid-cols-2 gap-6">
                <Skeleton className="h-64" />
                <Skeleton className="h-64" />
              </div>
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <StudioDashboard 
                  analytics={analytics} 
                  dailyStats={dailyStats}
                  posts={posts}
                  shorts={shorts}
                />
              )}
              
              {activeTab === 'content' && (
                <StudioContent
                  posts={posts}
                  threads={threads}
                  videos={videos}
                  shorts={shorts}
                  onDeletePost={deletePost}
                  onDeleteThread={deleteThread}
                  onDeleteVideo={deleteVideo}
                  onDeleteShort={deleteShort}
                  onToggleVideoPublish={toggleVideoPublish}
                  onToggleShortPublish={toggleShortPublish}
                />
              )}
              
              {activeTab === 'analytics' && (
                <StudioAnalytics 
                  analytics={analytics} 
                  dailyStats={dailyStats}
                />
              )}
            </>
          )}
        </div>
      </main>

      {/* Create Short Modal */}
      <CreateShortModal 
        open={createShortOpen} 
        onOpenChange={(open) => {
          setCreateShortOpen(open);
          if (!open) refresh();
        }} 
      />
    </div>
  );
}
