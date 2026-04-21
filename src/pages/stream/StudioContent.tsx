import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { 
  LayoutDashboard, 
  Video, 
  Settings, 
  Eye, 
  ThumbsUp, 
  MessageCircle,
  PlaySquare,
  Upload,
  ArrowLeft,
  MoreVertical,
  Trash2,
  EyeOff,
  CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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

export default function StudioContent() {
  const { user, loading: authLoading } = useAuth();
  const { videos, loading, deleteVideo, toggleVideoPublish, refetch } = useStudio();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deleteVideoId, setDeleteVideoId] = useState<string | null>(null);

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

  const handleDelete = async () => {
    if (deleteVideoId) {
      await deleteVideo(deleteVideoId);
      setDeleteVideoId(null);
    }
  };

  return (
    <>
      <Helmet>
        <title>Content | Founders Studio</title>
        <meta name="description" content="Manage your videos on FY Streams" />
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
            <h1 className="text-2xl font-bold text-foreground mb-6">Channel Content</h1>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="flex gap-4 p-4 rounded-lg border border-border/50">
                    <Skeleton className="w-40 aspect-video rounded-lg shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : videos.length > 0 ? (
              <div className="space-y-3">
                {videos.map((video) => (
                  <div
                    key={video.id}
                    className="flex gap-4 p-4 rounded-lg border border-border/50 hover:bg-accent/20 transition-colors"
                  >
                    <Link 
                      to={`/stream/video/${video.id}`}
                      className="w-40 aspect-video rounded-lg bg-muted shrink-0 overflow-hidden"
                    >
                      {video.thumbnail_url ? (
                        <img 
                          src={video.thumbnail_url} 
                          alt={video.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <PlaySquare className="w-8 h-8 text-muted-foreground/50" />
                        </div>
                      )}
                    </Link>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2">
                        <Link 
                          to={`/stream/video/${video.id}`}
                          className="font-medium text-foreground hover:text-primary truncate flex-1"
                        >
                          {video.title}
                        </Link>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="shrink-0">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={() => toggleVideoPublish(video.id, !video.is_published)}
                            >
                              {video.is_published ? (
                                <>
                                  <EyeOff className="w-4 h-4 mr-2" />
                                  Unpublish
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Publish
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => setDeleteVideoId(video.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {video.description || 'No description'}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <Badge variant={video.is_published ? 'default' : 'secondary'}>
                          {video.is_published ? 'Published' : 'Draft'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(video.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5" />
                          {video.views_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <ThumbsUp className="w-3.5 h-3.5" />
                          {video.likes_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="w-3.5 h-3.5" />
                          {video.comments_count}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 border border-dashed border-border rounded-xl">
                <PlaySquare className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No videos yet</h3>
                <p className="text-muted-foreground mb-6">Upload your first video to get started</p>
                <Button onClick={() => setCreateModalOpen(true)} className="gap-2">
                  <Upload className="w-4 h-4" />
                  Upload Video
                </Button>
              </div>
            )}
          </main>
        </div>

        <CreateVideoModal 
          open={createModalOpen} 
          onOpenChange={setCreateModalOpen}
          onSuccess={refetch}
        />

        <AlertDialog open={!!deleteVideoId} onOpenChange={() => setDeleteVideoId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete video?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the video and all its data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
}
