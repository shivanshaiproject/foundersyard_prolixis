import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, FileText, Flag, BadgeCheck, AlertTriangle,
  Clock, Ban, TrendingUp, Megaphone, Activity, Eye, UserCheck
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

interface DashboardStats {
  totalUsers: number;
  totalPosts: number;
  pendingReports: number;
  pendingVerifications: number;
  usersWithStrikes: number;
  suspendedUsers: number;
  heldPosts: number;
  pendingAds: number;
}

interface ActiveUser {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  last_seen_at: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0, totalPosts: 0, pendingReports: 0, pendingVerifications: 0,
    usersWithStrikes: 0, suspendedUsers: 0, heldPosts: 0, pendingAds: 0,
  });
  const [loading, setLoading] = useState(true);
  const [dauCount, setDauCount] = useState(0);
  const [mauCount, setMauCount] = useState(0);
  const [onlineNow, setOnlineNow] = useState(0);
  const [dauTrend, setDauTrend] = useState<any[]>([]);
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);

  useEffect(() => {
    const fetchAll = async () => {
      const today = new Date().toISOString().split('T')[0];
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const [
        { count: usersCount },
        { count: postsCount },
        { count: reportsCount },
        { count: verificationsCount },
        { count: strikesCount },
        { count: suspendedCount },
        { count: heldCount },
        { count: pendingAdsCount },
        { count: dauResult },
        { count: mauResult },
        { count: onlineResult },
        { data: trendData },
        { data: activeData },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('posts').select('*', { count: 'exact', head: true }),
        supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('verification_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('user_strikes').select('*', { count: 'exact', head: true }).gt('strike_count', 0),
        supabase.from('user_strikes').select('*', { count: 'exact', head: true }).not('suspended_until', 'is', null),
        supabase.from('posts').select('*', { count: 'exact', head: true }).eq('is_held_for_review', true),
        supabase.from('ads').select('*', { count: 'exact', head: true }).eq('status', 'pending_approval'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('last_seen_at', today),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('last_seen_at', thirtyDaysAgo),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('last_seen_at', fiveMinAgo),
        supabase.from('daily_active_users').select('snapshot_date, dau_count, wau_count, mau_count').order('snapshot_date', { ascending: true }).limit(30),
        supabase.from('profiles').select('id, username, full_name, avatar_url, last_seen_at').gte('last_seen_at', today).order('last_seen_at', { ascending: false }).limit(50),
      ]);

      setStats({
        totalUsers: usersCount || 0, totalPosts: postsCount || 0,
        pendingReports: reportsCount || 0, pendingVerifications: verificationsCount || 0,
        usersWithStrikes: strikesCount || 0, suspendedUsers: suspendedCount || 0,
        heldPosts: heldCount || 0, pendingAds: pendingAdsCount || 0,
      });
      setDauCount(dauResult || 0);
      setMauCount(mauResult || 0);
      setOnlineNow(onlineResult || 0);
      setDauTrend((trendData || []).map((d: any) => ({
        date: format(new Date(d.snapshot_date), 'MMM dd'),
        DAU: d.dau_count,
        WAU: d.wau_count,
        MAU: d.mau_count,
      })));
      setActiveUsers((activeData || []) as ActiveUser[]);
      setLoading(false);
    };

    fetchAll();
  }, []);

  const statCards = [
    { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'bg-blue-500' },
    { label: 'Total Posts', value: stats.totalPosts, icon: FileText, color: 'bg-green-500' },
    { label: 'DAU (Today)', value: dauCount, icon: Activity, color: 'bg-indigo-500' },
    { label: 'MAU (30d)', value: mauCount, icon: UserCheck, color: 'bg-teal-500' },
    { label: 'Online Now', value: onlineNow, icon: Eye, color: 'bg-emerald-500' },
    { label: 'Pending Reports', value: stats.pendingReports, icon: Flag, color: 'bg-orange-500' },
    { label: 'Pending Ads', value: stats.pendingAds, icon: Megaphone, color: 'bg-amber-500' },
    { label: 'Verification Requests', value: stats.pendingVerifications, icon: BadgeCheck, color: 'bg-purple-500' },
    { label: 'Users with Strikes', value: stats.usersWithStrikes, icon: AlertTriangle, color: 'bg-yellow-500' },
    { label: 'Suspended Users', value: stats.suspendedUsers, icon: Ban, color: 'bg-red-500' },
    { label: 'Held for Review', value: stats.heldPosts, icon: Clock, color: 'bg-cyan-500' },
  ];

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return `${Math.floor(diff / 3600000)}h ago`;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">Overview of your platform statistics</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4 sm:p-6"><div className="h-16 bg-muted rounded" /></CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            {/* Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {statCards.map((stat) => (
                <Card key={stat.label} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-3 sm:p-6">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm text-muted-foreground truncate">{stat.label}</p>
                        <p className="text-xl sm:text-3xl font-bold text-foreground mt-1">{stat.value}</p>
                      </div>
                      <div className={`w-9 h-9 sm:w-12 sm:h-12 rounded-xl ${stat.color} flex items-center justify-center flex-shrink-0`}>
                        <stat.icon className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* DAU Trend Chart */}
            {dauTrend.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Activity className="w-5 h-5" />
                    Daily Active Users — 30 Day Trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 sm:h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dauTrend}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 11 }} />
                        <YAxis className="text-xs" tick={{ fontSize: 11 }} />
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }} />
                        <Area type="monotone" dataKey="DAU" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" strokeWidth={2} />
                        <Area type="monotone" dataKey="MAU" stroke="hsl(var(--accent-foreground))" fill="hsl(var(--accent) / 0.1)" strokeWidth={1} strokeDasharray="4 4" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Active Users Today */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Users className="w-5 h-5" />
                    Active Users Today ({activeUsers.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-80 overflow-y-auto space-y-2">
                    {activeUsers.length === 0 ? (
                      <p className="text-muted-foreground text-sm py-4 text-center">No active users today yet</p>
                    ) : (
                      activeUsers.map((u) => (
                        <div key={u.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors">
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                            {u.avatar_url ? (
                              <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Users className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground truncate">{u.full_name || u.username || 'Unknown'}</p>
                            {u.username && <p className="text-xs text-muted-foreground truncate">@{u.username}</p>}
                          </div>
                          <span className="text-xs text-muted-foreground flex-shrink-0">{timeAgo(u.last_seen_at)}</span>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <TrendingUp className="w-5 h-5" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Link to="/admin/reports" className="block p-3 sm:p-4 rounded-xl bg-orange-50 dark:bg-orange-950/30 hover:bg-orange-100 dark:hover:bg-orange-950/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-orange-700 dark:text-orange-300 text-sm sm:text-base">Review Pending Reports</span>
                      <span className="text-xl sm:text-2xl font-bold text-orange-600">{stats.pendingReports}</span>
                    </div>
                  </Link>
                  <Link to="/admin/verification" className="block p-3 sm:p-4 rounded-xl bg-purple-50 dark:bg-purple-950/30 hover:bg-purple-100 dark:hover:bg-purple-950/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-purple-700 dark:text-purple-300 text-sm sm:text-base">Process Verifications</span>
                      <span className="text-xl sm:text-2xl font-bold text-purple-600">{stats.pendingVerifications}</span>
                    </div>
                  </Link>
                  <Link to="/admin/content" className="block p-3 sm:p-4 rounded-xl bg-cyan-50 dark:bg-cyan-950/30 hover:bg-cyan-100 dark:hover:bg-cyan-950/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-cyan-700 dark:text-cyan-300 text-sm sm:text-base">Review Held Content</span>
                      <span className="text-xl sm:text-2xl font-bold text-cyan-600">{stats.heldPosts}</span>
                    </div>
                  </Link>
                  <Link to="/admin/ads" className="block p-3 sm:p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-amber-700 dark:text-amber-300 text-sm sm:text-base">Review Pending Ads</span>
                      <span className="text-xl sm:text-2xl font-bold text-amber-600">{stats.pendingAds}</span>
                    </div>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
