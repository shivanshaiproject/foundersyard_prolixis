import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bot, Plus, Pencil, Trash2, User, ArrowLeft, Brain, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface Persona {
  id: string;
  user_id: string;
  name: string;
  niche: string;
  personality: string;
  bio_prompt: string | null;
  posting_topics: string[];
  is_active: boolean;
  auto_comment_enabled: boolean;
  comment_delay_min: number;
  comment_delay_max: number;
  posts_per_day: number;
  posting_days: number[] | null;
  posting_times: string[] | null;
  interaction_ratio: number | null;
}

interface PersonaMemory {
  id: string;
  persona_id: string;
  project_name: string;
  project_description: string | null;
  current_stage: string | null;
  current_day_count: number;
  last_action: string | null;
  last_post_content: string | null;
  last_post_date: string | null;
  milestones: any;
  tone_style: string | null;
}

interface Profile {
  id: string;
  full_name: string | null;
  username: string | null;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const TONE_OPTIONS = ['professional', 'hinglish-casual', 'quirky', 'motivational', 'technical', 'storyteller'];
const STAGE_OPTIONS = ['Ideation', 'Coding MVP', 'Building Features', 'Getting First Users', 'Fixing Bugs', 'Scaling', 'Launching', 'Post-Launch', 'Pivoting', 'Fundraising'];

const defaultForm = {
  user_id: '',
  name: '',
  niche: 'SaaS',
  personality: 'friendly, supportive, insightful',
  bio_prompt: '',
  posting_topics: '',
  is_active: true,
  auto_comment_enabled: false,
  comment_delay_min: 6,
  comment_delay_max: 15,
  posts_per_day: 2,
  posting_days: [1, 2, 3, 4, 5] as number[],
  posting_times: '10:00, 15:00',
  interaction_ratio: 80,
};

const defaultMemory = {
  project_name: '',
  project_description: '',
  current_stage: 'Ideation',
  current_day_count: 1,
  tone_style: 'professional',
};

export default function AdminSwarmPersonas() {
  const navigate = useNavigate();
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [memories, setMemories] = useState<Record<string, PersonaMemory>>({});
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [memoryForm, setMemoryForm] = useState(defaultMemory);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPersonas();
    fetchProfiles();
  }, []);

  const fetchPersonas = async () => {
    const { data } = await supabase.from('swarm_personas').select('*').order('created_at', { ascending: false }) as any;
    setPersonas(data || []);
    if (data?.length) fetchMemories(data.map((p: any) => p.id));
  };

  const fetchMemories = async (personaIds: string[]) => {
    const { data } = await supabase.from('persona_memory').select('*').in('persona_id', personaIds) as any;
    const map: Record<string, PersonaMemory> = {};
    (data || []).forEach((m: PersonaMemory) => { map[m.persona_id] = m; });
    setMemories(map);
  };

  const fetchProfiles = async () => {
    const { data } = await supabase.from('profiles').select('id, full_name, username').order('full_name');
    setProfiles(data || []);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const payload = {
        user_id: form.user_id,
        name: form.name,
        niche: form.niche,
        personality: form.personality,
        bio_prompt: form.bio_prompt || null,
        posting_topics: form.posting_topics.split(',').map(t => t.trim()).filter(Boolean),
        is_active: form.is_active,
        auto_comment_enabled: form.auto_comment_enabled,
        comment_delay_min: form.comment_delay_min,
        comment_delay_max: form.comment_delay_max,
        posts_per_day: form.posts_per_day,
        posting_days: form.posting_days,
        posting_times: form.posting_times.split(',').map(t => t.trim()).filter(Boolean),
        interaction_ratio: form.interaction_ratio,
      };

      let personaId = editingId;

      if (editingId) {
        const { error } = await supabase.from('swarm_personas').update(payload).eq('id', editingId) as any;
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('swarm_personas').insert(payload).select('id').single() as any;
        if (error) throw error;
        personaId = data.id;
      }

      // Save memory
      if (personaId && memoryForm.project_name) {
        const memPayload = {
          persona_id: personaId,
          project_name: memoryForm.project_name,
          project_description: memoryForm.project_description || null,
          current_stage: memoryForm.current_stage,
          current_day_count: memoryForm.current_day_count,
          tone_style: memoryForm.tone_style,
        };

        const { error: memErr } = await supabase.from('persona_memory').upsert(memPayload, { onConflict: 'persona_id' }) as any;
        if (memErr) console.error('Memory save error:', memErr);
      }

      toast({ title: editingId ? 'Persona updated' : 'Persona created' });
      setDialogOpen(false);
      setEditingId(null);
      setForm(defaultForm);
      setMemoryForm(defaultMemory);
      fetchPersonas();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (p: Persona) => {
    setEditingId(p.id);
    setForm({
      user_id: p.user_id,
      name: p.name,
      niche: p.niche,
      personality: p.personality,
      bio_prompt: p.bio_prompt || '',
      posting_topics: p.posting_topics?.join(', ') || '',
      is_active: p.is_active,
      auto_comment_enabled: p.auto_comment_enabled,
      comment_delay_min: p.comment_delay_min,
      comment_delay_max: p.comment_delay_max,
      posts_per_day: p.posts_per_day,
      posting_days: p.posting_days || [1, 2, 3, 4, 5],
      posting_times: p.posting_times?.join(', ') || '10:00, 15:00',
      interaction_ratio: p.interaction_ratio || 80,
    });
    const mem = memories[p.id];
    if (mem) {
      setMemoryForm({
        project_name: mem.project_name || '',
        project_description: mem.project_description || '',
        current_stage: mem.current_stage || 'Ideation',
        current_day_count: mem.current_day_count || 1,
        tone_style: mem.tone_style || 'professional',
      });
    } else {
      setMemoryForm(defaultMemory);
    }
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this persona?')) return;
    await supabase.from('swarm_personas').delete().eq('id', id) as any;
    toast({ title: 'Persona deleted' });
    fetchPersonas();
  };

  const handleToggleActive = async (id: string, active: boolean) => {
    await supabase.from('swarm_personas').update({ is_active: active }).eq('id', id) as any;
    fetchPersonas();
  };

  const toggleDay = (day: number) => {
    setForm(prev => ({
      ...prev,
      posting_days: prev.posting_days.includes(day)
        ? prev.posting_days.filter(d => d !== day)
        : [...prev.posting_days, day].sort(),
    }));
  };

  const getProfileLabel = (userId: string) => {
    const p = profiles.find(pr => pr.id === userId);
    return p ? `${p.full_name || p.username || 'Unknown'}` : userId.slice(0, 8);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin/swarm')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Persona Manager</h1>
              <p className="text-muted-foreground">Create and manage AI personas with memory & scheduling</p>
            </div>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setEditingId(null); setForm(defaultForm); setMemoryForm(defaultMemory); } }}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" /> Add Persona</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? 'Edit Persona' : 'Add Persona'}</DialogTitle>
                <DialogDescription>Configure persona identity, project memory, and posting schedule.</DialogDescription>
              </DialogHeader>
              <Tabs defaultValue="identity" className="mt-2">
                <TabsList className="w-full">
                  <TabsTrigger value="identity" className="flex-1">Identity</TabsTrigger>
                  <TabsTrigger value="memory" className="flex-1"><Brain className="w-3 h-3 mr-1" /> Memory</TabsTrigger>
                  <TabsTrigger value="schedule" className="flex-1"><Calendar className="w-3 h-3 mr-1" /> Schedule</TabsTrigger>
                </TabsList>

                <TabsContent value="identity" className="space-y-4 mt-4">
                  <div>
                    <Label>Linked Account</Label>
                    <select className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.user_id} onChange={e => setForm({ ...form, user_id: e.target.value })}>
                      <option value="">Select account...</option>
                      {profiles.map(p => (
                        <option key={p.id} value={p.id}>{p.full_name || p.username || p.id.slice(0, 8)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Display Name (internal label)</Label>
                    <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Alex from StartupKit" />
                  </div>
                  <div>
                    <Label>Niche</Label>
                    <Input value={form.niche} onChange={e => setForm({ ...form, niche: e.target.value })} placeholder="e.g. SaaS, D2C, AI/ML" />
                  </div>
                  <div>
                    <Label>Personality</Label>
                    <Textarea value={form.personality} onChange={e => setForm({ ...form, personality: e.target.value })} placeholder="e.g. optimistic, data-driven, shares metrics" rows={2} />
                  </div>
                  <div>
                    <Label>Bio Prompt (LLM context)</Label>
                    <Textarea value={form.bio_prompt} onChange={e => setForm({ ...form, bio_prompt: e.target.value })} placeholder="Background story for the AI to reference" rows={3} />
                  </div>
                  <div>
                    <Label>Posting Topics (comma-separated)</Label>
                    <Input value={form.posting_topics} onChange={e => setForm({ ...form, posting_topics: e.target.value })} placeholder="SaaS launch, pricing, growth" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
                    <Label>Active</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={form.auto_comment_enabled} onCheckedChange={v => setForm({ ...form, auto_comment_enabled: v })} />
                    <Label>Eligible for auto-commenting</Label>
                  </div>
                </TabsContent>

                <TabsContent value="memory" className="space-y-4 mt-4">
                  <p className="text-sm text-muted-foreground">This is the persona's "memory" — what they're building, their stage, tone. The AI reads this before every post.</p>
                  <div>
                    <Label>Project Name</Label>
                    <Input value={memoryForm.project_name} onChange={e => setMemoryForm({ ...memoryForm, project_name: e.target.value })} placeholder="e.g. KiranaOS - CRM for Kirana stores" />
                  </div>
                  <div>
                    <Label>Project Description</Label>
                    <Input value={memoryForm.project_description} onChange={e => setMemoryForm({ ...memoryForm, project_description: e.target.value })} placeholder="One-liner about the project" />
                  </div>
                  <div>
                    <Label>Current Stage</Label>
                    <select className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm" value={memoryForm.current_stage} onChange={e => setMemoryForm({ ...memoryForm, current_stage: e.target.value })}>
                      {STAGE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label>Day Count (#BuildInPublic Day N)</Label>
                    <Input type="number" value={memoryForm.current_day_count} onChange={e => setMemoryForm({ ...memoryForm, current_day_count: parseInt(e.target.value) || 1 })} min={1} />
                  </div>
                  <div>
                    <Label>Tone Style</Label>
                    <select className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm" value={memoryForm.tone_style} onChange={e => setMemoryForm({ ...memoryForm, tone_style: e.target.value })}>
                      {TONE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </TabsContent>

                <TabsContent value="schedule" className="space-y-4 mt-4">
                  <div>
                    <Label>Posting Days</Label>
                    <div className="flex gap-2 mt-2">
                      {DAY_LABELS.map((label, i) => (
                        <Badge
                          key={i}
                          variant={form.posting_days.includes(i) ? 'default' : 'outline'}
                          className="cursor-pointer"
                          onClick={() => toggleDay(i)}
                        >
                          {label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label>Posting Times (comma-separated, 24h format)</Label>
                    <Input value={form.posting_times} onChange={e => setForm({ ...form, posting_times: e.target.value })} placeholder="09:00, 14:00, 20:00" />
                  </div>
                  <div>
                    <Label>Posts/Day Target</Label>
                    <Input type="number" value={form.posts_per_day} onChange={e => setForm({ ...form, posts_per_day: parseInt(e.target.value) || 1 })} min={1} max={10} />
                  </div>
                  <div>
                    <Label>Interaction Ratio: {form.interaction_ratio}% comments / {100 - form.interaction_ratio}% posts</Label>
                    <Slider value={[form.interaction_ratio]} onValueChange={([v]) => setForm({ ...form, interaction_ratio: v })} min={0} max={100} step={5} className="mt-2" />
                    <p className="text-xs text-muted-foreground mt-1">How much of this persona's activity is commenting on others vs their own posts</p>
                  </div>
                </TabsContent>
              </Tabs>

              <Button onClick={handleSave} disabled={loading || !form.user_id || !form.name} className="w-full mt-4">
                {loading ? 'Saving...' : editingId ? 'Update Persona' : 'Create Persona'}
              </Button>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4">
          {personas.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Bot className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No personas yet. Create your first one to get started.</p>
              </CardContent>
            </Card>
          ) : (
            personas.map(p => {
              const mem = memories[p.id];
              return (
                <Card key={p.id} className={!p.is_active ? 'opacity-60' : ''}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-foreground">{p.name}</h3>
                            <Badge variant={p.is_active ? 'default' : 'secondary'}>{p.is_active ? 'Active' : 'Inactive'}</Badge>
                            {p.auto_comment_enabled && <Badge variant="outline">Auto-comment</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {p.niche} · {getProfileLabel(p.user_id)} · {p.posts_per_day}/day
                          </p>
                          {mem?.project_name && (
                            <p className="text-xs text-muted-foreground mt-1">
                              <Brain className="w-3 h-3 inline mr-1" />
                              Building: {mem.project_name} · Day {mem.current_day_count} · {mem.current_stage}
                            </p>
                          )}
                          {p.posting_days && (
                            <div className="flex gap-1 mt-1">
                              {p.posting_days.map(d => <Badge key={d} variant="outline" className="text-[10px] px-1 py-0">{DAY_LABELS[d]}</Badge>)}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={p.is_active} onCheckedChange={(v) => handleToggleActive(p.id, v)} />
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(p)}><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
