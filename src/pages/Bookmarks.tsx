import { useState, useEffect } from 'react';
import { Bookmark } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PostCard } from '@/components/feed/PostCard';
import { FeedSkeleton } from '@/components/shared/LoadingSkeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type Post = Tables<'posts'>;
type Profile = Tables<'profiles'>;

interface PostWithAuthor extends Post {
  author: Profile;
  isLiked?: boolean;
  isBookmarked?: boolean;
}

export default function BookmarksPage() {
  const [posts, setPosts] = useState<PostWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBookmarks = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: bookmarks } = await supabase
        .from('bookmarks')
        .select('post_id')
        .eq('user_id', user.id);

      if (!bookmarks || bookmarks.length === 0) {
        setPosts([]);
        setLoading(false);
        return;
      }

      const postIds = bookmarks.map(b => b.post_id);

      const { data: postsData } = await supabase
        .from('posts')
        .select(`*, author:profiles!posts_user_id_fkey(*)`)
        .in('id', postIds);

      const { data: likes } = await supabase
        .from('likes')
        .select('post_id')
        .eq('user_id', user.id);

      const likedPostIds = new Set(likes?.map(l => l.post_id) || []);
      const bookmarkedPostIds = new Set(postIds);

      const postsWithState = (postsData || []).map(post => ({
        ...post,
        author: post.author as Profile,
        isLiked: likedPostIds.has(post.id),
        isBookmarked: bookmarkedPostIds.has(post.id),
      }));

      setPosts(postsWithState);
      setLoading(false);
    };

    fetchBookmarks();
  }, []);

  const handleLike = async (postId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const post = posts.find(p => p.id === postId);
    if (!post) return;

    if (post.isLiked) {
      await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', user.id);
    } else {
      await supabase.from('likes').insert({ post_id: postId, user_id: user.id });
    }

    setPosts(posts.map(p =>
      p.id === postId
        ? { ...p, isLiked: !p.isLiked, likes_count: (p.likes_count || 0) + (p.isLiked ? -1 : 1) }
        : p
    ));
  };

  const handleBookmark = async (postId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('bookmarks').delete().eq('post_id', postId).eq('user_id', user.id);
    setPosts(posts.filter(p => p.id !== postId));
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <h1 className="text-xl font-bold text-foreground">Saved Posts</h1>

        {loading ? (
          <FeedSkeleton />
        ) : posts.length === 0 ? (
          <EmptyState
            icon={Bookmark}
            title="No saved posts"
            description="Posts you save will appear here."
          />
        ) : (
          <div className="space-y-4">
            {posts.map(post => (
              <PostCard
                key={post.id}
                post={post}
                onLike={handleLike}
                onBookmark={handleBookmark}
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
