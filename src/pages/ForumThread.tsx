import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { ArrowLeft, Send, MoreHorizontal, Pencil, Trash2, Reply, CornerDownRight, ChevronDown, Loader2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { VerifiedBadge } from '@/components/shared/VerifiedBadge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useForumThread, ReplyWithAuthor, ThreadWithAuthor } from '@/hooks/useForums';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;
type ForumCategory = Tables<'forum_categories'>;

// Helper to generate meta description from thread content
const generateMetaDescription = (content: string): string => {
  const cleanContent = content.replace(/\n+/g, ' ').trim();
  if (cleanContent.length <= 160) return cleanContent;
  return cleanContent.substring(0, 157) + '...';
};

function ReplyCard({
  reply,
  depth = 0,
  onReply,
  onEdit,
  onDelete,
  currentUserId,
}: {
  reply: ReplyWithAuthor;
  depth?: number;
  onReply: (parentId: string) => void;
  onEdit: (replyId: string, content: string) => void;
  onDelete: (replyId: string) => void;
  currentUserId?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(reply.content);
  const isOwner = currentUserId === reply.user_id;

  const handleSaveEdit = () => {
    onEdit(reply.id, editContent);
    setEditing(false);
  };

  return (
    <div className={`${depth > 0 ? 'ml-4 sm:ml-6 pl-3 sm:pl-4 border-l-2 border-border/40' : ''}`}>
      <div className="flex gap-2 sm:gap-3 py-3">
        <Link to={`/profile/${reply.author.id}`}>
          <UserAvatar src={reply.author.avatar_url} name={reply.author.full_name} size="sm" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              to={`/profile/${reply.author.id}`}
              className="font-medium text-sm text-foreground hover:underline flex items-center gap-1"
            >
              {reply.author.full_name}
              {reply.author.is_verified && <VerifiedBadge size="sm" />}
            </Link>
            <time className="text-xs text-muted-foreground" dateTime={reply.created_at || ''}>
              {formatDistanceToNow(new Date(reply.created_at || ''), { addSuffix: true })}
            </time>
            {reply.edited_at && (
              <span className="text-xs text-muted-foreground">(edited)</span>
            )}
          </div>

          {editing ? (
            <div className="mt-2 space-y-2">
              <Textarea
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                rows={3}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveEdit}>Save</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-foreground mt-1 break-words">{reply.content}</p>
          )}

          <div className="flex items-center gap-2 mt-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => onReply(reply.id)}
            >
              <Reply className="w-3 h-3 mr-1" />
              Reply
            </Button>

            {isOwner && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => setEditing(true)}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive" onClick={() => onDelete(reply.id)}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>

      {reply.replies && reply.replies.length > 0 && (
        <div>
          {reply.replies.map(childReply => (
            <ReplyCard
              key={childReply.id}
              reply={childReply}
              depth={depth + 1}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ForumThreadPage() {
  const { categorySlug, threadSlug } = useParams<{ categorySlug: string; threadSlug: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Find thread ID from slug
  const [threadId, setThreadId] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    const findThread = async () => {
      if (!threadSlug) return;
      
      let query = supabase
        .from('forum_threads')
        .select('id')
        .eq('slug', threadSlug);
      
      if (categorySlug) {
        query = query.eq('category_slug', categorySlug);
      }

      const { data } = await query.maybeSingle();
      if (data) {
        setThreadId(data.id);
      }
      setInitialLoading(false);
    };
    findThread();
  }, [threadSlug, categorySlug]);

  const { 
    thread, 
    replies, 
    loading, 
    hasMoreReplies, 
    loadingMoreReplies, 
    totalReplies,
    loadMoreReplies,
    createReply, 
    editReply, 
    deleteReply 
  } = useForumThread(threadId || '');

  const [newReply, setNewReply] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isThreadOwner = user?.id === thread?.user_id;

  // SEO values
  const pageTitle = thread ? `${thread.title} | FoundersYard Forums` : 'Forum Thread | FoundersYard';
  const pageDescription = thread ? generateMetaDescription(thread.content) : 'View this discussion on FoundersYard Forums';
  const canonicalUrl = `https://foundersyard.in/forums/${categorySlug}/${threadSlug}`;
  const ogImage = (thread as any)?.image_url || 'https://foundersyard.in/og-image.png';

  const handleReplyClick = (parentId: string) => {
    if (!user) {
      toast({ title: 'Please log in to reply', description: 'Join FoundersYard to participate in discussions' });
      navigate('/auth');
      return;
    }
    setReplyingTo(parentId);
  };

  const handleSubmitReply = async () => {
    if (!newReply.trim() || !thread) return;

    if (!user) {
      toast({ title: 'Please log in to reply', variant: 'destructive' });
      navigate('/auth');
      return;
    }

    setSubmitting(true);
    const { error } = await createReply(newReply.trim(), replyingTo || undefined);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setNewReply('');
      setReplyingTo(null);
    }
    setSubmitting(false);
  };

  const handleEdit = async (replyId: string, content: string) => {
    const { error } = await editReply(replyId, content);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (replyId: string) => {
    const { error } = await deleteReply(replyId);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleDeleteThread = async () => {
    if (!thread) return;
    setDeleting(true);
    
    const { error } = await supabase
      .from('forum_threads')
      .delete()
      .eq('id', thread.id);
    
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Thread deleted' });
      navigate(`/forums/${categorySlug}`);
    }
    setDeleting(false);
  };

  if (initialLoading || (loading && !thread)) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto p-4">
          <div className="skeleton-shimmer h-64 rounded-2xl" />
        </div>
      </AppLayout>
    );
  }

  if (!threadId || !thread) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto p-4 text-center py-12">
          <h1 className="text-xl font-semibold">Thread not found</h1>
          <Link to="/forums" className="text-primary hover:underline mt-2 inline-block">
            Back to Forums
          </Link>
        </div>
      </AppLayout>
    );
  }

  const categoryPath = thread.category?.slug || categorySlug || '';

  return (
    <AppLayout>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <link rel="canonical" href={canonicalUrl} />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="article" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:site_name" content="FoundersYard" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={canonicalUrl} />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <meta name="twitter:image" content={ogImage} />
        
        {/* Article specific */}
        {thread && <meta property="article:author" content={thread.author.full_name} />}
        {thread && <meta property="article:published_time" content={thread.created_at || ''} />}
      </Helmet>
      
      <main className="max-w-4xl mx-auto p-3 sm:p-4 space-y-4 sm:space-y-6">
        <nav className="flex items-center gap-3 sm:gap-4">
          <Link to={`/forums/${categoryPath}`} className="p-2 hover:bg-accent rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <span className="text-sm text-muted-foreground truncate">
            Back to {thread.category?.name || 'Forums'}
          </span>
        </nav>

        {/* Thread Content */}
        <article className="bg-card rounded-2xl border border-border/30 p-4 sm:p-6">
          <div className="flex items-start justify-between mb-4">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">{thread.title}</h1>
            {isThreadOwner && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem 
                    className="text-destructive"
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Thread
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          <div className="flex items-center gap-3 mb-4">
            <Link to={`/profile/${thread.author.id}`}>
              <UserAvatar src={thread.author.avatar_url} name={thread.author.full_name} size="md" />
            </Link>
            <div>
              <Link
                to={`/profile/${thread.author.id}`}
                className="font-medium text-foreground hover:underline flex items-center gap-1"
              >
                {thread.author.full_name}
                {thread.author.is_verified && <VerifiedBadge size="sm" />}
              </Link>
              <time className="text-xs text-muted-foreground" dateTime={thread.created_at || ''}>
                {formatDistanceToNow(new Date(thread.created_at || ''), { addSuffix: true })}
              </time>
            </div>
          </div>

          <p className="text-foreground whitespace-pre-wrap break-words">{thread.content}</p>

          {/* Thread Image */}
          {(thread as any).image_url && (
            <div className="mt-4 rounded-xl overflow-hidden">
              <img 
                src={(thread as any).image_url} 
                alt="Thread attachment" 
                className="w-full max-h-[500px] object-cover"
              />
            </div>
          )}
        </article>

        {/* Delete Thread Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete thread?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete your thread and all its replies. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeleteThread} 
                disabled={deleting}
                className="bg-destructive hover:bg-destructive/90 rounded-xl"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Replies */}
        <section className="bg-card rounded-2xl border border-border/30 p-4 sm:p-6">
          <h2 className="font-semibold text-foreground mb-4">
            {totalReplies || thread.replies_count || 0} Replies
          </h2>

          {replies.length > 0 && (
            <div className="divide-y divide-border/30">
              {replies.map(reply => (
                <ReplyCard
                  key={reply.id}
                  reply={reply}
                  onReply={handleReplyClick}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  currentUserId={user?.id}
                />
              ))}
            </div>
          )}

          {/* Load More Replies Button */}
          {hasMoreReplies && (
            <div className="mt-4 pt-4 border-t border-border/30">
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={loadMoreReplies}
                disabled={loadingMoreReplies}
              >
                {loadingMoreReplies ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    Load {totalReplies - replies.length} more replies
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Reply Composer */}
          <div className="mt-6 pt-4 border-t border-border/30">
            {user ? (
              <>
                {replyingTo && (
                  <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
                    <CornerDownRight className="w-4 h-4" />
                    <span>Replying to a comment</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => setReplyingTo(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
                <div className="flex gap-3">
                  <Textarea
                    placeholder="Write a reply..."
                    value={newReply}
                    onChange={e => setNewReply(e.target.value)}
                    rows={3}
                    className="flex-1"
                  />
                </div>
                <div className="flex justify-end mt-2">
                  <Button onClick={handleSubmitReply} disabled={!newReply.trim() || submitting}>
                    <Send className="w-4 h-4 mr-2" />
                    {submitting ? 'Posting...' : 'Reply'}
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-6">
                <p className="text-muted-foreground mb-3">Join FoundersYard to participate in discussions</p>
                <Button onClick={() => navigate('/auth')}>
                  Sign In to Reply
                </Button>
              </div>
            )}
          </div>
        </section>
      </main>
    </AppLayout>
  );
}
