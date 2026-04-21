import { useState, useRef, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { ArrowLeft, Pin, MessageSquare, Eye, Plus, ImagePlus, X, Loader2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { useForumThreads } from '@/hooks/useForums';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export default function ForumCategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const { threads, category, loading, loadingMore, hasMore, loadMore, createThread } = useForumThreads(slug);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [creating, setCreating] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Infinite scroll observer
  useEffect(() => {
    if (!loadMoreRef.current || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, loadMore]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: 'Image too large', description: 'Max size is 5MB', variant: 'destructive' });
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile || !user) return null;
    
    setUploading(true);
    const fileExt = imageFile.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;
    
    const { error } = await supabase.storage
      .from('forum-images')
      .upload(fileName, imageFile);
    
    setUploading(false);
    
    if (error) {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
      return null;
    }
    
    const { data: { publicUrl } } = supabase.storage
      .from('forum-images')
      .getPublicUrl(fileName);
    
    return publicUrl;
  };

  const handleCreateThread = async () => {
    if (!newTitle.trim() || !newContent.trim() || !category) return;
    
    if (!user) {
      toast({ title: 'Please log in', description: 'You need to be logged in to create a thread' });
      navigate('/auth');
      return;
    }
    
    setCreating(true);
    
    let imageUrl: string | undefined;
    if (imageFile) {
      const url = await uploadImage();
      if (url) imageUrl = url;
    }
    
    const { error } = await createThread(newTitle.trim(), newContent.trim(), category.id, imageUrl);
    
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Thread created!' });
      setNewTitle('');
      setNewContent('');
      removeImage();
      setDialogOpen(false);
    }
    setCreating(false);
  };

  const handleNewThreadClick = () => {
    if (!user) {
      toast({ title: 'Please log in', description: 'Join FoundersYard to start discussions' });
      navigate('/auth');
      return;
    }
    setDialogOpen(true);
  };

  // SEO values
  const pageTitle = category ? `${category.name} Forum | FoundersYard` : 'Forum | FoundersYard';
  const pageDescription = category?.description || 'Explore discussions in this forum category on FoundersYard';
  const canonicalUrl = `https://foundersyard.in/forums/${slug}`;

  return (
    <AppLayout>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <link rel="canonical" href={canonicalUrl} />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:image" content="https://foundersyard.in/og-image.png" />
        <meta property="og:site_name" content="FoundersYard" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={canonicalUrl} />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <meta name="twitter:image" content="https://foundersyard.in/og-image.png" />
      </Helmet>
      
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/forums" className="p-2 hover:bg-accent rounded-xl transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{category?.name || 'Loading...'}</h1>
              <p className="text-sm text-muted-foreground">{category?.description}</p>
            </div>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" onClick={handleNewThreadClick}>
                <Plus className="w-4 h-4" />
                New Thread
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create New Thread</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <Input
                  placeholder="Thread title..."
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                />
                <Textarea
                  placeholder="What's on your mind?"
                  value={newContent}
                  onChange={e => setNewContent(e.target.value)}
                  rows={5}
                />
                
                {/* Image Upload */}
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                  
                  {imagePreview ? (
                    <div className="relative rounded-xl overflow-hidden">
                      <img src={imagePreview} alt="Preview" className="w-full max-h-48 object-cover" />
                      <Button
                        size="icon"
                        variant="destructive"
                        className="absolute top-2 right-2 h-8 w-8 rounded-full"
                        onClick={removeImage}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full gap-2"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <ImagePlus className="w-4 h-4" />
                      Add Image (optional)
                    </Button>
                  )}
                </div>
                
                <Button 
                  onClick={handleCreateThread} 
                  disabled={!newTitle.trim() || !newContent.trim() || creating || uploading}
                  className="w-full"
                >
                  {creating || uploading ? 'Creating...' : 'Create Thread'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="skeleton-shimmer h-24 rounded-2xl" />
            ))}
          </div>
        ) : threads.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-2xl border border-border/30">
            <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-foreground mb-2">No threads yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Be the first to start a discussion!</p>
            <Button onClick={handleNewThreadClick}>Create Thread</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {threads.map(thread => (
              <Link
                key={thread.id}
                to={`/forums/${category?.slug}/${thread.slug || thread.id}`}
                className="block bg-card rounded-2xl border border-border/30 p-4 hover:border-border/60 transition-all hover:shadow-md"
              >
                <div className="flex items-start gap-3">
                  <UserAvatar src={thread.author.avatar_url} name={thread.author.full_name} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {thread.is_pinned && (
                        <Pin className="w-4 h-4 text-primary" />
                      )}
                      <h3 className="font-semibold text-foreground hover:text-primary transition-colors line-clamp-1">
                        {thread.title}
                      </h3>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                      {thread.content}
                    </p>
                    {(thread as any).image_url && (
                      <div className="mt-2 rounded-lg overflow-hidden max-h-32">
                        <img 
                          src={(thread as any).image_url} 
                          alt="" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span>{thread.author.full_name}</span>
                      <span>•</span>
                      <span>{formatDistanceToNow(new Date(thread.created_at || ''), { addSuffix: true })}</span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        {thread.replies_count || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {thread.views_count || 0}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}

            {/* Infinite scroll trigger */}
            <div ref={loadMoreRef} className="py-4">
              {loadingMore && (
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Loading more...</span>
                </div>
              )}
              {!hasMore && threads.length > 0 && (
                <p className="text-center text-sm text-muted-foreground">You've seen all threads</p>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
