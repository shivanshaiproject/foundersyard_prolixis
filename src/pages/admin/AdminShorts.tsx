import { useState, useEffect } from 'react';
import { Video, Shield, AlertTriangle, CheckCircle, XCircle, Trash2, Eye, Flag, Clock, Ban, Play, Search, Filter, RefreshCw } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';

interface ShortWithDetails {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  views_count: number;
  likes_count: number;
  comments_count: number;
  reports_count: number;
  moderation_status: string;
  moderation_score: number | null;
  moderation_reason: string | null;
  is_published: boolean;
  is_deleted: boolean;
  is_preserved_for_review: boolean;
  created_at: string;
  user_id: string;
  author: {
    id: string;
    full_name: string;
    username: string | null;
    avatar_url: string | null;
  } | null;
}

interface ShortReport {
  id: string;
  reason: string;
  description: string | null;
  status: string;
  created_at: string;
  reporter_id: string;
}

export default function AdminShorts() {
  const { user } = useAuth();
  const [shorts, setShorts] = useState<ShortWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedShort, setSelectedShort] = useState<ShortWithDetails | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [reports, setReports] = useState<ShortReport[]>([]);
  const [strikeReason, setStrikeReason] = useState('');
  const [showStrikeDialog, setShowStrikeDialog] = useState(false);
  const [stats, setStats] = useState({
    pending: 0,
    reported: 0,
    preserved: 0,
    total: 0,
  });

  const fetchShorts = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('shorts')
        .select(`
          *,
          author:profiles!shorts_user_id_fkey(id, full_name, username, avatar_url)
        `)
        .order('created_at', { ascending: false });

      // Filter based on active tab
      switch (activeTab) {
        case 'pending':
          query = query.eq('moderation_status', 'pending_review');
          break;
        case 'reported':
          query = query.gt('reports_count', 0);
          break;
        case 'preserved':
          query = query.eq('is_deleted', true).eq('is_preserved_for_review', true);
          break;
        case 'flagged':
          query = query.eq('moderation_status', 'flagged');
          break;
        case 'all':
          // No filter
          break;
      }

      const { data, error } = await query.limit(100);

      if (error) throw error;
      setShorts(data || []);

      // Fetch stats
      const [pendingRes, reportedRes, preservedRes, totalRes] = await Promise.all([
        supabase.from('shorts').select('id', { count: 'exact', head: true }).eq('moderation_status', 'pending_review'),
        supabase.from('shorts').select('id', { count: 'exact', head: true }).gt('reports_count', 0),
        supabase.from('shorts').select('id', { count: 'exact', head: true }).eq('is_deleted', true).eq('is_preserved_for_review', true),
        supabase.from('shorts').select('id', { count: 'exact', head: true }),
      ]);

      setStats({
        pending: pendingRes.count || 0,
        reported: reportedRes.count || 0,
        preserved: preservedRes.count || 0,
        total: totalRes.count || 0,
      });
    } catch (error) {
      console.error('Failed to fetch shorts:', error);
      toast.error('Failed to load shorts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShorts();
  }, [activeTab]);

  const fetchReports = async (shortId: string) => {
    try {
      const { data, error } = await supabase
        .from('short_reports')
        .select('*')
        .eq('short_id', shortId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error('Failed to fetch reports:', error);
      toast.error('Failed to load reports');
    }
  };

  const approveShort = async (short: ShortWithDetails) => {
    try {
      const { error } = await supabase
        .from('shorts')
        .update({
          moderation_status: 'approved',
          is_published: true,
        })
        .eq('id', short.id);

      if (error) throw error;
      toast.success('Short approved');
      fetchShorts();
    } catch (error) {
      console.error('Failed to approve short:', error);
      toast.error('Failed to approve short');
    }
  };

  const rejectShort = async (short: ShortWithDetails, issueStrike: boolean = false) => {
    try {
      // Update short status
      const { error: updateError } = await supabase
        .from('shorts')
        .update({
          moderation_status: 'rejected',
          is_published: false,
        })
        .eq('id', short.id);

      if (updateError) throw updateError;

      // Issue strike if requested
      if (issueStrike && strikeReason) {
        // Get current strike count
        const { data: strikeData } = await supabase
          .from('user_strikes')
          .select('strike_count')
          .eq('user_id', short.user_id)
          .single();

        const currentStrikes = strikeData?.strike_count || 0;
        const newStrikeCount = currentStrikes + 1;

        // Upsert user_strikes
        const { error: strikeError } = await supabase
          .from('user_strikes')
          .upsert({
            user_id: short.user_id,
            strike_count: newStrikeCount,
            last_strike_date: new Date().toISOString(),
            last_strike_reason: strikeReason,
            suspended_until: newStrikeCount >= 2 ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() : null,
            is_permanent_ban: newStrikeCount >= 3,
          }, { onConflict: 'user_id' });

        if (strikeError) throw strikeError;

        // Log to strike history
        await supabase.from('strike_history').insert({
          user_id: short.user_id,
          strike_number: newStrikeCount,
          reason: strikeReason,
          issued_by: user?.id,
        });

        toast.success(`Short rejected and strike issued (${newStrikeCount}/3)`);
      } else {
        toast.success('Short rejected');
      }

      setShowStrikeDialog(false);
      setStrikeReason('');
      fetchShorts();
    } catch (error) {
      console.error('Failed to reject short:', error);
      toast.error('Failed to reject short');
    }
  };

  const deleteShort = async (short: ShortWithDetails) => {
    try {
      // Call edge function to handle R2 deletion properly
      const { error } = await supabase.functions.invoke('delete-r2-video', {
        body: {
          shortId: short.id,
          forceDelete: true, // Admin can force delete
        },
      });

      if (error) throw error;
      toast.success('Short permanently deleted');
      fetchShorts();
    } catch (error) {
      console.error('Failed to delete short:', error);
      toast.error('Failed to delete short');
    }
  };

  const dismissReports = async (short: ShortWithDetails) => {
    try {
      // Update all reports to dismissed
      const { error: reportsError } = await supabase
        .from('short_reports')
        .update({
          status: 'dismissed',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('short_id', short.id);

      if (reportsError) throw reportsError;

      // Reset reports count and moderation status
      const { error: shortError } = await supabase
        .from('shorts')
        .update({
          reports_count: 0,
          moderation_status: 'approved',
          is_published: true,
        })
        .eq('id', short.id);

      if (shortError) throw shortError;

      toast.success('Reports dismissed');
      fetchShorts();
    } catch (error) {
      console.error('Failed to dismiss reports:', error);
      toast.error('Failed to dismiss reports');
    }
  };

  const getStatusBadge = (short: ShortWithDetails) => {
    if (short.is_deleted && short.is_preserved_for_review) {
      return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">Preserved</Badge>;
    }
    if (short.moderation_status === 'pending_review') {
      return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">Pending Review</Badge>;
    }
    if (short.moderation_status === 'flagged') {
      return <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/30">Flagged</Badge>;
    }
    if (short.moderation_status === 'rejected') {
      return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">Rejected</Badge>;
    }
    if (short.reports_count > 0) {
      return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">{short.reports_count} Reports</Badge>;
    }
    return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">Approved</Badge>;
  };

  const filteredShorts = shorts.filter(
    (short) =>
      short.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      short.author?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      short.author?.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Video className="w-6 h-6 text-primary" />
              Shorts Moderation
            </h1>
            <p className="text-muted-foreground mt-1">Review and moderate short-form video content</p>
          </div>
          <Button onClick={fetchShorts} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Review</p>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Reported</p>
                  <p className="text-2xl font-bold">{stats.reported}</p>
                </div>
                <Flag className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Preserved</p>
                  <p className="text-2xl font-bold">{stats.preserved}</p>
                </div>
                <Shield className="w-8 h-8 text-amber-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Shorts</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Video className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs and Table */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
                <TabsList>
                  <TabsTrigger value="pending" className="gap-1">
                    <Clock className="w-3 h-3" />
                    Pending
                    {stats.pending > 0 && <Badge variant="destructive" className="ml-1 text-xs">{stats.pending}</Badge>}
                  </TabsTrigger>
                  <TabsTrigger value="reported" className="gap-1">
                    <Flag className="w-3 h-3" />
                    Reported
                  </TabsTrigger>
                  <TabsTrigger value="preserved" className="gap-1">
                    <Shield className="w-3 h-3" />
                    Preserved
                  </TabsTrigger>
                  <TabsTrigger value="flagged" className="gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Flagged
                  </TabsTrigger>
                  <TabsTrigger value="all">All</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search shorts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-full sm:w-64"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredShorts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Video className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No shorts found in this category</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Short</TableHead>
                    <TableHead>Author</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Stats</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredShorts.map((short) => (
                    <TableRow key={short.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div
                            className="w-12 h-20 rounded-lg bg-muted overflow-hidden cursor-pointer hover:ring-2 ring-primary transition-all"
                            onClick={() => {
                              setSelectedShort(short);
                              setShowPreview(true);
                            }}
                          >
                            {short.thumbnail_url ? (
                              <img src={short.thumbnail_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Play className="w-4 h-4 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="max-w-[200px]">
                            <p className="font-medium truncate">{short.title}</p>
                            {short.moderation_score && (
                              <p className="text-xs text-muted-foreground">
                                AI Score: {(short.moderation_score * 100).toFixed(1)}%
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {short.author?.avatar_url ? (
                            <img src={short.author.avatar_url} alt="" className="w-8 h-8 rounded-full" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-muted" />
                          )}
                          <div>
                            <p className="text-sm font-medium">{short.author?.full_name || 'Unknown'}</p>
                            {short.author?.username && (
                              <p className="text-xs text-muted-foreground">@{short.author.username}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(short)}</TableCell>
                      <TableCell>
                        <div className="text-xs space-y-1">
                          <p>{short.views_count.toLocaleString()} views</p>
                          <p>{short.likes_count} likes</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(short.created_at), { addSuffix: true })}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              Actions
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedShort(short);
                                setShowPreview(true);
                              }}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              Preview
                            </DropdownMenuItem>
                            {short.reports_count > 0 && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedShort(short);
                                  fetchReports(short.id);
                                  setShowReports(true);
                                }}
                              >
                                <Flag className="w-4 h-4 mr-2" />
                                View Reports ({short.reports_count})
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => approveShort(short)} className="text-green-600">
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Approve
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedShort(short);
                                setShowStrikeDialog(true);
                              }}
                              className="text-orange-600"
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Reject & Strike
                            </DropdownMenuItem>
                            {short.reports_count > 0 && (
                              <DropdownMenuItem onClick={() => dismissReports(short)} className="text-blue-600">
                                <Shield className="w-4 h-4 mr-2" />
                                Dismiss Reports
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => deleteShort(short)} className="text-destructive">
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Permanently
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Video Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedShort?.title}</DialogTitle>
            <DialogDescription>
              {selectedShort?.moderation_reason && (
                <span className="text-destructive">{selectedShort.moderation_reason}</span>
              )}
            </DialogDescription>
          </DialogHeader>
          {selectedShort && (
            <div className="aspect-[9/16] max-h-[60vh] rounded-lg overflow-hidden bg-black">
              <video
                src={selectedShort.video_url}
                controls
                autoPlay
                className="w-full h-full object-contain"
              />
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Close
            </Button>
            {selectedShort && (
              <>
                <Button variant="default" onClick={() => approveShort(selectedShort)}>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setShowPreview(false);
                    setShowStrikeDialog(true);
                  }}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reports Dialog */}
      <Dialog open={showReports} onOpenChange={setShowReports}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reports for "{selectedShort?.title}"</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {reports.map((report) => (
              <div key={report.id} className="p-3 rounded-lg border">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline">{report.reason}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
                  </span>
                </div>
                {report.description && (
                  <p className="text-sm text-muted-foreground">{report.description}</p>
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReports(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Strike Dialog */}
      <Dialog open={showStrikeDialog} onOpenChange={setShowStrikeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="w-5 h-5 text-destructive" />
              Reject Short & Issue Strike
            </DialogTitle>
            <DialogDescription>
              This will reject the short and issue a strike to {selectedShort?.author?.full_name || 'the user'}.
              3 strikes result in a permanent ban.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Strike Reason</label>
              <Select value={strikeReason} onValueChange={setStrikeReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NSFW content detected by AI">NSFW Content</SelectItem>
                  <SelectItem value="Violence/Weapons in content">Violence/Weapons</SelectItem>
                  <SelectItem value="Harassment/Bullying">Harassment</SelectItem>
                  <SelectItem value="Spam/Misleading content">Spam</SelectItem>
                  <SelectItem value="Copyright violation">Copyright</SelectItem>
                  <SelectItem value="Hate speech">Hate Speech</SelectItem>
                  <SelectItem value="Community guideline violation">Other Violation</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowStrikeDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (selectedShort) rejectShort(selectedShort, false);
              }}
            >
              Reject Only
            </Button>
            <Button
              variant="destructive"
              disabled={!strikeReason}
              onClick={() => {
                if (selectedShort) rejectShort(selectedShort, true);
              }}
            >
              <Ban className="w-4 h-4 mr-2" />
              Reject & Strike
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
