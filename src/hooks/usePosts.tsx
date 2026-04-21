import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { getCached, setCache, CACHE_EXPIRY, invalidateCache } from '@/lib/cache';

type Post = Tables<'posts'>;
type Profile = Tables<'profiles'>;

export interface PostWithAuthor extends Post {
  author: Profile;
  isLiked?: boolean;
  isBookmarked?: boolean;
}

export type FeedFilter = 'recent' | 'following' | 'popular';

const POSTS_PER_PAGE = 15;

export function usePosts(userId?: string, filter: FeedFilter = 'recent') {
  const [posts, setPosts] = useState<PostWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const prefetchedRef = useRef(false);

  const getCacheKey = useCallback((pageNum: number) => {
    return `feed_${filter}_${userId || 'all'}_page${pageNum}`;
  }, [filter, userId]);

  const fetchPage = useCallback(async (pageNum: number, isLoadMore = false) => {
    const cacheKey = getCacheKey(pageNum);
    
    // Check cache first (only for page 1 on initial load)
    if (pageNum === 1 && !isLoadMore) {
      const cached = getCached<PostWithAuthor[]>(cacheKey);
      if (cached) {
        setPosts(cached);
        setLoading(false);
        // Silently prefetch page 2
        if (!prefetchedRef.current) {
          prefetchedRef.current = true;
          prefetchNextPage(2);
        }
        return;
      }
    }

    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const offset = (pageNum - 1) * POSTS_PER_PAGE;

      let query = supabase
        .from('posts')
        .select(`
          *,
          author:profiles!posts_user_id_fkey(*)
        `)
        .eq('is_scheduled', false) // Only show published posts, not scheduled ones
        .range(offset, offset + POSTS_PER_PAGE - 1);

      // Apply user filter if provided
      if (userId) {
        query = query.eq('user_id', userId);
      }

      // Apply feed filter
      if (filter === 'following' && user) {
        // Get accepted network connections where user is part of
        const { data: connections } = await supabase
          .from('network_connections')
          .select('requester_id, receiver_id')
          .eq('status', 'accepted')
          .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`);

        // Get the OTHER person in each connection
        const followingIds = connections?.map(c => 
          c.requester_id === user.id ? c.receiver_id : c.requester_id
        ) || [];
        
        if (followingIds.length > 0) {
          query = query.in('user_id', followingIds);
        } else {
          // No connections, return empty
          setPosts([]);
          setLoading(false);
          return;
        }
      }

      // Apply ordering
      if (filter === 'popular') {
        query = query.order('likes_count', { ascending: false, nullsFirst: false });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      const { data, error: queryError } = await query;

      if (queryError) throw queryError;

      // Check if there are more posts
      setHasMore((data?.length || 0) === POSTS_PER_PAGE);

      let postsWithState: PostWithAuthor[] = [];

      if (user && data) {
        // Fetch likes and bookmarks in parallel
        const [{ data: likes }, { data: bookmarks }] = await Promise.all([
          supabase.from('likes').select('post_id').eq('user_id', user.id),
          supabase.from('bookmarks').select('post_id').eq('user_id', user.id),
        ]);

        const likedPostIds = new Set(likes?.map(l => l.post_id) || []);
        const bookmarkedPostIds = new Set(bookmarks?.map(b => b.post_id) || []);

        postsWithState = data.map(post => ({
          ...post,
          author: post.author as Profile,
          isLiked: likedPostIds.has(post.id),
          isBookmarked: bookmarkedPostIds.has(post.id),
        }));
      } else {
        postsWithState = (data || []).map(post => ({
          ...post,
          author: post.author as Profile,
        }));
      }

      // Cache the results
      setCache(cacheKey, postsWithState, CACHE_EXPIRY.FEED);

      if (isLoadMore) {
        setPosts(prev => [...prev, ...postsWithState]);
      } else {
        setPosts(postsWithState);
      }

      // Prefetch next page silently after first load
      if (pageNum === 1 && !prefetchedRef.current) {
        prefetchedRef.current = true;
        prefetchNextPage(2);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [getCacheKey]);

  // Silent prefetch for next page
  const prefetchNextPage = async (pageNum: number) => {
    const cacheKey = getCacheKey(pageNum);
    if (getCached(cacheKey)) return; // Already cached

    try {
      const offset = (pageNum - 1) * POSTS_PER_PAGE;
      const { data } = await supabase
        .from('posts')
        .select(`*, author:profiles!posts_user_id_fkey(*)`)
        .eq('is_scheduled', false) // Only show published posts
        .range(offset, offset + POSTS_PER_PAGE - 1)
        .order('created_at', { ascending: false });

      if (data) {
        const postsWithState = data.map(post => ({
          ...post,
          author: post.author as Profile,
          isLiked: false,
          isBookmarked: false,
        }));
        setCache(cacheKey, postsWithState, CACHE_EXPIRY.FEED);
      }
    } catch {
      // Silent fail for prefetch
    }
  };

  const fetchPosts = useCallback(() => {
    setPage(1);
    prefetchedRef.current = false;
    fetchPage(1);
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPage(nextPage, true);
  }, [page, loadingMore, hasMore, fetchPage]);

  useEffect(() => {
    fetchPosts();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('posts-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'posts'
        },
        async (payload) => {
          // Invalidate cache on new post
          invalidateCache('feed_');
          
          // Fetch the new post with author data
          const { data: newPost } = await supabase
            .from('posts')
            .select(`*, author:profiles!posts_user_id_fkey(*)`)
            .eq('id', payload.new.id)
            .single();

          // Only add to feed if it's not a scheduled post
          if (newPost && !newPost.is_scheduled) {
            setPosts(prev => {
              // Avoid duplicates
              if (prev.some(p => p.id === newPost.id)) return prev;
              return [{ ...newPost, author: newPost.author as Profile, isLiked: false, isBookmarked: false }, ...prev];
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'posts'
        },
        (payload) => {
          setPosts(prev => prev.filter(p => p.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, filter, fetchPosts]);

  const toggleLike = async (postId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const post = posts.find(p => p.id === postId);
    if (!post) return;

    if (post.isLiked) {
      await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', user.id);
      setPosts(posts.map(p => 
        p.id === postId 
          ? { ...p, isLiked: false, likes_count: (p.likes_count || 0) - 1 }
          : p
      ));
    } else {
      await supabase.from('likes').insert({ post_id: postId, user_id: user.id });
      setPosts(posts.map(p => 
        p.id === postId 
          ? { ...p, isLiked: true, likes_count: (p.likes_count || 0) + 1 }
          : p
      ));
      
      // Create notification for post author (if not self)
      if (post.author.id !== user.id) {
        // Check if target user has notifications enabled
        const { data: targetProfile } = await supabase
          .from('profiles')
          .select('notifications_enabled')
          .eq('id', post.author.id)
          .single();

        if (targetProfile?.notifications_enabled !== false) {
          await supabase.from('notifications').insert({
            user_id: post.author.id,
            actor_id: user.id,
            type: 'like',
            post_id: postId,
          });
        }
      }
    }
  };

  const toggleBookmark = async (postId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const post = posts.find(p => p.id === postId);
    if (!post) return;

    if (post.isBookmarked) {
      await supabase.from('bookmarks').delete().eq('post_id', postId).eq('user_id', user.id);
      setPosts(posts.map(p => 
        p.id === postId ? { ...p, isBookmarked: false } : p
      ));
    } else {
      await supabase.from('bookmarks').insert({ post_id: postId, user_id: user.id });
      setPosts(posts.map(p => 
        p.id === postId ? { ...p, isBookmarked: true } : p
      ));
    }
  };

  const deletePost = (postId: string) => {
    setPosts(posts.filter(p => p.id !== postId));
  };

  const createPost = async (content: string, imageUrl?: string, sectors?: string[], category?: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { data: null, error: new Error('Not authenticated') };

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-post`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          content,
          imageUrl,
          category,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: new Error(result.error || 'Failed to create post') };
      }

      // Post will be added via realtime subscription, but also add locally for immediate feedback
      if (result.post) {
        setPosts(prev => {
          if (prev.some(p => p.id === result.post.id)) return prev;
          return [{ ...result.post, author: result.post.author as Profile, isLiked: false, isBookmarked: false }, ...prev];
        });
      }

      return { data: result.post, error: null };
    } catch (err: any) {
      return { data: null, error: err };
    }
  };

  return { 
    posts, 
    loading, 
    loadingMore,
    error, 
    hasMore,
    fetchPosts, 
    loadMore,
    toggleLike, 
    toggleBookmark, 
    deletePost, 
    createPost 
  };
}
