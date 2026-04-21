import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { 
  ArrowLeft, 
  ThumbsUp, 
  Share2, 
  Bookmark, 
  MoreHorizontal,
  Send,
  Play,
  MessageCircle,
  ChevronDown,
  Bell,
  BellOff,
  Check,
  Copy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { VerifiedBadge } from '@/components/shared/VerifiedBadge';
import { VideoPlayer } from '@/components/stream/VideoPlayer';
import { VideoCardSkeleton } from '@/components/stream/VideoCardSkeleton';
import { useVideoDetail } from '@/hooks/useVideos';
import { useChannel, useSaveVideo } from '@/hooks/useChannel';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

export default function VideoDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { video, comments, relatedVideos, loading, hasLiked, toggleLike, addComment } = useVideoDetail(id || '');
  const { isSubscribed, toggleSubscribe, channel } = useChannel(video?.user_id);
  const { isSaved, toggleSave } = useSaveVideo();
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showAllDescription, setShowAllDescription] = useState(false);
  const [shareClicked, setShareClicked] = useState(false);
  const initialLoadDone = useRef(false);

  // Mark initial load done after first successful load
  useEffect(() => {
    if (!loading && video) {
      initialLoadDone.current = true;
    }
  }, [loading, video]);

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    setSubmitting(true);
    await addComment(commentText);
    setCommentText('');
    setSubmitting(false);
  };

  const formatViews = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    const shareTitle = video?.title || 'Check out this video';
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          url: shareUrl
        });
      } catch (err) {
        // User cancelled or error
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      setShareClicked(true);
      toast.success('Link copied to clipboard');
      setTimeout(() => setShareClicked(false), 2000);
    }
  };

  const handleSave = async () => {
    if (!video) return;
    await toggleSave(video.id);
  };

  // Loading skeleton - only show on initial load
  if (loading && !initialLoadDone.current) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header skeleton */}
        <header className="sticky top-0 z-50 bg-background border-b border-border/40 px-4 h-14 flex items-center gap-4">
          <Skeleton className="w-8 h-8 rounded-full" />
          <Skeleton className="h-6 w-48" />
          <div className="flex-1" />
          <Skeleton className="w-20 h-8 rounded-full" />
        </header>

        <div className="lg:flex lg:gap-6 max-w-[1800px] mx-auto">
          <div className="flex-1 lg:max-w-[1100px]">
            {/* Video skeleton */}
            <Skeleton className="aspect-video w-full" />
            
            <div className="p-4 lg:p-6 space-y-4">
              <Skeleton className="h-7 w-3/4" />
              <div className="flex gap-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="flex gap-3 items-center">
                <Skeleton className="w-12 h-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar skeleton */}
          <aside className="hidden lg:block w-[400px] shrink-0 p-4 space-y-4">
            <Skeleton className="h-6 w-24" />
            {[1, 2, 3, 4].map(i => (
              <VideoCardSkeleton key={i} />
            ))}
          </aside>
        </div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">Video not found</h1>
        <Button onClick={() => navigate('/stream')}>Back to Stream</Button>
      </div>
    );
  }

  // Check if video URL is a direct file or YouTube
  const isDirectVideo = video.video_url && !video.video_url.includes('youtube') && !video.video_url.includes('youtu.be');
  const videoIsSaved = video ? isSaved(video.id) : false;
  const isOwnVideo = user?.id === video.user_id;

  return (
    <>
      <Helmet>
        <title>{video.title} | FY Streams</title>
        <meta name="description" content={video.description || `Build log by ${video.author?.full_name}`} />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header - Always visible */}
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/40 px-4 h-14 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Link to="/stream" className="flex items-center gap-2">
            <img src="/logo.png" alt="FY Streams" className="h-6 w-auto" />
            <span className="hidden sm:inline font-semibold text-foreground">FY Streams</span>
          </Link>
          <div className="flex-1" />
          {user ? (
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/notifications')}
              className="rounded-full"
            >
              <Bell className="w-5 h-5" />
            </Button>
          ) : (
            <Button size="sm" onClick={() => navigate('/auth')} className="rounded-full">
              Sign In
            </Button>
          )}
        </header>

        <div className="lg:flex lg:gap-6 max-w-[1800px] mx-auto">
          {/* Main Content */}
          <div className="flex-1 lg:max-w-[1100px]">
            {/* Video Player Area */}
            <div className="bg-black lg:mx-4 lg:mt-4 lg:rounded-xl overflow-hidden">
              {isDirectVideo ? (
                <VideoPlayer 
                  src={video.video_url!} 
                  poster={video.thumbnail_url || undefined}
                  title={video.title}
                  className="rounded-none lg:rounded-xl"
                />
              ) : video.video_url ? (
                <div className="aspect-video">
                  <iframe
                    src={video.video_url.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                    className="w-full h-full"
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  />
                </div>
              ) : video.thumbnail_url ? (
                <div className="relative aspect-video">
                  <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <div className="w-20 h-20 rounded-full bg-white/90 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform">
                      <Play className="w-8 h-8 text-black fill-black ml-1" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="aspect-video flex items-center justify-center">
                  <Play className="w-16 h-16 text-white/30" />
                </div>
              )}
            </div>

            {/* Video Info */}
            <div className="p-4 lg:p-6 space-y-4">
              {/* Title */}
              <h1 className="text-lg lg:text-xl font-bold text-foreground leading-snug">
                {video.title}
              </h1>

              {/* Stats & Actions Row */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                {/* Stats */}
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    {formatViews(video.views_count)} views
                  </span>
                  <span>•</span>
                  <span>
                    {formatDistanceToNow(new Date(video.created_at), { addSuffix: true })}
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-1">
                  <Button
                    variant={hasLiked ? 'default' : 'secondary'}
                    size="sm"
                    onClick={toggleLike}
                    className="rounded-full gap-1.5"
                  >
                    <ThumbsUp className={cn("w-4 h-4", hasLiked && "fill-current")} />
                    <span>{video.likes_count}</span>
                  </Button>
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="rounded-full gap-1.5"
                    onClick={handleShare}
                  >
                    {shareClicked ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Share2 className="w-4 h-4" />
                    )}
                    <span className="hidden sm:inline">{shareClicked ? 'Copied' : 'Share'}</span>
                  </Button>
                  <Button 
                    variant={videoIsSaved ? 'default' : 'secondary'} 
                    size="sm" 
                    className="rounded-full gap-1.5"
                    onClick={handleSave}
                  >
                    <Bookmark className={cn("w-4 h-4", videoIsSaved && "fill-current")} />
                    <span className="hidden sm:inline">{videoIsSaved ? 'Saved' : 'Save'}</span>
                  </Button>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Author Card */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
                <Link to={`/stream/channel/${video.user_id}`}>
                  <UserAvatar 
                    src={video.author?.avatar_url} 
                    name={video.author?.full_name} 
                    size="md" 
                  />
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <Link 
                      to={`/stream/channel/${video.user_id}`}
                      className="font-semibold text-sm text-foreground hover:underline"
                    >
                      {video.author?.full_name}
                    </Link>
                    {video.author?.is_verified && <VerifiedBadge size="sm" />}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    @{video.author?.username || video.user_id.slice(0, 8)}
                    {channel && ` • ${formatViews(channel.subscribers_count)} subscribers`}
                  </p>
                </div>
                {!isOwnVideo && (
                  <Button 
                    size="sm" 
                    variant={isSubscribed ? 'secondary' : 'default'}
                    className="shrink-0 rounded-full gap-1.5"
                    onClick={toggleSubscribe}
                  >
                    {isSubscribed ? (
                      <>
                        <BellOff className="w-4 h-4" />
                        Subscribed
                      </>
                    ) : (
                      'Subscribe'
                    )}
                  </Button>
                )}
              </div>

              {/* Description */}
              {video.description && (
                <div className="p-3 rounded-xl bg-muted/30">
                  <p className={cn(
                    "text-sm text-foreground whitespace-pre-wrap",
                    !showAllDescription && "line-clamp-3"
                  )}>
                    {video.description}
                  </p>
                  {video.description.length > 150 && (
                    <button 
                      onClick={() => setShowAllDescription(!showAllDescription)}
                      className="text-sm font-medium text-foreground hover:underline mt-2 flex items-center gap-1"
                    >
                      {showAllDescription ? 'Show less' : 'Show more'}
                      <ChevronDown className={cn("w-4 h-4 transition-transform", showAllDescription && "rotate-180")} />
                    </button>
                  )}
                </div>
              )}

              {/* Comments Section */}
              <div className="pt-4 border-t border-border/50">
                <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  {video.comments_count} Comments
                </h2>

                {/* Add Comment */}
                {user ? (
                  <div className="flex gap-3 mb-6">
                    <UserAvatar src={undefined} name={user.email} size="sm" />
                    <div className="flex-1 space-y-2">
                      <Textarea
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Add a comment..."
                        rows={2}
                        className="resize-none"
                      />
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setCommentText('')}
                          disabled={!commentText.trim()}
                        >
                          Cancel
                        </Button>
                        <Button 
                          size="sm"
                          onClick={handleAddComment}
                          disabled={!commentText.trim() || submitting}
                          className="gap-1.5"
                        >
                          <Send className="w-4 h-4" />
                          Comment
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 mb-6 rounded-xl bg-muted/30">
                    <p className="text-sm text-muted-foreground mb-2">Login to comment</p>
                    <Button size="sm" variant="outline" onClick={() => navigate('/auth')}>
                      Sign In
                    </Button>
                  </div>
                )}

                {/* Comments List */}
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <Link to={`/stream/channel/${comment.user_id}`}>
                        <UserAvatar 
                          src={comment.author?.avatar_url} 
                          name={comment.author?.full_name} 
                          size="sm" 
                        />
                      </Link>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Link 
                            to={`/stream/channel/${comment.user_id}`}
                            className="font-medium text-sm text-foreground hover:underline"
                          >
                            {comment.author?.full_name || 'User'}
                          </Link>
                          {comment.author?.is_verified && <VerifiedBadge size="sm" />}
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm text-foreground">{comment.content}</p>
                        <div className="flex items-center gap-3 mt-1.5">
                          <button className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                            <ThumbsUp className="w-3 h-3" />
                            {comment.likes_count || 0}
                          </button>
                          <button className="text-xs text-muted-foreground hover:text-foreground">
                            Reply
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {comments.length === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-8">
                      No comments yet. Be the first to share your thoughts!
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar - Related Videos (Desktop) */}
          <aside className="hidden lg:block w-[400px] shrink-0 p-4 space-y-4">
            <h3 className="font-semibold text-foreground">Up Next</h3>
            {relatedVideos.map((related) => (
              <Link 
                key={related.id}
                to={`/stream/video/${related.id}`}
                className="flex gap-3 group"
              >
                <div className="w-40 aspect-video rounded-xl overflow-hidden bg-muted shrink-0">
                  {related.thumbnail_url ? (
                    <img 
                      src={related.thumbnail_url} 
                      alt={related.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Play className="w-6 h-6 text-muted-foreground/50" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                    {related.title}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {related.author?.full_name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatViews(related.views_count)} views
                  </p>
                </div>
              </Link>
            ))}

            {relatedVideos.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                No related videos yet
              </p>
            )}
          </aside>
        </div>

        {/* Mobile Related Videos */}
        <div className="lg:hidden px-4 py-6 border-t border-border/50">
          <h3 className="font-semibold text-foreground mb-4">Up Next</h3>
          <div className="space-y-4">
            {relatedVideos.slice(0, 5).map((related) => (
              <Link 
                key={related.id}
                to={`/stream/video/${related.id}`}
                className="flex gap-3 group"
              >
                <div className="w-32 sm:w-40 aspect-video rounded-lg overflow-hidden bg-muted shrink-0">
                  {related.thumbnail_url ? (
                    <img 
                      src={related.thumbnail_url} 
                      alt={related.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Play className="w-6 h-6 text-muted-foreground/50" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm text-foreground line-clamp-2">
                    {related.title}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {related.author?.full_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatViews(related.views_count)} views
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
