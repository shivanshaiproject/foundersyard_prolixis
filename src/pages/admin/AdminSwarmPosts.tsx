import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bot, Sparkles, Send, Clock, ArrowLeft, Trash2, CalendarPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface Persona {
  id: string;
  name: string;
  niche: string;
  posting_topics: string[];
  user_id: string;
  posting_days: number[] | null;
  posting_times: string[] | null;
}

interface QueueItem {
  id: string;
  persona_id: string;
  content: string;
  topic: string | null;
  status: string;
  scheduled_at: string | null;
  created_at: string;
}

export default function AdminSwarmPosts() {
  const navigate = useNavigate();
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [selectedPersona, setSelectedPersona] = useState('');
  const [topic, setTopic] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [scheduleAt, setScheduleAt] = useState('');
  // Bulk schedule
  const [bulkPersonas, setBulkPersonas] = useState<string[]>([]);
  const [bulkDays, setBulkDays] = useState(7);
  const [bulkScheduling, setBulkScheduling] = useState(false);

  useEffect(() => {
    fetchPersonas();
    fetchQueue();
  }, []);

  const fetchPersonas = async () => {
    const { data } = await supabase.from('swarm_personas').select('id, name, niche, posting_topics, user_id, posting_days, posting_times').eq('is_active', true) as any;
    setPersonas(data || []);
  };

  const fetchQueue = async () => {
    const { data } = await supabase.from('swarm_post_queue').select('*').in('status', ['draft', 'scheduled']).order('created_at', { ascending: false }) as any;
    setQueue(data || []);
  };

  const handleGenerate = async () => {
    if (!selectedPersona) { toast({ title: 'Select a persona', variant: 'destructive' }); return; }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('swarm-generate-post', {
        body: { persona_id: selectedPersona, topic: topic || undefined, publish_now: false },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setGeneratedContent(data.content);
      toast({ title: 'Post generated! Review and edit before publishing.' });
      fetchQueue();
    } catch (e: any) {
      toast({ title: 'Generation failed', description: e.message, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const handlePublishNow = async () => {
    if (!selectedPersona || !generatedContent) return;
    setPublishing(true);
    try {
      const { data, error } = await supabase.functions.invoke('swarm-generate-post', {
        body: { persona_id: selectedPersona, topic: topic || undefined, publish_now: true },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: 'Post published!' });
      setGeneratedContent('');
      setTopic('');
    } catch (e: any) {
      toast({ title: 'Publish failed', description: e.message, variant: 'destructive' });
    } finally {
      setPublishing(false);
    }
  };

  const handleSchedule = async (queueId: string) => {
    if (!scheduleAt) { toast({ title: 'Set a schedule time', variant: 'destructive' }); return; }
    await supabase.from('swarm_post_queue').update({ status: 'scheduled', scheduled_at: new Date(scheduleAt).toISOString() }).eq('id', queueId) as any;
    toast({ title: 'Post scheduled' });
    setScheduleAt('');
    fetchQueue();
  };

  const handleDeleteQueue = async (id: string) => {
    await supabase.from('swarm_post_queue').delete().eq('id', id) as any;
    fetchQueue();
  };

  const handleBulkSchedule = async () => {
    if (bulkPersonas.length === 0) { toast({ title: 'Select personas', variant: 'destructive' }); return; }
    setBulkScheduling(true);
    try {
      const slots: any[] = [];
      const now = new Date();

      for (const personaId of bulkPersonas) {
        const persona = personas.find(p => p.id === personaId);
        if (!persona) continue;

        const days = persona.posting_days || [1, 2, 3, 4, 5];
        const times = persona.posting_times || ['10:00', '15:00'];

        for (let d = 0; d < bulkDays; d++) {
          const date = new Date(now);
          date.setDate(date.getDate() + d);
          const dayOfWeek = date.getDay();

          if (!days.includes(dayOfWeek)) continue;

          for (const time of times) {
            const [h, m] = time.split(':').map(Number);
            const scheduled = new Date(date);
            scheduled.setHours(h, m, 0, 0);
            if (scheduled <= now) continue;

            slots.push({
              persona_id: personaId,
              content: `[Pending generation]`,
              topic: persona.posting_topics?.[Math.floor(Math.random() * (persona.posting_topics?.length || 1))] || 'building in public',
              status: 'scheduled',
              scheduled_at: scheduled.toISOString(),
            });
          }
        }
      }

      if (slots.length === 0) {
        toast({ title: 'No slots created — check posting days/times', variant: 'destructive' });
        return;
      }

      const { error } = await supabase.from('swarm_post_queue').insert(slots) as any;
      if (error) throw error;
      toast({ title: `${slots.length} slots created!`, description: 'Generate content for each slot individually.' });
      fetchQueue();
    } catch (e: any) {
      toast({ title: 'Bulk schedule failed', description: e.message, variant: 'destructive' });
    } finally {
      setBulkScheduling(false);
    }
  };

  const toggleBulkPersona = (id: string) => {
    setBulkPersonas(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  const getPersonaName = (id: string) => personas.find(p => p.id === id)?.name || 'Unknown';
  const currentPersona = personas.find(p => p.id === selectedPersona);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/swarm')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Post Automator</h1>
            <p className="text-muted-foreground">Generate, bulk schedule, and manage persona posts</p>
          </div>
        </div>

        <Tabs defaultValue="generate">
          <TabsList>
            <TabsTrigger value="generate">Generate</TabsTrigger>
            <TabsTrigger value="bulk">Bulk Schedule</TabsTrigger>
            <TabsTrigger value="queue">Queue ({queue.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="generate" className="space-y-4">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div>
                  <Label>Select Persona</Label>
                  <select className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm" value={selectedPersona} onChange={e => setSelectedPersona(e.target.value)}>
                    <option value="">Choose a persona...</option>
                    {personas.map(p => <option key={p.id} value={p.id}>{p.name} ({p.niche})</option>)}
                  </select>
                </div>

                {currentPersona?.posting_topics?.length ? (
                  <div>
                    <Label>Quick Topics</Label>
                    <div className="flex gap-2 flex-wrap mt-1">
                      {currentPersona.posting_topics.map(t => (
                        <Badge key={t} variant="outline" className="cursor-pointer hover:bg-primary/10" onClick={() => setTopic(t)}>{t}</Badge>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div>
                  <Label>Topic / Prompt</Label>
                  <Input value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. SaaS pricing strategies, first 100 users..." />
                </div>

                <Button onClick={handleGenerate} disabled={generating || !selectedPersona} className="w-full">
                  <Sparkles className="w-4 h-4 mr-2" />
                  {generating ? 'Generating with Gemini...' : 'Generate Post'}
                </Button>

                {generatedContent && (
                  <div className="space-y-3">
                    <Label>Generated Content (edit before publishing)</Label>
                    <Textarea value={generatedContent} onChange={e => setGeneratedContent(e.target.value)} rows={5} />
                    <div className="flex gap-2">
                      <Button onClick={handlePublishNow} disabled={publishing} className="flex-1">
                        <Send className="w-4 h-4 mr-2" /> {publishing ? 'Publishing...' : 'Publish Now'}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bulk" className="space-y-4">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <p className="text-sm text-muted-foreground">Create scheduled slots for multiple personas based on their posting days and times. Content is generated separately.</p>
                <div>
                  <Label>Select Personas</Label>
                  <div className="flex gap-2 flex-wrap mt-2">
                    {personas.map(p => (
                      <Badge key={p.id} variant={bulkPersonas.includes(p.id) ? 'default' : 'outline'} className="cursor-pointer" onClick={() => toggleBulkPersona(p.id)}>
                        {p.name}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Days Ahead</Label>
                  <Input type="number" value={bulkDays} onChange={e => setBulkDays(parseInt(e.target.value) || 7)} min={1} max={30} />
                </div>
                <Button onClick={handleBulkSchedule} disabled={bulkScheduling || bulkPersonas.length === 0} className="w-full">
                  <CalendarPlus className="w-4 h-4 mr-2" />
                  {bulkScheduling ? 'Creating Slots...' : `Create Schedule for ${bulkPersonas.length} Persona(s)`}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="queue" className="space-y-4">
            {queue.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground"><Bot className="w-12 h-12 mx-auto mb-3 opacity-50" /><p>No posts in queue</p></CardContent></Card>
            ) : (
              queue.map(item => (
                <Card key={item.id}>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={item.status === 'scheduled' ? 'default' : 'secondary'}>{item.status}</Badge>
                          <span className="text-sm text-muted-foreground">by {getPersonaName(item.persona_id)}</span>
                          {item.topic && <Badge variant="outline">{item.topic}</Badge>}
                        </div>
                        <p className="text-sm text-foreground">{item.content}</p>
                        {item.scheduled_at && <p className="text-xs text-muted-foreground mt-1"><Clock className="w-3 h-3 inline mr-1" />{new Date(item.scheduled_at).toLocaleString()}</p>}
                      </div>
                      <div className="flex flex-col gap-2">
                        {item.status === 'draft' && (
                          <div className="flex items-center gap-2">
                            <Input type="datetime-local" value={scheduleAt} onChange={e => setScheduleAt(e.target.value)} className="text-xs w-44" />
                            <Button size="sm" onClick={() => handleSchedule(item.id)}><Clock className="w-3 h-3" /></Button>
                          </div>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteQueue(item.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
