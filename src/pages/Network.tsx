import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, UserCheck, Clock, Check, X } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { Button } from '@/components/ui/button';
import { useNetworkList, useNetwork } from '@/hooks/useNetwork';
import { EmptyState } from '@/components/shared/EmptyState';
import { useToast } from '@/hooks/use-toast';

export default function NetworkPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'network' | 'requests'>('network');
  const { connections, pendingRequests, loading, fetchConnections } = useNetworkList();

  const handleAccept = async (connectionId: string, requesterId: string) => {
    const { acceptNetworkRequest } = useNetwork(requesterId);
    const { error } = await acceptNetworkRequest(connectionId, requesterId);
    
    if (error) {
      toast({ title: 'Error', description: 'Failed to accept request', variant: 'destructive' });
    } else {
      toast({ title: 'Connected!', description: 'You are now connected' });
      fetchConnections();
    }
  };

  const tabs = [
    { id: 'network' as const, label: 'My Network', icon: Users, count: connections.length },
    { id: 'requests' as const, label: 'Requests', icon: Clock, count: pendingRequests.length },
  ];

  return (
    <AppLayout>
      <div className="p-3 sm:p-4 md:p-6 max-w-2xl mx-auto">
        <h1 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2 mb-4 sm:mb-6">
          <Users className="w-5 h-5" />
          My Network
        </h1>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-4 sm:mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-full font-medium text-xs sm:text-sm transition-all ${
                activeTab === tab.id
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:bg-accent'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden xs:inline">{tab.label}</span>
              <span className="xs:hidden">{tab.id === 'network' ? 'Network' : 'Requests'}</span>
              {tab.count > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                  activeTab === tab.id
                    ? 'bg-background/20 text-background'
                    : 'bg-primary text-primary-foreground'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-card rounded-2xl border border-border/40 p-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-1/2" />
                    <div className="h-3 bg-muted rounded w-1/3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : activeTab === 'network' ? (
          connections.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No connections yet"
              description="Start building your network by connecting with other founders"
            />
          ) : (
            <div className="space-y-2">
              {connections.map((connection) => (
                <div
                  key={connection.id}
                  className="bg-card rounded-2xl border border-border/40 p-4 hover:border-border/60 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="cursor-pointer"
                      onClick={() => navigate(`/profile/${connection.profile?.id}`)}
                    >
                      <UserAvatar
                        src={connection.profile?.avatar_url}
                        name={connection.profile?.full_name || 'User'}
                        size="lg"
                      />
                    </div>
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => navigate(`/profile/${connection.profile?.id}`)}
                    >
                      <p className="font-semibold text-foreground truncate">
                        {connection.profile?.full_name}
                      </p>
                      {connection.profile?.username && (
                        <p className="text-sm text-muted-foreground truncate">
                          @{connection.profile.username}
                        </p>
                      )}
                      {connection.profile?.bio && (
                        <p className="text-sm text-muted-foreground truncate mt-1">
                          {connection.profile.bio}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs sm:text-sm text-success font-medium">
                      <UserCheck className="w-4 h-4" />
                      <span className="hidden sm:inline">Networked</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : pendingRequests.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="No pending requests"
            description="When someone wants to connect, you'll see their request here"
          />
        ) : (
          <div className="space-y-2">
            {pendingRequests.map((request) => (
              <div
                key={request.id}
                className="bg-card rounded-2xl border border-border/40 p-4"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="cursor-pointer"
                    onClick={() => navigate(`/profile/${request.profile?.id}`)}
                  >
                    <UserAvatar
                      src={request.profile?.avatar_url}
                      name={request.profile?.full_name || 'User'}
                      size="lg"
                    />
                  </div>
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => navigate(`/profile/${request.profile?.id}`)}
                  >
                    <p className="font-semibold text-foreground truncate">
                      {request.profile?.full_name}
                    </p>
                    {request.profile?.username && (
                      <p className="text-sm text-muted-foreground truncate">
                        @{request.profile.username}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <Button
                      size="sm"
                      className="rounded-full bg-gradient-primary text-primary-foreground px-2.5 sm:px-3"
                      onClick={() => handleAccept(request.id, request.requester_id)}
                    >
                      <Check className="w-4 h-4 sm:mr-1" />
                      <span className="hidden sm:inline">Accept</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full px-2.5 sm:px-3"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
