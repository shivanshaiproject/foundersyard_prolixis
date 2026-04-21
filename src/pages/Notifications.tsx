import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Heart, MessageCircle, Users, Check, FileText, Loader2, CheckCircle2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { EmptyState } from '@/components/shared/EmptyState';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notifications, loading, markAsRead, markAllAsRead, unreadCount } = useNotifications();
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [acceptedActorIds, setAcceptedActorIds] = useState<Set<string>>(new Set());
  const [checkingAccepted, setCheckingAccepted] = useState(true);

  // Check which network requests have already been accepted
  const checkAcceptedConnections = useCallback(async () => {
    if (!user || notifications.length === 0) {
      setCheckingAccepted(false);
      return;
    }

    const networkRequestNotifs = notifications.filter(n => n.type === 'network_request');
    if (networkRequestNotifs.length === 0) {
      setCheckingAccepted(false);
      return;
    }

    try {
      const actorIds = networkRequestNotifs.map(n => n.actor_id);
      
      // Check if any of these connections are already accepted
      const { data: acceptedConnections } = await supabase
        .from('network_connections')
        .select('requester_id')
        .eq('receiver_id', user.id)
        .eq('status', 'accepted')
        .in('requester_id', actorIds);

      if (acceptedConnections) {
        const acceptedSet = new Set(acceptedConnections.map(c => c.requester_id));
        setAcceptedActorIds(acceptedSet);
      }
    } catch (error) {
      console.error('Error checking accepted connections:', error);
    } finally {
      setCheckingAccepted(false);
    }
  }, [user, notifications]);

  useEffect(() => {
    if (!loading && notifications.length > 0) {
      checkAcceptedConnections();
    } else if (!loading) {
      setCheckingAccepted(false);
    }
  }, [loading, notifications.length, checkAcceptedConnections]);

  useEffect(() => {
    // Mark all as read when page opens
    if (unreadCount > 0) {
      markAllAsRead();
    }
  }, []);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'network_request':
      case 'network_accepted':
        return <Users className="w-4 h-4 text-primary" />;
      case 'like':
        return <Heart className="w-4 h-4 text-destructive" />;
      case 'comment':
        return <MessageCircle className="w-4 h-4 text-blue-500" />;
      case 'mention':
        return <MessageCircle className="w-4 h-4 text-primary" />;
      case 'new_post':
        return <FileText className="w-4 h-4 text-emerald-500" />;
      default:
        return <Bell className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getNotificationText = (type: string, actorName: string) => {
    switch (type) {
      case 'network_request':
        return <><span className="font-semibold">{actorName}</span> wants to connect with you</>;
      case 'network_accepted':
        return <><span className="font-semibold">{actorName}</span> accepted your network request</>;
      case 'like':
        return <><span className="font-semibold">{actorName}</span> liked your post</>;
      case 'comment':
        return <><span className="font-semibold">{actorName}</span> commented on your post</>;
      case 'mention':
        return <><span className="font-semibold">{actorName}</span> mentioned you in a post</>;
      case 'new_post':
        return <><span className="font-semibold">{actorName}</span> shared a new post</>;
      default:
        return <><span className="font-semibold">{actorName}</span> interacted with you</>;
    }
  };

  const handleAcceptNetwork = async (e: React.MouseEvent, notification: typeof notifications[0]) => {
    e.stopPropagation();
    setAcceptingId(notification.id);

    try {
      if (!user) {
        toast.error('Please log in to accept requests');
        return;
      }

      // Update the connection status to 'accepted'
      const { error } = await supabase
        .from('network_connections')
        .update({ 
          status: 'accepted',
          accepted_at: new Date().toISOString()
        })
        .eq('requester_id', notification.actor_id)
        .eq('receiver_id', user.id)
        .eq('status', 'pending');

      if (error) throw error;

      // Create notification for the requester
      await supabase.from('notifications').insert({
        user_id: notification.actor_id,
        actor_id: user.id,
        type: 'network_accepted'
      });

      toast.success('Connection accepted!');
      // Mark this actor as accepted (persists across page visits)
      setAcceptedActorIds(prev => new Set(prev).add(notification.actor_id));
    } catch (error) {
      console.error('Error accepting request:', error);
      toast.error('Failed to accept request');
    } finally {
      setAcceptingId(null);
    }
  };

  const handleNotificationClick = (notification: typeof notifications[0]) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    if (notification.type === 'network_request' || notification.type === 'network_accepted') {
      navigate(`/profile/${notification.actor_id}`);
    } else if (notification.post_id) {
      navigate(`/post/${notification.post_id}`);
    } else {
      navigate(`/profile/${notification.actor_id}`);
    }
  };

  const isConnectionAccepted = (notification: typeof notifications[0]) => {
    return acceptedActorIds.has(notification.actor_id);
  };

  return (
    <AppLayout>
      <div className="p-3 sm:p-4 md:p-6 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h1 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
            <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
            Notifications
          </h1>
          {notifications.some(n => !n.is_read) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-muted-foreground text-xs sm:text-sm h-8 px-2 sm:px-3"
            >
              <Check className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
              <span className="hidden xs:inline">Mark all</span> read
            </Button>
          )}
        </div>

        {loading ? (
          <div className="space-y-2 sm:space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-card rounded-xl sm:rounded-2xl border border-border/40 p-3 sm:p-4 animate-pulse">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 sm:h-4 bg-muted rounded w-3/4" />
                    <div className="h-2 sm:h-3 bg-muted rounded w-1/4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="No notifications yet"
            description="When someone interacts with you, you'll see it here"
          />
        ) : (
          <div className="space-y-1.5 sm:space-y-2">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`bg-card rounded-xl sm:rounded-2xl border border-border/40 p-3 sm:p-4 cursor-pointer transition-all hover:border-border/60 active:scale-[0.99] ${
                  !notification.is_read ? 'bg-primary/5 border-primary/20' : ''
                }`}
              >
                <div className="flex items-start gap-2 sm:gap-3">
                  <div className="relative shrink-0">
                    <UserAvatar
                      src={notification.actor?.avatar_url}
                      name={notification.actor?.full_name || 'User'}
                      size="sm"
                      className="w-8 h-8 sm:w-10 sm:h-10"
                    />
                    <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-card flex items-center justify-center border border-border">
                      {getNotificationIcon(notification.type)}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm text-foreground leading-relaxed">
                      {getNotificationText(
                        notification.type,
                        notification.actor?.full_name || 'Someone'
                      )}
                    </p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  {notification.type === 'network_request' && (
                    isConnectionAccepted(notification) || checkingAccepted ? (
                      checkingAccepted ? (
                        <div className="w-16 h-7 bg-muted rounded animate-pulse shrink-0" />
                      ) : (
                        <div className="flex items-center gap-1 text-xs text-emerald-500 shrink-0">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Accepted</span>
                        </div>
                      )
                    ) : (
                      <Button
                        size="sm"
                        onClick={(e) => handleAcceptNetwork(e, notification)}
                        disabled={acceptingId === notification.id}
                        className="shrink-0 h-7 px-3 text-xs"
                      >
                        {acceptingId === notification.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          'Accept'
                        )}
                      </Button>
                    )
                  )}
                  {!notification.is_read && notification.type !== 'network_request' && (
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-primary shrink-0 mt-1.5 sm:mt-2" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}