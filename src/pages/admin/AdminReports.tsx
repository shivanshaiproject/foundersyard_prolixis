import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Eye,
  Flag,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Report {
  id: string;
  reason: string;
  description: string | null;
  status: string;
  post_id: string | null;
  comment_id: string | null;
  created_at: string;
  reporter: {
    full_name: string;
    username: string | null;
    avatar_url: string | null;
  };
  post?: {
    id: string;
    content: string;
    user_id: string;
    profiles: {
      full_name: string;
      username: string | null;
    };
  };
}

export default function AdminReports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    setLoading(true);
    
    // Fetch reports first
    const { data: reportsData, error } = await supabase
      .from('reports')
      .select('id, reason, description, status, post_id, comment_id, created_at, reporter_id')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to fetch reports');
      setLoading(false);
      return;
    }

    // Fetch reporter profiles and post details for each report
    const reportsWithDetails = await Promise.all((reportsData || []).map(async (report: any) => {
      // Get reporter profile
      const { data: reporterProfile } = await supabase
        .from('profiles')
        .select('full_name, username, avatar_url')
        .eq('id', report.reporter_id)
        .maybeSingle();

      let post = null;
      if (report.post_id) {
        const { data: postData } = await supabase
          .from('posts')
          .select('id, content, user_id')
          .eq('id', report.post_id)
          .maybeSingle();

        if (postData) {
          const { data: postAuthor } = await supabase
            .from('profiles')
            .select('full_name, username')
            .eq('id', postData.user_id)
            .maybeSingle();

          post = { ...postData, profiles: postAuthor };
        }
      }

      return {
        ...report,
        reporter: reporterProfile || { full_name: 'Unknown', username: null, avatar_url: null },
        post
      };
    }));

    setReports(reportsWithDetails as Report[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const updateReportStatus = async (reportId: string, status: string) => {
    const { error } = await supabase
      .from('reports')
      .update({ status })
      .eq('id', reportId);

    if (error) {
      toast.error('Failed to update report');
    } else {
      toast.success(`Report marked as ${status}`);
      fetchReports();
    }
  };

  const deleteReportedContent = async (report: Report) => {
    if (report.post_id) {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', report.post_id);

      if (error) {
        toast.error('Failed to delete content');
        return;
      }
    }
    
    await updateReportStatus(report.id, 'resolved');
    toast.success('Content deleted and report resolved');
  };

  const issueStrikeAndDelete = async (report: Report) => {
    if (!report.post?.user_id) {
      toast.error('Cannot find post author');
      return;
    }

    const userId = report.post.user_id;

    // Get current strikes
    const { data: existing } = await supabase
      .from('user_strikes')
      .select('strike_count')
      .eq('user_id', userId)
      .maybeSingle();

    const currentCount = existing?.strike_count || 0;
    const newCount = currentCount + 1;

    let suspendedUntil = null;
    let isPermanentBan = false;

    if (newCount === 2) {
      suspendedUntil = new Date();
      suspendedUntil.setDate(suspendedUntil.getDate() + 7);
    } else if (newCount >= 3) {
      isPermanentBan = true;
    }

    await supabase
      .from('user_strikes')
      .upsert({
        user_id: userId,
        strike_count: newCount,
        last_strike_date: new Date().toISOString(),
        last_strike_reason: `Report: ${report.reason}`,
        suspended_until: suspendedUntil?.toISOString() || null,
        is_permanent_ban: isPermanentBan,
      });

    await supabase
      .from('strike_history')
      .insert({
        user_id: userId,
        strike_number: newCount,
        reason: `Report: ${report.reason}`,
        issued_by: 'admin',
      });

    await deleteReportedContent(report);
    toast.success(`Strike issued (${newCount}/3) and content deleted`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">Pending</Badge>;
      case 'resolved':
        return <Badge variant="secondary" className="bg-green-100 text-green-700">Resolved</Badge>;
      case 'dismissed':
        return <Badge variant="secondary" className="bg-gray-100 text-gray-700">Dismissed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reports Queue</h1>
          <p className="text-muted-foreground mt-1">Review and handle user reports</p>
        </div>

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
        ) : reports.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Flag className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium">No reports</p>
              <p className="text-muted-foreground">All reports have been handled</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => (
              <Card key={report.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        src={report.reporter.avatar_url}
                        name={report.reporter.full_name}
                        size="sm"
                      />
                      <div>
                        <p className="text-sm">
                          <span className="font-medium">{report.reporter.full_name}</span>
                          <span className="text-muted-foreground"> reported</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(report.created_at), 'MMM d, yyyy HH:mm')}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(report.status || 'pending')}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg">
                    <p className="text-sm font-medium text-red-700 dark:text-red-300 mb-1">
                      Reason: {report.reason}
                    </p>
                    {report.description && (
                      <p className="text-sm text-red-600 dark:text-red-400">{report.description}</p>
                    )}
                  </div>

                  {report.post && (
                    <div className="p-4 bg-muted/50 rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium">{report.post.profiles?.full_name}</span>
                        <span className="text-xs text-muted-foreground">@{report.post.profiles?.username || 'unknown'}</span>
                      </div>
                      <p className="text-sm text-foreground">{report.post.content}</p>
                    </div>
                  )}

                  {report.status === 'pending' && (
                    <div className="flex items-center gap-2 pt-2 border-t border-border">
                      {report.post_id && (
                        <Button size="sm" variant="outline" onClick={() => window.open(`/post/${report.post_id}`, '_blank')}>
                          <Eye className="w-4 h-4 mr-1" />
                          View Post
                        </Button>
                      )}
                      <Button size="sm" variant="outline" className="text-orange-600" onClick={() => issueStrikeAndDelete(report)}>
                        <AlertTriangle className="w-4 h-4 mr-1" />
                        Strike & Delete
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => deleteReportedContent(report)}>
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete Content
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => updateReportStatus(report.id, 'dismissed')}>
                        <XCircle className="w-4 h-4 mr-1" />
                        Dismiss
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
