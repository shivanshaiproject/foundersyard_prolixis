import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { 
  CheckCircle, 
  XCircle, 
  BadgeCheck,
  Crown,
  Clock,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface VerificationRequest {
  id: string;
  user_id: string;
  badge_type: string;
  reason: string | null;
  status: string;
  rejection_reason: string | null;
  created_at: string;
  reviewed_at: string | null;
  profiles: {
    full_name: string;
    username: string | null;
    avatar_url: string | null;
    is_verified: boolean | null;
    is_vip: boolean | null;
  };
}

export default function AdminVerification() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});

  const fetchRequests = async () => {
    setLoading(true);
    
    // Fetch verification requests first
    const { data: requestsData, error } = await supabase
      .from('verification_requests')
      .select('id, user_id, badge_type, reason, status, rejection_reason, created_at, reviewed_at')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to fetch verification requests');
      setLoading(false);
      return;
    }

    // Fetch profile details for each request
    const requestsWithProfiles = await Promise.all((requestsData || []).map(async (request: any) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, username, avatar_url, is_verified, is_vip')
        .eq('id', request.user_id)
        .maybeSingle();

      return {
        ...request,
        profiles: profile || { full_name: 'Unknown', username: null, avatar_url: null, is_verified: false, is_vip: false }
      };
    }));

    setRequests(requestsWithProfiles as VerificationRequest[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const approveRequest = async (request: VerificationRequest) => {
    // Update the profile with the badge
    const updateData = request.badge_type === 'vip' 
      ? { is_vip: true } 
      : { is_verified: true };

    const { error: profileError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', request.user_id);

    if (profileError) {
      toast.error('Failed to update profile');
      return;
    }

    // Update the request status
    const { error } = await supabase
      .from('verification_requests')
      .update({ 
        status: 'approved',
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', request.id);

    if (error) {
      toast.error('Failed to update request');
    } else {
      toast.success(`${request.badge_type === 'vip' ? 'VIP' : 'Verified'} badge granted!`);
      fetchRequests();
    }
  };

  const rejectRequest = async (request: VerificationRequest) => {
    const reason = rejectionReasons[request.id] || 'Application did not meet requirements';

    const { error } = await supabase
      .from('verification_requests')
      .update({ 
        status: 'rejected',
        rejection_reason: reason,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', request.id);

    if (error) {
      toast.error('Failed to reject request');
    } else {
      toast.success('Request rejected');
      fetchRequests();
    }
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const processedRequests = requests.filter(r => r.status !== 'pending');

  const getBadgeIcon = (type: string) => {
    return type === 'vip' ? <Crown className="w-4 h-4" /> : <BadgeCheck className="w-4 h-4" />;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-700"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge variant="secondary" className="bg-green-100 text-green-700"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="secondary" className="bg-red-100 text-red-700"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const RequestCard = ({ request, showActions = false }: { request: VerificationRequest; showActions?: boolean }) => (
    <Card key={request.id}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <UserAvatar
              src={request.profiles.avatar_url}
              name={request.profiles.full_name}
              size="md"
            />
            <div>
              <p className="font-medium">{request.profiles.full_name}</p>
              <p className="text-sm text-muted-foreground">@{request.profiles.username || 'unknown'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={request.badge_type === 'vip' ? 'border-amber-500 text-amber-600' : 'border-blue-500 text-blue-600'}>
              {getBadgeIcon(request.badge_type)}
              <span className="ml-1">{request.badge_type === 'vip' ? 'VIP' : 'Verified'}</span>
            </Badge>
            {getStatusBadge(request.status)}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {request.reason && (
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium mb-1">Application reason:</p>
            <p className="text-sm text-muted-foreground">{request.reason}</p>
          </div>
        )}

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Submitted: {format(new Date(request.created_at), 'MMM d, yyyy HH:mm')}</span>
          {request.reviewed_at && (
            <span>Reviewed: {format(new Date(request.reviewed_at), 'MMM d, yyyy HH:mm')}</span>
          )}
        </div>

        {request.rejection_reason && (
          <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-300">
              <strong>Rejection reason:</strong> {request.rejection_reason}
            </p>
          </div>
        )}

        {showActions && (
          <div className="space-y-3 pt-2 border-t border-border">
            <Textarea
              placeholder="Rejection reason (optional)..."
              value={rejectionReasons[request.id] || ''}
              onChange={(e) => setRejectionReasons(prev => ({ ...prev, [request.id]: e.target.value }))}
              className="min-h-[60px]"
            />
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => window.open(`/profile/${request.user_id}`, '_blank')}>
                <Eye className="w-4 h-4 mr-1" />
                View Profile
              </Button>
              <Button size="sm" variant="default" className="bg-green-600 hover:bg-green-700" onClick={() => approveRequest(request)}>
                <CheckCircle className="w-4 h-4 mr-1" />
                Approve
              </Button>
              <Button size="sm" variant="destructive" onClick={() => rejectRequest(request)}>
                <XCircle className="w-4 h-4 mr-1" />
                Reject
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Verification Requests</h1>
          <p className="text-muted-foreground mt-1">Review and process badge verification requests</p>
        </div>

        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="w-4 h-4" />
              Pending ({pendingRequests.length})
            </TabsTrigger>
            <TabsTrigger value="processed" className="gap-2">
              <CheckCircle className="w-4 h-4" />
              Processed ({processedRequests.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-6">
            {loading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="h-32 bg-muted rounded" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : pendingRequests.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <BadgeCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium">No pending requests</p>
                  <p className="text-muted-foreground">All verification requests have been processed</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {pendingRequests.map((request) => (
                  <RequestCard key={request.id} request={request} showActions />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="processed" className="mt-6">
            {loading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="h-32 bg-muted rounded" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : processedRequests.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <p className="text-muted-foreground">No processed requests yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {processedRequests.map((request) => (
                  <RequestCard key={request.id} request={request} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
