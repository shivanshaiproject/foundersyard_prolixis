import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bot, MessageSquare, FileText, Clock, Users, Activity, ArrowRight, Brain, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

interface MemoryView {
  persona_name: string;
  project_name: string;
  current_stage: string | null;
  current_day_count: number;
  last_action: string | null;
  tone_style: string | null;
}

export default function AdminSwarm() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ personas: 0, postsToday: 0, commentsToday: 0, queuedPosts: 0 });
  const [processing, setProcessing] = useState(false);
  const [triggeringAuto, setTriggeringAuto] = useState(false);
  const [memoryViews, setMemoryViews] = useState<MemoryView[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    fetchStats();
    fetchMemoryViews();
    fetchRecentActivity();
  }, []);

  const fetchStats = async () => {
    const today = new Date().toISOString().split('T')[0];
    const [personasRes, postsRes, commentsRes, queueRes, engagementRes] = await Promise.all([
      supabase.from('swarm_personas').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('swarm_activity_log').select('id', { count: 'exact', head: true }).eq('action_type', 'post_published').gte('created_at', today),
      supabase.from('swarm_activity_log').select('id', { count: 'exact', head: true }).in('action_type', ['comment_added', 'like_added']).gte('created_at', today),
      supabase.from('swarm_post_queue').select('id', { count: 'exact', head: true }).eq('status', 'scheduled'),
      supabase.from('swarm_engagement_queue').select('id', { count: 'exact', head: true }).eq('status', 'pending') as any,
    ]);
    setStats({
      personas: personasRes.count || 0,
      postsToday: postsRes.count || 0,
      commentsToday: (commentsRes.count || 0),
      queuedPosts: (queueRes.count || 0) + (engagementRes.count || 0),
    });
  };

  const fetchMemoryViews = async () => {
    const { data: personas } = await supabase.from('swarm_personas').select('id, name').eq('is_active', true) as any;
    if (!personas?.length) return;
    const { data: memories } = await supabase.from('persona_memory').select('*').in('persona_id', personas.map((p: any) => p.id)) as any;
    const views: MemoryView[] = (memories || []).map((m: any) => {
      const persona = personas.find((p: any) => p.id === m.persona_id);
      return {
        persona_name: persona?.name || 'Unknown',
        project_name: m.project_name,
        current_stage: m.current_stage,
        current_day_count: m.current_day_count || 1,
        last_action: m.last_action,
        tone_style: m.tone_style,
      };
    });
    setMemoryViews(views);
  };

  const fetchRecentActivity = async () => {
    const { data } = await supabase.from('swarm_activity_log').select('*').order('created_at', { ascending: false }).limit(10) as any;
    setRecentActivity(data || []);
  };

  const handleProcessQueue = async () => {
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('swarm-process-queue');
      if (error) throw error;
      toast({ title: 'Queue processed', description: `${data?.processed || 0} posts published` });
      fetchStats();
      fetchRecentActivity();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const handleTriggerAutoPost = async () => {
    setTriggeringAuto(true);
    try {
      const { data, error } = await supabase.functions.invoke('swarm-auto-post');
      if (error) throw error;
      const summary = data?.summary;
      toast({ 
        title: `Autonomous run complete`, 
        description: `${summary?.processed || 0} posted, ${summary?.skipped || 0} skipped out of ${summary?.total || 0} personas` 
      });
      fetchStats();
      fetchRecentActivity();
      fetchMemoryViews();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setTriggeringAuto(false);
    }
  };

  const statCards = [
    { title: 'Active Personas', value: stats.personas, icon: Users, color: 'text-blue-500' },
    { title: 'Posts Today', value: stats.postsToday, icon: FileText, color: 'text-green-500' },
    { title: 'Comments Today', value: stats.commentsToday, icon: MessageSquare, color: 'text-purple-500' },
    { title: 'Queued Posts', value: stats.queuedPosts, icon: Clock, color: 'text-orange-500' },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Bot className="w-7 h-7 text-primary" /> Engagement Swarm
            </h1>
            <p className="text-muted-foreground mt-1">Autonomous founder simulation engine</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleTriggerAutoPost} disabled={triggeringAuto} variant="default">
              <Bot className="w-4 h-4 mr-2" />
              {triggeringAuto ? 'Running Autonomous...' : '⚡ Trigger Auto-Post Now'}
            </Button>
            <Button onClick={handleProcessQueue} disabled={processing || stats.queuedPosts === 0} variant="outline">
              <Activity className="w-4 h-4 mr-2" />
              {processing ? 'Processing...' : `Process Queue (${stats.queuedPosts})`}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat) => (
            <Card key={stat.title}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                  </div>
                  <stat.icon className={`w-8 h-8 ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate('/admin/swarm/personas')}>
            <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Users className="w-5 h-5 text-primary" /> Persona Manager</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">Create personas with memory, projects, and scheduling</p>
              <Button variant="ghost" size="sm" className="gap-1">Manage <ArrowRight className="w-4 h-4" /></Button>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate('/admin/swarm/posts')}>
            <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><FileText className="w-5 h-5 text-primary" /> Post Automator</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">Generate, preview, bulk schedule posts</p>
              <Button variant="ghost" size="sm" className="gap-1">Generate <ArrowRight className="w-4 h-4" /></Button>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate('/admin/swarm/comments')}>
            <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><MessageSquare className="w-5 h-5 text-primary" /> Comment Automation</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">Trigger comments and create discussion threads</p>
              <Button variant="ghost" size="sm" className="gap-1">Configure <ArrowRight className="w-4 h-4" /></Button>
            </CardContent>
          </Card>
        </div>

        {/* Memory View */}
        {memoryViews.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><Brain className="w-5 h-5 text-primary" /> Persona Memory State</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {memoryViews.map((m, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-accent/30 rounded-lg">
                    <div>
                      <p className="font-medium text-sm text-foreground">{m.persona_name}</p>
                      <p className="text-xs text-muted-foreground">
                        Building: {m.project_name} · Day {m.current_day_count} · {m.current_stage}
                      </p>
                      {m.last_action && <p className="text-xs text-muted-foreground">Last: {m.last_action}</p>}
                    </div>
                    <Badge variant="outline" className="text-xs">{m.tone_style}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Activity */}
        {recentActivity.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><Activity className="w-5 h-5 text-primary" /> Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recentActivity.map(a => (
                  <div key={a.id} className="flex items-center justify-between text-sm p-2 border-b border-border last:border-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{a.action_type.replace('_', ' ')}</Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
