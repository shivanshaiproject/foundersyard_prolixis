import { AdsLayout } from '@/components/ads/AdsLayout';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAds, Ad } from '@/hooks/useAds';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Loader2, 
  MoreHorizontal, 
  Pause, 
  Play, 
  Trash2, 
  BarChart3,
  ExternalLink,
  MousePointer2,
  Eye
} from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

export default function AdsCampaigns() {
  const navigate = useNavigate();
  const { ads, loading, pauseAd, resumeAd, deleteAd } = useAds();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Active</Badge>;
      case 'paused':
        return <Badge className="bg-gray-500/10 text-gray-500 border-gray-500/20">Paused</Badge>;
      case 'exhausted':
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Budget Exhausted</Badge>;
      case 'pending_approval':
        return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">Pending Approval</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Rejected</Badge>;
      case 'scheduled':
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Scheduled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getBillingTypeBadge = (billingType: string) => {
    if (billingType === 'cpm') {
      return (
        <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/20 gap-1">
          <Eye className="w-3 h-3" />
          CPM
        </Badge>
      );
    }
    return (
      <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 gap-1">
        <MousePointer2 className="w-3 h-3" />
        CPC
      </Badge>
    );
  };

  const renderMetrics = (ad: Ad) => {
    if (ad.billing_type === 'cpm') {
      const impressionsRemaining = (ad.impressions_limit || 0) - ad.impressions_count;
      return (
        <>
          <TableCell className="text-right">
            <div className="text-sm">
              <span className="font-medium">{ad.impressions_count.toLocaleString('en-IN')}</span>
              <span className="text-muted-foreground text-xs block">
                / {(ad.impressions_limit || 0).toLocaleString('en-IN')}
              </span>
            </div>
          </TableCell>
          <TableCell className="text-right">
            <span className="text-muted-foreground">₹300/1K</span>
          </TableCell>
          <TableCell className="text-right">₹{(ad.cpm_spent / 100).toLocaleString('en-IN')}</TableCell>
        </>
      );
    }

    return (
      <>
        <TableCell className="text-right">{ad.total_clicks}</TableCell>
        <TableCell className="text-right">₹{((ad.cpc_bid || 0) / 100).toFixed(0)}</TableCell>
        <TableCell className="text-right">₹{(ad.total_spend / 100).toLocaleString('en-IN')}</TableCell>
      </>
    );
  };

  if (loading) {
    return (
      <AdsLayout>
        <div className="flex items-center justify-center h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdsLayout>
    );
  }

  return (
    <AdsLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Campaigns</h1>
            <p className="text-muted-foreground mt-1">Manage your ad campaigns</p>
          </div>
          <Button 
            onClick={() => navigate('/ads/create')}
            className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Campaign
          </Button>
        </div>

        {/* Campaigns Table */}
        <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">
          {ads.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-muted flex items-center justify-center mb-4">
                <BarChart3 className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">No campaigns yet</p>
              <p className="text-sm text-muted-foreground mt-1">Create your first ad campaign</p>
              <Button 
                onClick={() => navigate('/ads/create')}
                className="mt-4"
              >
                Create Campaign
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Campaign</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">
                      <span className="hidden sm:inline">Clicks/Impressions</span>
                      <span className="sm:hidden">Perf.</span>
                    </TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Spend</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ads.map((ad) => (
                    <TableRow key={ad.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {ad.image_url && (
                            <img 
                              src={ad.image_url} 
                              alt="" 
                              className="w-10 h-10 rounded-lg object-cover hidden sm:block"
                            />
                          )}
                          <div className="min-w-0">
                            <p className="font-medium line-clamp-1">{ad.headline}</p>
                            <a 
                              href={ad.destination_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                            >
                              <ExternalLink className="w-3 h-3 shrink-0" />
                              <span className="truncate max-w-[120px]">{new URL(ad.destination_url).hostname}</span>
                            </a>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getBillingTypeBadge(ad.billing_type || 'cpc')}</TableCell>
                      <TableCell>{getStatusBadge(ad.status)}</TableCell>
                      {renderMetrics(ad)}
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {/* View Analytics - always available */}
                            <DropdownMenuItem onClick={() => navigate(`/ads/campaigns/${ad.id}`)}>
                              <BarChart3 className="w-4 h-4 mr-2" />
                              View Analytics
                            </DropdownMenuItem>
                            {/* Only show Pause for active ads */}
                            {ad.status === 'active' && (
                              <DropdownMenuItem onClick={() => pauseAd(ad.id)}>
                                <Pause className="w-4 h-4 mr-2" />
                                Pause
                              </DropdownMenuItem>
                            )}
                            {/* Only show Resume for paused ads - SECURITY: prevents bypassing approval */}
                            {ad.status === 'paused' && (
                              <DropdownMenuItem onClick={() => resumeAd(ad.id)}>
                                <Play className="w-4 h-4 mr-2" />
                                Resume
                              </DropdownMenuItem>
                            )}
                            {/* Show status info for pending/rejected ads */}
                            {(ad.status === 'pending_approval' || ad.status === 'rejected') && (
                              <DropdownMenuItem disabled className="text-muted-foreground">
                                {ad.status === 'pending_approval' ? 'Awaiting approval...' : 'Ad was rejected'}
                              </DropdownMenuItem>
                            )}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem 
                                  onSelect={(e) => e.preventDefault()}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Campaign?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete this campaign. This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => deleteAd(ad.id)}
                                    className="bg-destructive hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </AdsLayout>
  );
}
