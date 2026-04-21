import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { 
  Check, 
  X, 
  ExternalLink, 
  Loader2, 
  Megaphone,
  MousePointer2,
  Eye,
  Calendar,
  Clock,
  MoreHorizontal,
  Pause,
  Play,
  Trash2,
  RotateCcw,
  Ban,
  DollarSign,
  BarChart3,
  ZoomIn
} from 'lucide-react';
import { format } from 'date-fns';

interface Ad {
  id: string;
  headline: string;
  image_url: string | null;
  destination_url: string;
  ad_type: string;
  billing_type: string;
  cpc_bid: number | null;
  cpm_rate: number | null;
  daily_budget: number;
  daily_spend: number;
  total_spend: number;
  total_clicks: number;
  impressions_count: number;
  impressions_limit: number | null;
  cpm_spent: number;
  status: string;
  scheduled_at: string | null;
  created_at: string;
  advertiser_id: string;
  rejection_reason: string | null;
}

interface AdvertiserProfile {
  id: string;
  company_name: string | null;
  user_id: string;
}

export default function AdminAds() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [advertisers, setAdvertisers] = useState<Record<string, AdvertiserProfile>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedAdId, setSelectedAdId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewAd, setPreviewAd] = useState<Ad | null>(null);

  useEffect(() => {
    fetchAds();
  }, []);

  const fetchAds = async () => {
    setLoading(true);
    try {
      const { data: adsData, error: adsError } = await supabase
        .from('ads')
        .select('*')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (adsError) throw adsError;
      setAds(adsData || []);

      // Fetch advertiser profiles
      const advertiserIds = [...new Set((adsData || []).map((ad) => ad.advertiser_id))];
      if (advertiserIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('advertiser_profiles')
          .select('*')
          .in('id', advertiserIds);

        const profilesMap: Record<string, AdvertiserProfile> = {};
        (profilesData || []).forEach((p) => {
          profilesMap[p.id] = p as AdvertiserProfile;
        });
        setAdvertisers(profilesMap);
      }
    } catch (error) {
      console.error('Error fetching ads:', error);
      toast.error('Failed to load ads');
    } finally {
      setLoading(false);
    }
  };

  const updateAdStatus = async (adId: string, status: string, rejectionReason?: string) => {
    setProcessing(adId);
    try {
      const updateData: any = { status };
      if (rejectionReason !== undefined) {
        updateData.rejection_reason = rejectionReason;
      }
      
      const { error } = await supabase
        .from('ads')
        .update(updateData)
        .eq('id', adId);

      if (error) throw error;
      
      setAds((prev) =>
        prev.map((ad) => (ad.id === adId ? { ...ad, ...updateData } : ad))
      );
      return true;
    } catch (error) {
      console.error('Error updating ad:', error);
      toast.error('Failed to update ad');
      return false;
    } finally {
      setProcessing(null);
    }
  };

  const approveAd = async (adId: string, scheduledAt: string | null) => {
    const newStatus = scheduledAt ? 'scheduled' : 'active';
    const success = await updateAdStatus(adId, newStatus);
    if (success) {
      toast.success('Ad approved successfully');
    }
  };

  const openRejectDialog = (adId: string) => {
    setSelectedAdId(adId);
    setRejectionReason('');
    setRejectDialogOpen(true);
  };

  const rejectAd = async () => {
    if (!selectedAdId) return;
    
    const success = await updateAdStatus(selectedAdId, 'rejected', rejectionReason || null);
    if (success) {
      setRejectDialogOpen(false);
      toast.success('Ad rejected');
    }
  };

  const pauseAd = async (adId: string) => {
    const success = await updateAdStatus(adId, 'paused');
    if (success) {
      toast.success('Ad paused');
    }
  };

  const resumeAd = async (adId: string) => {
    const success = await updateAdStatus(adId, 'active');
    if (success) {
      toast.success('Ad resumed');
    }
  };

  const revokeApproval = async (adId: string) => {
    const success = await updateAdStatus(adId, 'pending_approval');
    if (success) {
      toast.success('Ad approval revoked - moved to pending');
    }
  };

  const deleteAd = async (adId: string) => {
    setProcessing(adId);
    try {
      const { error } = await supabase
        .from('ads')
        .update({ is_deleted: true })
        .eq('id', adId);

      if (error) throw error;
      
      setAds((prev) => prev.filter((ad) => ad.id !== adId));
      toast.success('Ad deleted');
    } catch (error) {
      console.error('Error deleting ad:', error);
      toast.error('Failed to delete ad');
    } finally {
      setProcessing(null);
    }
  };

  const openPreviewDialog = (ad: Ad) => {
    setPreviewAd(ad);
    setPreviewDialogOpen(true);
  };

  const getFilteredAds = (status: string) => {
    if (status === 'all') return ads;
    if (status === 'pending') return ads.filter((ad) => ad.status === 'pending_approval');
    if (status === 'approved') return ads.filter((ad) => ['active', 'scheduled', 'paused', 'exhausted'].includes(ad.status));
    return ads.filter((ad) => ad.status === status);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_approval':
        return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">Pending</Badge>;
      case 'active':
        return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Active</Badge>;
      case 'scheduled':
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Scheduled</Badge>;
      case 'paused':
        return <Badge className="bg-gray-500/10 text-gray-500 border-gray-500/20">Paused</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Rejected</Badge>;
      case 'exhausted':
        return <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20">Exhausted</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getBillingBadge = (billingType: string) => {
    if (billingType === 'cpm') {
      return (
        <Badge variant="outline" className="gap-1">
          <Eye className="w-3 h-3" />
          CPM
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="gap-1">
        <MousePointer2 className="w-3 h-3" />
        CPC
      </Badge>
    );
  };

  const renderAdCard = (ad: Ad) => {
    const advertiser = advertisers[ad.advertiser_id];
    const isPending = ad.status === 'pending_approval';
    const isRejected = ad.status === 'rejected';
    const isActive = ad.status === 'active';
    const isPaused = ad.status === 'paused';
    const isApproved = ['active', 'scheduled', 'paused', 'exhausted'].includes(ad.status);

    return (
      <Card key={ad.id} className="overflow-hidden">
        <CardContent className="p-4">
          <div className="flex gap-4">
            {/* Ad Image - Larger and clickable */}
            <div 
              className="relative shrink-0 cursor-pointer group"
              onClick={() => openPreviewDialog(ad)}
            >
              {ad.image_url ? (
                <img
                  src={ad.image_url}
                  alt=""
                  className="w-32 h-32 sm:w-40 sm:h-40 rounded-lg object-cover"
                />
              ) : (
                <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-lg bg-muted flex items-center justify-center">
                  <Megaphone className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                <ZoomIn className="w-6 h-6 text-white" />
              </div>
            </div>

            {/* Ad Details */}
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold line-clamp-2">{ad.headline}</h3>
                  <a
                    href={ad.destination_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 mt-1"
                  >
                    <ExternalLink className="w-3 h-3 shrink-0" />
                    <span className="truncate">{new URL(ad.destination_url).hostname}</span>
                  </a>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {getStatusBadge(ad.status)}
                  {/* Admin Actions Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {/* For Active ads */}
                      {isActive && (
                        <DropdownMenuItem onClick={() => pauseAd(ad.id)} disabled={processing === ad.id}>
                          <Pause className="w-4 h-4 mr-2" />
                          Pause Ad
                        </DropdownMenuItem>
                      )}
                      {/* For Paused ads */}
                      {isPaused && (
                        <DropdownMenuItem onClick={() => resumeAd(ad.id)} disabled={processing === ad.id}>
                          <Play className="w-4 h-4 mr-2" />
                          Resume Ad
                        </DropdownMenuItem>
                      )}
                      {/* For Pending ads - Approve/Reject */}
                      {isPending && (
                        <>
                          <DropdownMenuItem onClick={() => approveAd(ad.id, ad.scheduled_at)} disabled={processing === ad.id}>
                            <Check className="w-4 h-4 mr-2" />
                            Approve
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openRejectDialog(ad.id)} disabled={processing === ad.id}>
                            <X className="w-4 h-4 mr-2" />
                            Reject
                          </DropdownMenuItem>
                        </>
                      )}
                      {/* For Rejected ads - Re-review option */}
                      {isRejected && (
                        <DropdownMenuItem onClick={() => revokeApproval(ad.id)} disabled={processing === ad.id}>
                          <RotateCcw className="w-4 h-4 mr-2" />
                          Move to Pending
                        </DropdownMenuItem>
                      )}
                      {/* Revoke approval for approved ads */}
                      {isApproved && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => revokeApproval(ad.id)} disabled={processing === ad.id}>
                            <Ban className="w-4 h-4 mr-2" />
                            Revoke Approval
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuSeparator />
                      {/* Delete for all */}
                      <DropdownMenuItem 
                        onClick={() => deleteAd(ad.id)} 
                        disabled={processing === ad.id}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Ad
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                {getBillingBadge(ad.billing_type || 'cpc')}
                {advertiser?.company_name && (
                  <span className="text-muted-foreground">
                    by {advertiser.company_name}
                  </span>
                )}
              </div>

              {/* Stats Row */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(ad.created_at), 'MMM d, yyyy')}
                </span>
                {ad.scheduled_at && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Scheduled: {format(new Date(ad.scheduled_at), 'MMM d, yyyy HH:mm')}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  Budget: ₹{(ad.daily_budget / 100).toLocaleString('en-IN')}
                </span>
                {ad.billing_type === 'cpm' ? (
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {ad.impressions_count.toLocaleString('en-IN')} / {(ad.impressions_limit || 0).toLocaleString('en-IN')} impressions
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <MousePointer2 className="w-3 h-3" />
                    {ad.total_clicks} clicks
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <BarChart3 className="w-3 h-3" />
                  Spent: ₹{((ad.billing_type === 'cpm' ? ad.cpm_spent : ad.total_spend) / 100).toLocaleString('en-IN')}
                </span>
              </div>

              {/* Rejection reason if rejected */}
              {isRejected && ad.rejection_reason && (
                <div className="text-xs text-red-500 bg-red-500/10 rounded-md px-2 py-1">
                  <strong>Rejection reason:</strong> {ad.rejection_reason}
                </div>
              )}

              {/* Quick Actions for pending ads */}
              {isPending && (
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    size="sm"
                    onClick={() => approveAd(ad.id, ad.scheduled_at)}
                    disabled={processing === ad.id}
                  >
                    {processing === ad.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-1" />
                        Approve
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => openRejectDialog(ad.id)}
                    disabled={processing === ad.id}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Reject
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const pendingCount = ads.filter((ad) => ad.status === 'pending_approval').length;
  const approvedCount = ads.filter((ad) => ['active', 'scheduled', 'paused', 'exhausted'].includes(ad.status)).length;
  const rejectedCount = ads.filter((ad) => ad.status === 'rejected').length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
            <Megaphone className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Ad Campaigns</h1>
            <p className="text-muted-foreground">Review, approve, and manage all ad campaigns</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex-wrap">
            <TabsTrigger value="pending" className="gap-1">
              Pending
              {pendingCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {pendingCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="approved">Approved ({approvedCount})</TabsTrigger>
            <TabsTrigger value="rejected">Rejected ({rejectedCount})</TabsTrigger>
            <TabsTrigger value="all">All ({ads.length})</TabsTrigger>
          </TabsList>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <TabsContent value="pending" className="space-y-4">
                {getFilteredAds('pending').length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    No pending ads to review
                  </div>
                ) : (
                  getFilteredAds('pending').map(renderAdCard)
                )}
              </TabsContent>

              <TabsContent value="approved" className="space-y-4">
                {getFilteredAds('approved').length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    No approved ads
                  </div>
                ) : (
                  getFilteredAds('approved').map(renderAdCard)
                )}
              </TabsContent>

              <TabsContent value="rejected" className="space-y-4">
                {getFilteredAds('rejected').length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    No rejected ads
                  </div>
                ) : (
                  getFilteredAds('rejected').map(renderAdCard)
                )}
              </TabsContent>

              <TabsContent value="all" className="space-y-4">
                {ads.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    No ads found
                  </div>
                ) : (
                  ads.map(renderAdCard)
                )}
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Ad</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this ad. This will be shown to the advertiser.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Rejection Reason</Label>
              <Textarea
                id="reason"
                placeholder="Enter reason for rejection..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={rejectAd} disabled={!!processing}>
              {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Reject Ad'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Full Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Ad Preview</DialogTitle>
          </DialogHeader>
          {previewAd && (
            <div className="space-y-4">
              {previewAd.image_url && (
                <img
                  src={previewAd.image_url}
                  alt=""
                  className="w-full rounded-lg object-contain max-h-[400px]"
                />
              )}
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">{previewAd.headline}</h3>
                <a
                  href={previewAd.destination_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary flex items-center gap-1 hover:underline"
                >
                  <ExternalLink className="w-4 h-4" />
                  {previewAd.destination_url}
                </a>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <div className="mt-1">{getStatusBadge(previewAd.status)}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Billing:</span>
                  <div className="mt-1">{getBillingBadge(previewAd.billing_type || 'cpc')}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Daily Budget:</span>
                  <div className="mt-1">₹{(previewAd.daily_budget / 100).toLocaleString('en-IN')}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">
                    {previewAd.billing_type === 'cpm' ? 'CPM Rate:' : 'CPC Bid:'}
                  </span>
                  <div className="mt-1">
                    ₹{((previewAd.billing_type === 'cpm' ? previewAd.cpm_rate : previewAd.cpc_bid) || 0) / 100}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Spend:</span>
                  <div className="mt-1">
                    ₹{((previewAd.billing_type === 'cpm' ? previewAd.cpm_spent : previewAd.total_spend) / 100).toLocaleString('en-IN')}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">
                    {previewAd.billing_type === 'cpm' ? 'Impressions:' : 'Clicks:'}
                  </span>
                  <div className="mt-1">
                    {previewAd.billing_type === 'cpm' 
                      ? `${previewAd.impressions_count.toLocaleString('en-IN')} / ${(previewAd.impressions_limit || 0).toLocaleString('en-IN')}`
                      : previewAd.total_clicks
                    }
                  </div>
                </div>
              </div>
              {previewAd.rejection_reason && (
                <div className="text-sm text-red-500 bg-red-500/10 rounded-md px-3 py-2">
                  <strong>Rejection reason:</strong> {previewAd.rejection_reason}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}