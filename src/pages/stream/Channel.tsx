import { Link, useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { ArrowLeft, Play, Users, ExternalLink, Bell, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { VerifiedBadge } from '@/components/shared/VerifiedBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { useChannel } from '@/hooks/useChannel';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

export default function Channel() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { channel, videos, loading, isSubscribed, toggleSubscribe } = useChannel(userId);

  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/40 px-4 h-14 flex items-center gap-3">
          <Skeleton className="w-8 h-8 rounded-full" />
          <Skeleton className="h-6 w-32" />
        </header>
        <Skeleton className="w-full h-48" />
        <div className="p-6">
          <div className="flex gap-4 items-start">
            <Skeleton className="w-20 h-20 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!channel && !loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">Channel not found</h1>
        <Button onClick={() => navigate('/stream')}>Back to Stream</Button>
      </div>
    );
  }

  const displayName = channel?.channel_name || channel?.profile?.full_name || 'Channel';
  const username = channel?.profile?.username || userId?.slice(0, 8);
  const isOwnChannel = user?.id === userId;

  return (
    <>
      <Helmet>
        <title>{displayName} | FY Streams</title>
        <meta name="description" content={channel?.channel_description || `Watch videos from ${displayName} on FY Streams`} />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/40 px-4 h-14 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Link to="/stream" className="flex items-center gap-2">
            <img src="/logo.png" alt="FY Streams" className="h-6 w-auto" />
            <span className="hidden sm:inline font-semibold text-foreground">FY Streams</span>
          </Link>
          <div className="flex-1" />
          {!user && (
            <Button size="sm" onClick={() => navigate('/auth')} className="rounded-full">
              Sign In
            </Button>
          )}
        </header>

        {/* Banner */}
        <div className="w-full h-32 sm:h-48 bg-gradient-to-br from-primary/20 via-primary/10 to-muted overflow-hidden">
          {channel?.banner_url && (
            <img 
              src={channel.banner_url} 
              alt="Channel banner" 
              className="w-full h-full object-cover"
            />
          )}
        </div>

        {/* Channel Info */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 -mt-10 sm:-mt-12 relative z-10">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
            {/* Avatar */}
            <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full border-4 border-background overflow-hidden bg-muted">
              <UserAvatar 
                src={channel?.profile?.avatar_url} 
                name={displayName}
                size="lg"
                className="w-full h-full"
              />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 pb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                  {displayName}
                </h1>
                {(channel?.is_verified || channel?.profile?.is_verified) && (
                  <VerifiedBadge size="md" />
                )}
              </div>
              <p className="text-sm text-muted-foreground">@{username}</p>
              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {formatCount(channel?.subscribers_count || 0)} subscribers
                </span>
                <span>•</span>
                <span>{videos.length} videos</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 w-full sm:w-auto">
              {isOwnChannel ? (
                <Button 
                  variant="secondary" 
                  onClick={() => navigate('/stream/studio/channel')}
                  className="rounded-full flex-1 sm:flex-none"
                >
                  Customize channel
                </Button>
              ) : (
                <Button 
                  variant={isSubscribed ? 'secondary' : 'default'}
                  onClick={toggleSubscribe}
                  className="rounded-full flex-1 sm:flex-none gap-2"
                >
                  {isSubscribed ? (
                    <>
                      <BellOff className="w-4 h-4" />
                      Subscribed
                    </>
                  ) : (
                    <>
                      <Bell className="w-4 h-4" />
                      Subscribe
                    </>
                  )}
                </Button>
              )}
              <Button 
                variant="outline" 
                onClick={() => navigate(`/profile/${userId}`)}
                className="rounded-full gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                <span className="hidden sm:inline">FoundersYard Profile</span>
              </Button>
            </div>
          </div>

          {/* Description */}
          {channel?.channel_description && (
            <p className="mt-4 text-sm text-muted-foreground max-w-2xl">
              {channel.channel_description}
            </p>
          )}
        </div>

        {/* Videos Section */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          <h2 className="text-lg font-semibold text-foreground mb-4">Videos</h2>
          
          {videos.length === 0 ? (
            <div className="text-center py-16 bg-muted/30 rounded-xl">
              <Play className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground">No videos yet</p>
              {isOwnChannel && (
                <Button 
                  className="mt-4 rounded-full"
                  onClick={() => navigate('/stream/studio')}
                >
                  Upload your first video
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {videos.map((video) => (
                <Link
                  key={video.id}
                  to={`/stream/video/${video.id}`}
                  className="group"
                >
                  <div className="aspect-video rounded-xl overflow-hidden bg-muted mb-2">
                    {video.thumbnail_url ? (
                      <img 
                        src={video.thumbnail_url}
                        alt={video.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Play className="w-10 h-10 text-muted-foreground/50" />
                      </div>
                    )}
                  </div>
                  <h3 className="font-medium text-sm text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                    {video.title}
                  </h3>
                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                    <span>{formatCount(video.views_count)} views</span>
                    <span>•</span>
                    <span>{formatDistanceToNow(new Date(video.created_at), { addSuffix: true })}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
