import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MessageSquare, Sparkles, ArrowLeft, Zap, Bot, Heart, Clock, BookOpen, Trash2, RefreshCw, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface Persona {
  id: string;
  name: string;
  niche: string;
  auto_comment_enabled: boolean;
  auto_like_enabled: boolean;
  like_delay_min: number;
  like_delay_max: number;
  comment_delay_min: number;
  comment_delay_max: number;
  max_engagements_per_day: number;
  engagement_probability: number;
  user_id: string;
  is_active: boolean;
  target_user_ids: string[];
}

interface TargetUser {
  id: string;
  full_name: string;
  username: string | null;
}

interface QueueItem {
  id: string;
  post_id: string;
  persona_id: string;
  action_type: string;
  scheduled_at: string;
  executed_at: string | null;
  status: string;
  result: any;
  created_at: string;
}

interface RecentPost {
  id: string;
  content: string;
  created_at: string;
  profiles: { full_name: string | null; username: string | null } | null;
}

interface ActivityItem {
  id: string;
  persona_id: string;
  action_type: string;
  details: any;
  created_at: string;
}

export default function AdminSwarmComments() {
  const navigate = useNavigate();
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [recentPosts, setRecentPosts] = useState<RecentPost[]>([]);
  const [selectedPost, setSelectedPost] = useState('');
  const [selectedPersonas, setSelectedPersonas] = useState<string[]>([]);
  const [generateDiscussion, setGenerateDiscussion] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [postSearch, setPostSearch] = useState('');
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [queueFilter, setQueueFilter] = useState<string>('all');
  const [queueStats, setQueueStats] = useState({ pending: 0, completed: 0, failed: 0 });
  const [savingPersona, setSavingPersona] = useState<string | null>(null);
  const [triggeringEngine, setTriggeringEngine] = useState(false);
  const [allUsers, setAllUsers] = useState<TargetUser[]>([]);
  const [userSearch, setUserSearch] = useState<Record<string, string>>({});
  useEffect(() => {
    fetchPersonas();
    fetchRecentPosts();
    fetchActivity();
    fetchQueue();
    fetchAllUsers();
  }, []);

  const fetchPersonas = async () => {
    const { data } = await supabase
      .from('swarm_personas')
      .select('id, name, niche, auto_comment_enabled, auto_like_enabled, like_delay_min, like_delay_max, comment_delay_min, comment_delay_max, max_engagements_per_day, engagement_probability, user_id, is_active, target_user_ids') as any;
    setPersonas((data || []).map((p: any) => ({ ...p, target_user_ids: p.target_user_ids || [] })));
  };

  const fetchAllUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, username')
      .order('full_name')
      .limit(500);
    setAllUsers(data || []);
  };

  const fetchRecentPosts = async () => {
    const { data: personaData } = await supabase.from('swarm_personas').select('user_id') as any;
    const personaUserIds = (personaData || []).map((p: any) => p.user_id).filter(Boolean);
    const { data } = await supabase
      .from('posts')
      .select('id, content, created_at, user_id, profiles:posts_user_id_fkey(full_name, username)')
      .eq('is_approved', true)
      .order('created_at', { ascending: false })
      .limit(100);
    const allPosts = (data as any[] || []);
    const filtered = allPosts.filter((p: any) => !personaUserIds.includes(p.user_id));
    setRecentPosts(filtered.length > 0 ? filtered : allPosts);
  };

  const fetchActivity = async () => {
    const { data } = await supabase
      .from('swarm_activity_log')
      .select('*')
      .in('action_type', ['comment_added', 'like_added'])
      .order('created_at', { ascending: false })
      .limit(50) as any;
    setActivity(data || []);
  };

  const fetchQueue = async () => {
    const { data } = await supabase
      .from('swarm_engagement_queue')
      .select('*')
      .order('scheduled_at', { ascending: false })
      .limit(100) as any;
    const items: QueueItem[] = data || [];
    setQueue(items);
    setQueueStats({
      pending: items.filter(i => i.status === 'pending').length,
      completed: items.filter(i => i.status === 'completed').length,
      failed: items.filter(i => i.status === 'failed').length,
    });
  };

  const togglePersona = (id: string) => {
    setSelectedPersonas(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  const handleGenerate = async () => {
    if (!selectedPost) { toast({ title: 'Select a post first', variant: 'destructive' }); return; }
    if (selectedPersonas.length === 0) { toast({ title: 'Select at least one persona', variant: 'destructive' }); return; }
    setGenerating(true);
    setResults([]);
    try {
      const { data, error } = await supabase.functions.invoke('swarm-generate-comment', {
        body: { post_id: selectedPost, persona_ids: selectedPersonas, generate_discussion: generateDiscussion },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResults(data.comments || []);
      toast({ title: `${data.comments?.length || 0} comments generated!` });
      fetchActivity();
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const handleSavePersonaConfig = async (persona: Persona) => {
    setSavingPersona(persona.id);
    try {
      const { error } = await supabase
        .from('swarm_personas')
        .update({
          auto_like_enabled: persona.auto_like_enabled,
          auto_comment_enabled: persona.auto_comment_enabled,
          like_delay_min: persona.like_delay_min,
          like_delay_max: persona.like_delay_max,
          comment_delay_min: persona.comment_delay_min,
          comment_delay_max: persona.comment_delay_max,
          max_engagements_per_day: persona.max_engagements_per_day,
          engagement_probability: persona.engagement_probability,
          target_user_ids: persona.target_user_ids,
        } as any)
        .eq('id', persona.id);
      if (error) throw error;
      toast({ title: `${persona.name} config saved` });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSavingPersona(null);
    }
  };

  const updatePersonaField = (id: string, field: string, value: any) => {
    setPersonas(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const [lastRunDiagnostics, setLastRunDiagnostics] = useState<any>(null);

  const handleTriggerEngine = async () => {
    setTriggeringEngine(true);
    setLastRunDiagnostics(null);
    try {
      const { data, error } = await supabase.functions.invoke('swarm-auto-engage');
      if (error) throw error;
      const d = data?.diagnostics;
      setLastRunDiagnostics(d);
      const summary = d
        ? `Scanned: ${d.postsScanned} | Human: ${d.humanPosts} | Queued: ${d.queued} | Executed: ${d.executed} | Failed: ${d.failed}`
        : `Queued: ${data?.queued || 0}, Executed: ${data?.executed || 0}`;
      toast({ title: 'Engine run complete', description: summary });
      fetchQueue();
      fetchActivity();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setTriggeringEngine(false);
    }
  };

  const handleCancelPending = async () => {
    const pendingIds = queue.filter(q => q.status === 'pending').map(q => q.id);
    if (!pendingIds.length) return;
    const { error } = await supabase
      .from('swarm_engagement_queue')
      .update({ status: 'failed', result: { cancelled: true } } as any)
      .in('id', pendingIds);
    if (error) toast({ title: 'Error', variant: 'destructive' });
    else { toast({ title: `${pendingIds.length} items cancelled` }); fetchQueue(); }
  };

  const filteredPosts = postSearch
    ? recentPosts.filter(p => p.content.toLowerCase().includes(postSearch.toLowerCase()))
    : recentPosts;

  const filteredQueue = queueFilter === 'all' ? queue : queue.filter(q => q.status === queueFilter);

  const getPersonaName = (id: string) => personas.find(p => p.id === id)?.name || id.slice(0, 8);

  const activePersonas = personas.filter(p => p.is_active);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/swarm')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">Engagement Engine</h1>
            <p className="text-muted-foreground">Autonomous likes & comments with natural timing</p>
          </div>
          <Button onClick={handleTriggerEngine} disabled={triggeringEngine}>
            <Bot className="w-4 h-4 mr-2" />
            {triggeringEngine ? 'Running...' : '⚡ Run Engine Now'}
          </Button>
        </div>

        {/* Diagnostics from last run */}
        {lastRunDiagnostics && (
          <Card className="border-primary/30">
            <CardContent className="py-3">
              <p className="text-xs font-medium text-foreground mb-2">Last Engine Run Results</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div><span className="text-muted-foreground">Posts scanned:</span> <strong>{lastRunDiagnostics.postsScanned}</strong></div>
                <div><span className="text-muted-foreground">Human posts:</span> <strong>{lastRunDiagnostics.humanPosts}</strong></div>
                <div><span className="text-muted-foreground">Persona skipped:</span> <strong>{lastRunDiagnostics.personaPostsSkipped}</strong></div>
                <div><span className="text-muted-foreground">Target mismatch:</span> <strong>{lastRunDiagnostics.targetMismatchSkipped}</strong></div>
                <div><span className="text-muted-foreground">Already queued:</span> <strong>{lastRunDiagnostics.alreadyQueued}</strong></div>
                <div><span className="text-muted-foreground">Daily cap:</span> <strong>{lastRunDiagnostics.dailyCapSkipped}</strong></div>
                <div><span className="text-muted-foreground">Probability skip:</span> <strong>{lastRunDiagnostics.probabilitySkipped}</strong></div>
                <div><span className="text-muted-foreground text-green-600">Queued:</span> <strong className="text-green-600">{lastRunDiagnostics.queued}</strong></div>
                <div><span className="text-muted-foreground text-green-600">Executed:</span> <strong className="text-green-600">{lastRunDiagnostics.executed}</strong></div>
                <div><span className="text-muted-foreground text-destructive">Failed:</span> <strong className="text-destructive">{lastRunDiagnostics.failed}</strong></div>
              </div>
              {lastRunDiagnostics.errors?.length > 0 && (
                <div className="mt-2 text-xs text-destructive">
                  {lastRunDiagnostics.errors.map((e: string, i: number) => <p key={i}>⚠ {e}</p>)}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card><CardContent className="py-3 text-center"><p className="text-2xl font-bold text-yellow-500">{queueStats.pending}</p><p className="text-xs text-muted-foreground">Pending</p></CardContent></Card>
          <Card><CardContent className="py-3 text-center"><p className="text-2xl font-bold text-green-500">{queueStats.completed}</p><p className="text-xs text-muted-foreground">Completed</p></CardContent></Card>
          <Card><CardContent className="py-3 text-center"><p className="text-2xl font-bold text-red-500">{queueStats.failed}</p><p className="text-xs text-muted-foreground">Failed</p></CardContent></Card>
        </div>

        <Tabs defaultValue="autonomous">
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="autonomous">🤖 Autonomous</TabsTrigger>
            <TabsTrigger value="manual">🎯 Manual</TabsTrigger>
            <TabsTrigger value="queue">📋 Queue ({queue.length})</TabsTrigger>
            <TabsTrigger value="activity">📊 Activity ({activity.length})</TabsTrigger>
            <TabsTrigger value="guide">📖 How To Use</TabsTrigger>
          </TabsList>

          {/* TAB 1: Autonomous Mode */}
          <TabsContent value="autonomous" className="space-y-4">
            {activePersonas.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">
                <Bot className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No active personas. Create personas first.</p>
              </CardContent></Card>
            ) : (
              activePersonas.map(persona => (
                <Card key={persona.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between text-base">
                      <span className="flex items-center gap-2">
                        <Bot className="w-4 h-4 text-primary" />
                        {persona.name}
                        <Badge variant="outline" className="text-xs">{persona.niche}</Badge>
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Toggles */}
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2 text-sm"><Heart className="w-3.5 h-3.5 text-red-500" /> Auto-Like</Label>
                        <Switch checked={persona.auto_like_enabled} onCheckedChange={v => updatePersonaField(persona.id, 'auto_like_enabled', v)} />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2 text-sm"><MessageSquare className="w-3.5 h-3.5 text-blue-500" /> Auto-Comment</Label>
                        <Switch checked={persona.auto_comment_enabled} onCheckedChange={v => updatePersonaField(persona.id, 'auto_comment_enabled', v)} />
                      </div>
                    </div>

                    {/* Like delay */}
                    {persona.auto_like_enabled && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Like Delay: {persona.like_delay_min}–{persona.like_delay_max} min</Label>
                        <div className="flex gap-2 items-center mt-1">
                          <span className="text-xs w-8">{persona.like_delay_min}m</span>
                          <Slider min={1} max={30} step={1} value={[persona.like_delay_min, persona.like_delay_max]}
                            onValueChange={([min, max]: number[]) => { updatePersonaField(persona.id, 'like_delay_min', min); updatePersonaField(persona.id, 'like_delay_max', max); }} className="flex-1" />
                          <span className="text-xs w-8">{persona.like_delay_max}m</span>
                        </div>
                      </div>
                    )}

                    {/* Comment delay */}
                    {persona.auto_comment_enabled && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Comment Delay: {persona.comment_delay_min}–{persona.comment_delay_max} min</Label>
                        <div className="flex gap-2 items-center mt-1">
                          <span className="text-xs w-8">{persona.comment_delay_min}m</span>
                          <Slider min={1} max={60} step={1} value={[persona.comment_delay_min, persona.comment_delay_max]}
                            onValueChange={([min, max]: number[]) => { updatePersonaField(persona.id, 'comment_delay_min', min); updatePersonaField(persona.id, 'comment_delay_max', max); }} className="flex-1" />
                          <span className="text-xs w-8">{persona.comment_delay_max}m</span>
                        </div>
                      </div>
                    )}

                    {/* Max per day & probability */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">Max Engagements/Day: {persona.max_engagements_per_day}</Label>
                        <Slider min={1} max={50} step={1} value={[persona.max_engagements_per_day]}
                          onValueChange={([v]: number[]) => updatePersonaField(persona.id, 'max_engagements_per_day', v)} className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Engage Probability: {persona.engagement_probability}%</Label>
                        <Slider min={10} max={100} step={5} value={[persona.engagement_probability]}
                          onValueChange={([v]: number[]) => updatePersonaField(persona.id, 'engagement_probability', v)} className="mt-1" />
                      </div>
                    </div>

                    {/* Target Users */}
                    <div>
                      <Label className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                        <Users className="w-3.5 h-3.5" /> Target Users (empty = all users)
                      </Label>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {(persona.target_user_ids || []).map((uid: string) => {
                          const u = allUsers.find(u => u.id === uid);
                          return (
                            <Badge key={uid} variant="secondary" className="gap-1 text-xs">
                              {u?.full_name || u?.username || uid.slice(0, 8)}
                              <button className="ml-0.5 hover:text-destructive" onClick={() => {
                                updatePersonaField(persona.id, 'target_user_ids', persona.target_user_ids.filter((id: string) => id !== uid));
                              }}>×</button>
                            </Badge>
                          );
                        })}
                      </div>
                      <Input
                        placeholder="Search users to add..."
                        value={userSearch[persona.id] || ''}
                        onChange={e => setUserSearch(prev => ({ ...prev, [persona.id]: e.target.value }))}
                        className="h-8 text-xs"
                      />
                      {(userSearch[persona.id] || '').length >= 2 && (
                        <div className="mt-1 max-h-32 overflow-y-auto border rounded-lg p-1 bg-background">
                          {allUsers
                            .filter(u => !persona.target_user_ids.includes(u.id))
                            .filter(u => {
                              const q = (userSearch[persona.id] || '').toLowerCase();
                              return (u.full_name || '').toLowerCase().includes(q) || (u.username || '').toLowerCase().includes(q);
                            })
                            .slice(0, 10)
                            .map(u => (
                              <div
                                key={u.id}
                                className="px-2 py-1.5 text-xs hover:bg-accent rounded cursor-pointer"
                                onClick={() => {
                                  updatePersonaField(persona.id, 'target_user_ids', [...persona.target_user_ids, u.id]);
                                  setUserSearch(prev => ({ ...prev, [persona.id]: '' }));
                                }}
                              >
                                {u.full_name} {u.username ? `(@${u.username})` : ''}
                              </div>
                            ))
                          }
                        </div>
                      )}
                    </div>

                    <Button size="sm" onClick={() => handleSavePersonaConfig(persona)} disabled={savingPersona === persona.id}>
                      {savingPersona === persona.id ? 'Saving...' : 'Save Config'}
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* TAB 2: Manual Trigger */}
          <TabsContent value="manual" className="space-y-4">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div>
                  <Label>Select Post</Label>
                  <Input placeholder="Search posts..." value={postSearch} onChange={e => setPostSearch(e.target.value)} className="mb-2" />
                  <div className="max-h-48 overflow-y-auto space-y-2 border rounded-lg p-2">
                    {filteredPosts.map(p => (
                      <div key={p.id} className={`p-2 rounded-lg cursor-pointer text-sm transition-colors ${selectedPost === p.id ? 'bg-primary/10 border border-primary/30' : 'hover:bg-accent'}`} onClick={() => setSelectedPost(p.id)}>
                        <span className="font-medium text-foreground">{(p.profiles as any)?.full_name || (p.profiles as any)?.username || 'Unknown'}</span>
                        <p className="text-muted-foreground line-clamp-2">{p.content}</p>
                      </div>
                    ))}
                    {filteredPosts.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No posts found</p>}
                  </div>
                </div>

                <div>
                  <Label>Select Personas</Label>
                  <div className="flex gap-2 flex-wrap mt-2">
                    {activePersonas.map(p => (
                      <Badge key={p.id} variant={selectedPersonas.includes(p.id) ? 'default' : 'outline'} className="cursor-pointer" onClick={() => togglePersona(p.id)}>
                        {p.name}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch checked={generateDiscussion} onCheckedChange={setGenerateDiscussion} />
                  <Label>Generate Discussion Thread</Label>
                  <Zap className="w-4 h-4 text-yellow-500" />
                </div>

                <Button onClick={handleGenerate} disabled={generating || !selectedPost || selectedPersonas.length === 0} className="w-full">
                  <Sparkles className="w-4 h-4 mr-2" />
                  {generating ? 'Generating...' : `Generate ${selectedPersonas.length} Comment(s)`}
                </Button>

                {results.length > 0 && (
                  <div className="space-y-3">
                    <Label>Generated Comments (posted)</Label>
                    {results.map((r, i) => (
                      <div key={i} className="bg-accent/50 rounded-lg p-3">
                        <p className="text-sm font-medium text-foreground mb-1">{r.persona_name}</p>
                        <p className="text-sm text-muted-foreground">{r.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: Engagement Queue */}
          <TabsContent value="queue" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                {['all', 'pending', 'completed', 'failed'].map(f => (
                  <Badge key={f} variant={queueFilter === f ? 'default' : 'outline'} className="cursor-pointer capitalize" onClick={() => setQueueFilter(f)}>
                    {f}
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={fetchQueue}><RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh</Button>
                {queueStats.pending > 0 && (
                  <Button size="sm" variant="destructive" onClick={handleCancelPending}><Trash2 className="w-3.5 h-3.5 mr-1" /> Cancel Pending</Button>
                )}
              </div>
            </div>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Persona</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Scheduled</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredQueue.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No queue items</TableCell></TableRow>
                    ) : (
                      filteredQueue.map(item => (
                        <TableRow key={item.id}>
                          <TableCell className="text-sm font-medium">{getPersonaName(item.persona_id)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {item.action_type === 'like' ? '❤️ Like' : '💬 Comment'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{new Date(item.scheduled_at).toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant={item.status === 'completed' ? 'default' : item.status === 'failed' ? 'destructive' : 'secondary'} className="text-xs">
                              {item.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 4: Activity Log */}
          <TabsContent value="activity" className="space-y-2">
            {activity.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground"><MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" /><p>No activity yet</p></CardContent></Card>
            ) : (
              activity.map(a => (
                <Card key={a.id}>
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {a.action_type === 'like_added' ? <Heart className="w-3.5 h-3.5 text-red-500" /> : <MessageSquare className="w-3.5 h-3.5 text-blue-500" />}
                        <span className="text-sm font-medium text-foreground">{getPersonaName(a.persona_id)}</span>
                        <span className="text-xs text-muted-foreground">{a.action_type === 'like_added' ? 'liked' : 'commented'}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span>
                    </div>
                    {a.details?.content && <p className="text-xs text-muted-foreground mt-1 line-clamp-2 ml-6">{a.details.content}</p>}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* TAB 5: How To Use */}
          <TabsContent value="guide">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" /> How To Use</CardTitle></CardHeader>
              <CardContent className="prose prose-sm dark:prose-invert max-w-none">
                <h3>Autonomous Mode (Recommended)</h3>
                <ol>
                  <li><strong>Configure each persona</strong> in the "Autonomous" tab — set delays, probability, daily caps.</li>
                  <li><strong>Enable Auto-Like and/or Auto-Comment</strong> per persona.</li>
                  <li><strong>The engine runs every 5 minutes via cron.</strong> It finds new human posts (last 6 hours) and schedules likes/comments with random delays.</li>
                  <li><strong>Recommended settings:</strong> Like delay 3–15 min, Comment delay 10–45 min, Probability 70–90%.</li>
                  <li>Use <strong>"Run Engine Now"</strong> button to trigger immediately for testing.</li>
                </ol>

                <h3>How Timing Works</h3>
                <ul>
                  <li>When a human posts, nothing happens immediately.</li>
                  <li>Each persona gets a random delay within its configured range.</li>
                  <li>Likes come first (shorter delay), comments later (longer delay).</li>
                  <li>The probability dice means not every persona engages every post — making it look natural.</li>
                </ul>

                <h3>Manual Trigger</h3>
                <p>Use the "Manual" tab to pick a specific post and personas for on-demand comment generation. Comments post instantly.</p>

                <h3>Queue & Activity</h3>
                <ul>
                  <li><strong>Queue tab:</strong> See all pending/completed/failed actions. Cancel pending items if needed.</li>
                  <li><strong>Activity tab:</strong> Historical log of all likes and comments made by personas.</li>
                </ul>

                <h3>Example Flow</h3>
                <div className="bg-accent/50 rounded-lg p-3 text-sm">
                  <p>1. User "Priya" publishes a post at 2:00 PM</p>
                  <p>2. Engine runs at 2:05 PM → queues like for persona "Arjun" at 2:08 PM, comment at 2:22 PM</p>
                  <p>3. Engine runs at 2:10 PM → executes Arjun's like (scheduled for 2:08)</p>
                  <p>4. Engine runs at 2:25 PM → executes Arjun's comment (scheduled for 2:22)</p>
                  <p>5. Result: natural-looking engagement with realistic delays ✓</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
