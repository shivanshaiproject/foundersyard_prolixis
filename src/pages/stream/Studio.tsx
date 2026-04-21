import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { 
  LayoutDashboard, 
  Video, 
  Settings, 
  Eye, 
  ThumbsUp, 
  Users,
  PlaySquare,
  Upload,
  ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CreateVideoModal } from '@/components/stream/CreateVideoModal';
import { useAuth } from '@/hooks/useAuth';
import { useStudio } from '@/hooks/useStudio';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/stream/studio' },
  { icon: Video, label: 'Content', href: '/stream/studio/content' },
  { icon: Settings, label: 'Channel', href: '/stream/studio/channel' },
];

export default function Studio() {
  const { user, loading: authLoading } = useAuth();
  const { videos, stats, loading, refetch } = useStudio();
  const [createModalOpen, setCreateModalOpen] = useState(false);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const recentVideos = videos.slice(0, 5);

  return (
    <>
      <Helmet>
        <title>Founders Studio | FY Streams</title>
        <meta name="description" content="Manage your videos and channel on FY Streams" />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/40 px-4 h-14 flex items-center gap-4">
          <Link to="/stream" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Back to Stream</span>
          </Link>
          <div className="flex-1" />
          <span className="font-semibold text-foreground">Founders Studio</span>
          <div className="flex-1" />
          <Button onClick={() => setCreateModalOpen(true)} size="sm" className="gap-2">
            <Upload className="w-4 h-4" />
            Upload
          </Button>
        </header>

        <div className="flex">
          {/* Sidebar */}
          <aside className="w-56 shrink-0 hidden md:block border-r border-border/40">
            <nav className="p-2 space-y-1 sticky top-14">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                      isActive 
                        ? "bg-accent text-foreground font-medium" 
                        : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-sm">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 p-6">
            <h1 className="text-2xl font-bold text-foreground mb-6">Dashboard</h1>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {loading ? (
                <>
                  {[1, 2, 3, 4].map(i => (
                    <Card key={i}>
                      <CardHeader className="pb-2">
                        <Skeleton className="h-4 w-20" />
                      </CardHeader>
                      <CardContent>
                        <Skeleton className="h-8 w-16" />
                      </CardContent>
                    </Card>
                  ))}
                </>
              ) : (
                <>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Total Views</CardTitle>
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.totalViews.toLocaleString()}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Total Likes</CardTitle>
                      <ThumbsUp className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.totalLikes.toLocaleString()}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Subscribers</CardTitle>
                      <Users className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.subscriberCount.toLocaleString()}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Videos</CardTitle>
                      <PlaySquare className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.totalVideos}</div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>

            {/* Recent Videos */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">Recent Videos</h2>
                <Link to="/stream/studio/content" className="text-sm text-primary hover:underline">
                  View all
                </Link>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex gap-4 p-3 rounded-lg border border-border/50">
                      <Skeleton className="w-32 aspect-video rounded-lg shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentVideos.length > 0 ? (
                <div className="space-y-3">
                  {recentVideos.map((video) => (
                    <Link
                      key={video.id}
                      to={`/stream/video/${video.id}`}
                      className="flex gap-4 p-3 rounded-lg border border-border/50 hover:bg-accent/30 transition-colors"
                    >
                      <div className="w-32 aspect-video rounded-lg bg-muted shrink-0 overflow-hidden">
                        {video.thumbnail_url ? (
                          <img 
                            src={video.thumbnail_url} 
                            alt={video.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <PlaySquare className="w-6 h-6 text-muted-foreground/50" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-foreground truncate">{video.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {video.is_published ? 'Published' : 'Draft'} • {formatDistanceToNow(new Date(video.created_at), { addSuffix: true })}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Eye className="w-3.5 h-3.5" />
                            {video.views_count}
                          </span>
                          <span className="flex items-center gap-1">
                            <ThumbsUp className="w-3.5 h-3.5" />
                            {video.likes_count}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 border border-dashed border-border rounded-xl">
                  <PlaySquare className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <h3 className="font-medium text-foreground mb-1">No videos yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">Upload your first video to get started</p>
                  <Button onClick={() => setCreateModalOpen(true)} className="gap-2">
                    <Upload className="w-4 h-4" />
                    Upload Video
                  </Button>
                </div>
              )}
            </div>
          </main>
        </div>

        <CreateVideoModal 
          open={createModalOpen} 
          onOpenChange={setCreateModalOpen}
          onSuccess={refetch}
        />
      </div>
    </>
  );
}
