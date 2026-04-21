import { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Plus, 
  ArrowLeft, 
  Eye, 
  Heart, 
  Share2, 
  Film,
  MoreVertical,
  Trash2,
  EyeOff,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger 
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
import { Badge } from '@/components/ui/badge';
import { CreateShortModal } from '@/components/shorts/CreateShortModal';
import { useShortsStudio } from '@/hooks/useShorts';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

export default function ShortsStudio() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { shorts, analytics, loading, deleteShort, togglePublish } = useShortsStudio();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [shortToDelete, setShortToDelete] = useState<string | null>(null);

  // Redirect if not logged in
  if (!authLoading && !user) {
    navigate('/auth');
    return null;
  }

  const handleDeleteClick = (shortId: string) => {
    setShortToDelete(shortId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (shortToDelete) {
      await deleteShort(shortToDelete);
      setShortToDelete(null);
    }
    setDeleteDialogOpen(false);
  };

  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <>
      <Helmet>
        <title>Shorts Studio | FoundersYard</title>
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/shorts" className="p-2 hover:bg-muted rounded-full">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-xl font-bold">Shorts Studio</h1>
            </div>
            <Button onClick={() => setCreateModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Upload Short
            </Button>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 space-y-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
                    <Eye className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{formatCount(analytics.total_views)}</p>
                    <p className="text-xs text-muted-foreground">Total Views</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30">
                    <Heart className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{formatCount(analytics.total_likes)}</p>
                    <p className="text-xs text-muted-foreground">Total Likes</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
                    <Share2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{formatCount(analytics.total_shares)}</p>
                    <p className="text-xs text-muted-foreground">Total Shares</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/30">
                    <Film className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{analytics.shorts_count}</p>
                    <p className="text-xs text-muted-foreground">Total Shorts</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Your Shorts */}
          <Card>
            <CardHeader>
              <CardTitle>Your Shorts</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="aspect-[9/16] rounded-lg" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  ))}
                </div>
              ) : shorts.length === 0 ? (
                <div className="text-center py-12">
                  <Film className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No shorts yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Share your founder journey with short videos
                  </p>
                  <Button onClick={() => setCreateModalOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Short
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {shorts.map((short) => (
                    <div key={short.id} className="group relative">
                      {/* Thumbnail */}
                      <div className="aspect-[9/16] rounded-lg overflow-hidden bg-muted relative">
                        {short.thumbnail_url ? (
                          <img
                            src={short.thumbnail_url}
                            alt={short.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <video
                            src={short.video_url}
                            className="w-full h-full object-cover"
                            muted
                            preload="metadata"
                          />
                        )}

                        {/* Overlay */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors" />

                        {/* Status badge */}
                        <Badge
                          variant={short.is_published ? 'default' : 'secondary'}
                          className="absolute top-2 left-2"
                        >
                          {short.is_published ? 'Published' : 'Draft'}
                        </Badge>

                        {/* Actions */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 text-white hover:bg-black/70"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => togglePublish(short.id, !short.is_published)}
                            >
                              {short.is_published ? (
                                <>
                                  <EyeOff className="w-4 h-4 mr-2" />
                                  Unpublish
                                </>
                              ) : (
                                <>
                                  <Check className="w-4 h-4 mr-2" />
                                  Publish
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteClick(short.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Stats overlay */}
                        <div className="absolute bottom-2 left-2 right-2 flex items-center gap-3 text-white text-xs">
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {formatCount(short.views_count)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Heart className="w-3 h-3" />
                            {formatCount(short.likes_count)}
                          </span>
                        </div>
                      </div>

                      {/* Info */}
                      <div className="mt-2">
                        <h3 className="font-medium text-sm line-clamp-2">{short.title}</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(short.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </main>

        {/* Modals */}
        <CreateShortModal
          open={createModalOpen}
          onOpenChange={setCreateModalOpen}
        />

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this short?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. The video will be permanently removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
}
