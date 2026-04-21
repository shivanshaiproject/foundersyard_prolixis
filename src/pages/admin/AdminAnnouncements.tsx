import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { 
  Megaphone, 
  Plus, 
  Eye, 
  Users, 
  Percent,
  Trash2,
  Image as ImageIcon,
  Video,
  Link,
  Sparkles,
  Upload,
  X,
  Loader2,
  ChevronDown,
  ChevronUp,
  Check,
  Clock
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

type MediaType = 'image' | 'gif' | 'video' | null;

interface AnnouncementViewer {
  id: string;
  user_id: string;
  viewed_at: string;
  dismissed_at: string | null;
  profile: {
    full_name: string;
    avatar_url: string | null;
    username: string | null;
  } | null;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  media_url: string | null;
  media_type: MediaType;
  cta_text: string | null;
  cta_url: string | null;
  is_active: boolean;
  created_at: string;
  views_count?: number;
  dismiss_count?: number;
}

export default function AdminAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [expandedViewers, setExpandedViewers] = useState<Record<string, boolean>>({});
  const [viewersData, setViewersData] = useState<Record<string, AnnouncementViewer[]>>({});
  const [viewersLoading, setViewersLoading] = useState<Record<string, boolean>>({});
  const [viewersPagination, setViewersPagination] = useState<Record<string, number>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'gif' | 'video' | ''>('');
  const [ctaText, setCtaText] = useState('');
  const [ctaUrl, setCtaUrl] = useState('');
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);

  const VIEWERS_PER_PAGE = 10;

  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get view counts for each announcement
      const announcementsWithStats = await Promise.all(
        (data || []).map(async (announcement) => {
          const { count: viewsCount } = await supabase
            .from('announcement_views')
            .select('*', { count: 'exact', head: true })
            .eq('announcement_id', announcement.id);

          const { count: dismissCount } = await supabase
            .from('announcement_views')
            .select('*', { count: 'exact', head: true })
            .eq('announcement_id', announcement.id)
            .not('dismissed_at', 'is', null);

          return {
            ...announcement,
            media_type: announcement.media_type as MediaType,
            views_count: viewsCount || 0,
            dismiss_count: dismissCount || 0,
          } as Announcement;
        })
      );

      setAnnouncements(announcementsWithStats);
    } catch (error) {
      console.error('Error fetching announcements:', error);
      toast.error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  const fetchViewers = async (announcementId: string, loadMore = false) => {
    const currentPage = loadMore ? (viewersPagination[announcementId] || 0) + 1 : 0;
    
    setViewersLoading(prev => ({ ...prev, [announcementId]: true }));
    
    try {
      const { data, error } = await supabase
        .from('announcement_views')
        .select(`
          id,
          user_id,
          viewed_at,
          dismissed_at,
          profile:profiles!announcement_views_user_id_fkey(
            full_name,
            avatar_url,
            username
          )
        `)
        .eq('announcement_id', announcementId)
        .order('viewed_at', { ascending: false })
        .range(currentPage * VIEWERS_PER_PAGE, (currentPage + 1) * VIEWERS_PER_PAGE - 1);

      if (error) throw error;

      const typedData = (data || []).map(item => ({
        id: item.id,
        user_id: item.user_id,
        viewed_at: item.viewed_at,
        dismissed_at: item.dismissed_at,
        profile: item.profile as AnnouncementViewer['profile']
      }));

      setViewersData(prev => ({
        ...prev,
        [announcementId]: loadMore 
          ? [...(prev[announcementId] || []), ...typedData]
          : typedData
      }));
      setViewersPagination(prev => ({ ...prev, [announcementId]: currentPage }));
    } catch (error) {
      console.error('Error fetching viewers:', error);
      toast.error('Failed to load viewers');
    } finally {
      setViewersLoading(prev => ({ ...prev, [announcementId]: false }));
    }
  };

  const toggleViewers = (announcementId: string) => {
    const isExpanding = !expandedViewers[announcementId];
    setExpandedViewers(prev => ({ ...prev, [announcementId]: isExpanding }));
    
    if (isExpanding && !viewersData[announcementId]) {
      fetchViewers(announcementId);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large. Max 10MB allowed.');
      return;
    }

    // Determine media type
    let detectedType: 'image' | 'gif' | 'video' = 'image';
    if (file.type.startsWith('video/')) {
      detectedType = 'video';
    } else if (file.type === 'image/gif') {
      detectedType = 'gif';
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `announcements/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('announcements')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('announcements')
        .getPublicUrl(filePath);

      setMediaUrl(urlData.publicUrl);
      setMediaType(detectedType);
      setMediaPreview(urlData.publicUrl);
      toast.success('Media uploaded successfully!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload media');
    } finally {
      setUploading(false);
    }
  };

  const clearMedia = () => {
    setMediaUrl('');
    setMediaType('');
    setMediaPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCreate = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error('Title and content are required');
      return;
    }

    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.from('announcements').insert({
        title: title.trim(),
        content: content.trim(),
        media_url: mediaUrl.trim() || null,
        media_type: mediaType || null,
        cta_text: ctaText.trim() || null,
        cta_url: ctaUrl.trim() || null,
        created_by: user?.id,
        is_active: true,
      });

      if (error) throw error;

      toast.success('Announcement created and pushed to all users!');
      resetForm();
      setShowForm(false);
      fetchAnnouncements();
    } catch (error) {
      console.error('Error creating announcement:', error);
      toast.error('Failed to create announcement');
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('announcements')
        .update({ is_active: !isActive })
        .eq('id', id);

      if (error) throw error;

      toast.success(isActive ? 'Announcement deactivated' : 'Announcement activated');
      fetchAnnouncements();
    } catch (error) {
      console.error('Error toggling announcement:', error);
      toast.error('Failed to update announcement');
    }
  };

  const deleteAnnouncement = async (id: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;

    try {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Announcement deleted');
      fetchAnnouncements();
    } catch (error) {
      console.error('Error deleting announcement:', error);
      toast.error('Failed to delete announcement');
    }
  };

  const resetForm = () => {
    setTitle('');
    setContent('');
    setMediaUrl('');
    setMediaType('');
    setCtaText('');
    setCtaUrl('');
    setMediaPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
            <Megaphone className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Announcements</h1>
            <p className="text-muted-foreground">Push updates to all users</p>
          </div>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          <Plus className="w-4 h-4" />
          New Announcement
        </Button>
      </div>

      {/* Create Form */}
      {showForm && (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Create New Announcement
            </CardTitle>
            <CardDescription>
              This will be shown as a popup to all users when they open the app
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What's new in FoundersYard..."
                  maxLength={100}
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="content">Content *</Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Describe the update or announcement..."
                  rows={4}
                  maxLength={500}
                />
              </div>

              {/* Media Upload Section */}
              <div className="space-y-3 sm:col-span-2">
                <Label>Media (Optional)</Label>
                
                {/* Upload or Preview */}
                {mediaPreview || mediaUrl ? (
                  <div className="relative rounded-xl overflow-hidden bg-muted border border-border">
                    {mediaType === 'video' ? (
                      <video
                        src={mediaPreview || mediaUrl}
                        className="w-full aspect-video object-cover"
                        controls
                        muted
                      />
                    ) : (
                      <img
                        src={mediaPreview || mediaUrl}
                        alt="Preview"
                        className="w-full aspect-video object-cover"
                      />
                    )}
                    <button
                      onClick={clearMedia}
                      className="absolute top-2 right-2 p-2 rounded-full bg-destructive/90 hover:bg-destructive text-destructive-foreground transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="absolute bottom-2 left-2">
                      <Badge variant="secondary" className="capitalize">
                        {mediaType}
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <div 
                    className="relative border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploading ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        <p className="text-sm text-muted-foreground">Uploading...</p>
                      </div>
                    ) : (
                      <>
                        <div className="w-12 h-12 mx-auto rounded-full bg-muted flex items-center justify-center mb-3">
                          <Upload className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium text-foreground mb-1">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Images, GIFs, or Videos (max 10MB)
                        </p>
                      </>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,video/*"
                      onChange={handleFileSelect}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      disabled={uploading}
                    />
                  </div>
                )}

                {/* Or use URL */}
                {!mediaPreview && !mediaUrl && (
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground">or enter URL</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                )}
                
                {!mediaPreview && !mediaUrl && (
                  <div className="flex gap-2">
                    <Input
                      value={mediaUrl}
                      onChange={(e) => {
                        setMediaUrl(e.target.value);
                        if (e.target.value) {
                          setMediaPreview(e.target.value);
                        }
                      }}
                      placeholder="https://example.com/image.png"
                      className="flex-1"
                    />
                    <Select value={mediaType} onValueChange={(v) => setMediaType(v as 'image' | 'gif' | 'video' | '')}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="image">
                          <div className="flex items-center gap-2">
                            <ImageIcon className="w-4 h-4" />
                            Image
                          </div>
                        </SelectItem>
                        <SelectItem value="gif">
                          <div className="flex items-center gap-2">
                            <ImageIcon className="w-4 h-4" />
                            GIF
                          </div>
                        </SelectItem>
                        <SelectItem value="video">
                          <div className="flex items-center gap-2">
                            <Video className="w-4 h-4" />
                            Video
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="ctaText">Button Text (Optional)</Label>
                <Input
                  id="ctaText"
                  value={ctaText}
                  onChange={(e) => setCtaText(e.target.value)}
                  placeholder="Learn More"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ctaUrl">Button URL (Optional)</Label>
                <Input
                  id="ctaUrl"
                  value={ctaUrl}
                  onChange={(e) => setCtaUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button onClick={handleCreate} disabled={creating || uploading} className="gap-2">
                <Megaphone className="w-4 h-4" />
                {creating ? 'Publishing...' : 'Push to All Users'}
              </Button>
              <Button variant="outline" onClick={() => { resetForm(); setShowForm(false); }}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Announcements List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            Loading announcements...
          </div>
        ) : announcements.length === 0 ? (
          <Card className="text-center py-12">
            <p className="text-muted-foreground mb-4">No announcements yet</p>
            <Button onClick={() => setShowForm(true)} variant="outline">
              Create your first announcement
            </Button>
          </Card>
        ) : (
          announcements.map((announcement) => (
            <Card key={announcement.id} className={!announcement.is_active ? 'opacity-60' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Media preview */}
                  {announcement.media_url && (
                    <div className="w-20 h-20 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                      {announcement.media_type === 'video' ? (
                        <video
                          src={announcement.media_url}
                          className="w-full h-full object-cover"
                          muted
                        />
                      ) : (
                        <img
                          src={announcement.media_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <h3 className="font-semibold text-foreground">{announcement.title}</h3>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(announcement.created_at), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={announcement.is_active ? 'default' : 'secondary'}>
                          {announcement.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {announcement.content}
                    </p>

                    {/* CTA preview */}
                    {announcement.cta_text && (
                      <div className="flex items-center gap-2 text-xs text-primary mb-3">
                        <Link className="w-3 h-3" />
                        <span>{announcement.cta_text}</span>
                      </div>
                    )}

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        <span>{announcement.views_count} views</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        <span>{announcement.dismiss_count} dismissed</span>
                      </div>
                      {announcement.views_count && announcement.views_count > 0 && (
                        <div className="flex items-center gap-1">
                          <Percent className="w-3 h-3" />
                          <span>
                            {Math.round((announcement.dismiss_count || 0) / announcement.views_count * 100)}% completion
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={announcement.is_active}
                        onCheckedChange={() => toggleActive(announcement.id, announcement.is_active)}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => deleteAnnouncement(announcement.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Viewers Section */}
                <Collapsible 
                  open={expandedViewers[announcement.id]} 
                  onOpenChange={() => toggleViewers(announcement.id)}
                  className="mt-4 pt-4 border-t border-border"
                >
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-2 w-full justify-between">
                      <span className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        View Users ({announcement.views_count})
                      </span>
                      {expandedViewers[announcement.id] ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-4">
                    {viewersLoading[announcement.id] && !viewersData[announcement.id] ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : viewersData[announcement.id]?.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No viewers yet
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {viewersData[announcement.id]?.map((viewer) => (
                          <div 
                            key={viewer.id} 
                            className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                          >
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={viewer.profile?.avatar_url || ''} />
                              <AvatarFallback className="text-xs">
                                {viewer.profile?.full_name?.charAt(0) || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">
                                {viewer.profile?.full_name || 'Unknown User'}
                              </p>
                              {viewer.profile?.username && (
                                <p className="text-xs text-muted-foreground">
                                  @{viewer.profile.username}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>{formatDistanceToNow(new Date(viewer.viewed_at), { addSuffix: true })}</span>
                              </div>
                              {viewer.dismissed_at ? (
                                <Badge variant="outline" className="gap-1 text-green-600 border-green-600/30">
                                  <Check className="w-3 h-3" />
                                  Dismissed
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="gap-1 text-yellow-600 border-yellow-600/30">
                                  <Eye className="w-3 h-3" />
                                  Viewed
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                        
                        {/* Load More Button */}
                        {(viewersData[announcement.id]?.length || 0) < (announcement.views_count || 0) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full mt-2"
                            disabled={viewersLoading[announcement.id]}
                            onClick={() => fetchViewers(announcement.id, true)}
                          >
                            {viewersLoading[announcement.id] ? (
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : null}
                            Load More
                          </Button>
                        )}
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
