import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle, 
  Trash2, 
  AlertTriangle,
  Clock,
  FileText,
  Eye,
  MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface HeldPost {
  id: string;
  content: string;
  image_url: string | null;
  is_held_for_review: boolean | null;
  held_reason: string | null;
  created_at: string;
  user_id: string;
  profiles: {
    full_name: string;
    username: string | null;
    avatar_url: string | null;
  };
}

interface ForumThread {
  id: string;
  title: string;
  content: string;
  slug: string;
  image_url: string | null;
  created_at: string;
  user_id: string;
  profiles: {
    full_name: string;
    username: string | null;
    avatar_url: string | null;
  };
  forum_categories: {
    name: string;
    slug: string;
  };
}

export default function AdminContent() {
  const [heldPosts, setHeldPosts] = useState<HeldPost[]>([]);
  const [allPosts, setAllPosts] = useState<HeldPost[]>([]);
  const [forumThreads, setForumThreads] = useState<ForumThread[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = async () => {
    setLoading(true);
    
    const [heldResult, allResult, threadsResult] = await Promise.all([
      supabase
        .from('posts')
        .select(`
          id, content, image_url, is_held_for_review, held_reason, created_at, user_id,
          profiles!inner(full_name, username, avatar_url)
        `)
        .eq('is_held_for_review', true)
        .order('created_at', { ascending: false }),
      supabase
        .from('posts')
        .select(`
          id, content, image_url, is_held_for_review, held_reason, created_at, user_id,
          profiles!inner(full_name, username, avatar_url)
        `)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('forum_threads')
        .select(`
          id, title, content, slug, image_url, created_at, user_id,
          profiles:user_id(full_name, username, avatar_url),
          forum_categories:category_id(name, slug)
        `)
        .order('created_at', { ascending: false })
        .limit(50)
    ]);

    if (!heldResult.error) setHeldPosts((heldResult.data as unknown as HeldPost[]) || []);
    if (!allResult.error) setAllPosts((allResult.data as unknown as HeldPost[]) || []);
    if (!threadsResult.error) setForumThreads((threadsResult.data as unknown as ForumThread[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const approvePost = async (postId: string) => {
    const { error } = await supabase
      .from('posts')
      .update({ is_held_for_review: false, held_reason: null })
      .eq('id', postId);

    if (error) {
      toast.error('Failed to approve post');
    } else {
      toast.success('Post approved');
      fetchPosts();
    }
  };

  const deletePost = async (postId: string) => {
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId);

    if (error) {
      toast.error('Failed to delete post');
    } else {
      toast.success('Post deleted');
      fetchPosts();
    }
  };

  const deleteThread = async (threadId: string) => {
    const { error } = await supabase
      .from('forum_threads')
      .delete()
      .eq('id', threadId);

    if (error) {
      toast.error('Failed to delete forum thread');
    } else {
      toast.success('Forum thread deleted');
      fetchPosts();
    }
  };

  const issueStrike = async (userId: string, postId: string) => {
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
        last_strike_reason: 'Content violation - Admin action',
        suspended_until: suspendedUntil?.toISOString() || null,
        is_permanent_ban: isPermanentBan,
      });

    await supabase
      .from('strike_history')
      .insert({
        user_id: userId,
        strike_number: newCount,
        reason: 'Content violation - Admin action',
        issued_by: 'admin',
      });

    // Delete the post
    await deletePost(postId);
    toast.success(`Strike issued (${newCount}/3)`);
  };

  const PostCard = ({ post, showHeldBadge = false }: { post: HeldPost; showHeldBadge?: boolean }) => (
    <Card key={post.id} className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <UserAvatar
              src={post.profiles.avatar_url}
              name={post.profiles.full_name}
              size="md"
            />
            <div>
              <p className="font-medium">{post.profiles.full_name}</p>
              <p className="text-sm text-muted-foreground">@{post.profiles.username || 'unknown'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {showHeldBadge && post.is_held_for_review && (
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
                <Clock className="w-3 h-3 mr-1" />
                Held
              </Badge>
            )}
            <span className="text-sm text-muted-foreground">
              {format(new Date(post.created_at), 'MMM d, yyyy HH:mm')}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-foreground whitespace-pre-wrap">{post.content}</p>
        
        {post.image_url && (
          <img 
            src={post.image_url} 
            alt="Post" 
            className="rounded-xl max-h-64 object-cover w-full"
          />
        )}

        {post.held_reason && (
          <div className="p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg">
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              <strong>Held reason:</strong> {post.held_reason}
            </p>
          </div>
        )}

        <div className="flex items-center gap-2 pt-2 border-t border-border">
          <Button size="sm" variant="outline" onClick={() => window.open(`/post/${post.id}`, '_blank')}>
            <Eye className="w-4 h-4 mr-1" />
            View
          </Button>
          {post.is_held_for_review && (
            <Button size="sm" variant="default" onClick={() => approvePost(post.id)}>
              <CheckCircle className="w-4 h-4 mr-1" />
              Approve
            </Button>
          )}
          <Button size="sm" variant="outline" className="text-orange-600" onClick={() => issueStrike(post.user_id, post.id)}>
            <AlertTriangle className="w-4 h-4 mr-1" />
            Strike & Delete
          </Button>
          <Button size="sm" variant="destructive" onClick={() => deletePost(post.id)}>
            <Trash2 className="w-4 h-4 mr-1" />
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Content Moderation</h1>
          <p className="text-muted-foreground mt-1">Review and moderate user content</p>
        </div>

        <Tabs defaultValue="held">
          <TabsList>
            <TabsTrigger value="held" className="gap-2">
              <Clock className="w-4 h-4" />
              Held for Review ({heldPosts.length})
            </TabsTrigger>
            <TabsTrigger value="all" className="gap-2">
              <FileText className="w-4 h-4" />
              All Posts
            </TabsTrigger>
            <TabsTrigger value="forums" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              Forum Threads ({forumThreads.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="held" className="mt-6">
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
            ) : heldPosts.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <p className="text-lg font-medium">All clear!</p>
                  <p className="text-muted-foreground">No posts held for review</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {heldPosts.map((post) => (
                  <PostCard key={post.id} post={post} showHeldBadge />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="all" className="mt-6">
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
            ) : (
              <div className="space-y-4">
                {allPosts.map((post) => (
                  <PostCard key={post.id} post={post} showHeldBadge />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="forums" className="mt-6">
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
            ) : forumThreads.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium">No forum threads</p>
                  <p className="text-muted-foreground">No forum discussions have been created yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {forumThreads.map((thread) => (
                  <Card key={thread.id} className="overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <UserAvatar
                            src={thread.profiles?.avatar_url}
                            name={thread.profiles?.full_name || 'User'}
                            size="md"
                          />
                          <div>
                            <p className="font-medium">{thread.profiles?.full_name || 'Unknown User'}</p>
                            <p className="text-sm text-muted-foreground">@{thread.profiles?.username || 'unknown'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">
                            {thread.forum_categories?.name || 'General'}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(thread.created_at), 'MMM d, yyyy HH:mm')}
                          </span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h3 className="font-semibold text-lg mb-2">{thread.title}</h3>
                        <p className="text-foreground whitespace-pre-wrap line-clamp-3">{thread.content}</p>
                      </div>
                      
                      {thread.image_url && (
                        <img 
                          src={thread.image_url} 
                          alt="Thread" 
                          className="rounded-xl max-h-64 object-cover w-full"
                        />
                      )}

                      <div className="flex items-center gap-2 pt-2 border-t border-border">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => window.open(`/forums/${thread.forum_categories?.slug}/${thread.slug}`, '_blank')}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => deleteThread(thread.id)}>
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
