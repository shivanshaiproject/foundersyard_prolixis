import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { Tables } from '@/integrations/supabase/types';
import type { PostWithAuthor } from './usePosts';
import { getCached, setCache, CACHE_EXPIRY } from '@/lib/cache';

type Profile = Tables<'profiles'>;

export type FeedFilter = 'recent' | 'following' | 'popular' | 'forums';

export type FeedItemType = 'post' | 'thread';

export interface FeedPost extends PostWithAuthor {
  type: 'post';
}

export interface FeedThread {
  type: 'thread';
  id: string;
  title: string;
  content: string;
  slug: string;
  category_slug: string | null;
  created_at: string;
  replies_count: number;
  image_url: string | null;
  user: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    username: string | null;
    is_verified: boolean;
  };
  category: {
    id: string;
    name: string;
    slug: string;
    color: string | null;
  };
  preview_replies?: Array<{
    id: string;
    content: string;
    created_at: string;
    user: {
      id: string;
      full_name: string;
      avatar_url: string | null;
      username: string | null;
    };
  }>;
  isFollowedCategory?: boolean;
}

export type FeedItem = FeedPost | FeedThread;

const ITEMS_PER_PAGE = 10;

export const useFeed = (filter: FeedFilter = 'recent') => {
  const { user } = useAuth();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [followedCategories, setFollowedCategories] = useState<string[]>([]);
  
  // Ref to prevent duplicate loadMore calls
  const isLoadingRef = useRef(false);

  // Fetch followed categories
  useEffect(() => {
    const fetchFollowedCategories = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('forum_follows')
        .select('category_id')
        .eq('user_id', user.id);
      
      if (data) {
        setFollowedCategories(data.map(f => f.category_id));
      }
    };
    
    fetchFollowedCategories();
  }, [user]);

  const fetchFeed = useCallback(async (pageNum: number, append = false) => {
    const cacheKey = `feed_${filter}_${user?.id || 'anon'}_page${pageNum}`;
    
    // Cache-first: on initial load (page 0), try cache before showing skeleton
    if (pageNum === 0 && !append) {
      const cached = getCached<FeedItem[]>(cacheKey);
      if (cached && cached.length > 0) {
        setItems(cached);
        setLoading(false);
        // Continue to fetch fresh data in background (stale-while-revalidate)
      } else {
        setLoading(true);
      }
    } else {
      setLoadingMore(true);
    }
    isLoadingRef.current = true;

    try {
      const from = pageNum * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      // For forums filter, only fetch threads
      const shouldFetchPosts = filter !== 'forums';
      const shouldFetchThreads = filter === 'recent' || filter === 'forums';

      // Fetch posts with full author profile
      let postsResult: { data: any[] | null; error: any } = { data: [], error: null };
      if (shouldFetchPosts) {
        // For 'following' filter, first get followed/networked user IDs
        let followedUserIds: string[] = [];
        if (filter === 'following' && user) {
          const [followsRes, networkRes] = await Promise.all([
            supabase
              .from('follows')
              .select('following_id')
              .eq('follower_id', user.id),
            supabase
              .from('network_connections')
              .select('requester_id, receiver_id')
              .eq('status', 'accepted')
              .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`)
          ]);

          const followIds = (followsRes.data || []).map(f => f.following_id);
          const networkIds = (networkRes.data || []).flatMap(c =>
            c.requester_id === user.id ? [c.receiver_id] : [c.requester_id]
          );
          followedUserIds = [...new Set([...followIds, ...networkIds])];

          // If user follows nobody, return empty
          if (followedUserIds.length === 0) {
            postsResult = { data: [], error: null };
          }
        }

        if (!(filter === 'following' && followedUserIds.length === 0)) {
          let query = supabase
            .from('posts')
            .select(`
              *,
              author:profiles!posts_user_id_fkey(*)
            `)
            .eq('is_scheduled', false)
            .eq('is_held_for_review', false)
            .eq('is_shadow_banned', false)
            .eq('is_approved', true);

          // Apply filter-specific logic
          if (filter === 'following' && followedUserIds.length > 0) {
            query = query.in('user_id', followedUserIds);
          }

          if (filter === 'popular') {
            query = query
              .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
              .order('likes_count', { ascending: false });
          } else {
            query = query.order('created_at', { ascending: false });
          }

          postsResult = await query.range(from, to);
        }
      }

      // Fetch threads - separate queries to avoid broken joins
      let threadItems: FeedThread[] = [];
      if (shouldFetchThreads) {
        // Step 1: Fetch basic thread data (exclude shadow-banned/unapproved)
        const threadsQuery = supabase
          .from('forum_threads')
          .select('id, title, content, slug, category_slug, created_at, replies_count, image_url, user_id, category_id')
          .eq('is_shadow_banned', false)
          .eq('is_approved', true)
          .order('created_at', { ascending: false })
          .range(from, to);

        const threadsResult = await threadsQuery;
        
        if (threadsResult.data && threadsResult.data.length > 0) {
          // Step 2: Batch fetch profiles and categories
          const userIds = [...new Set(threadsResult.data.map(t => t.user_id))];
          const categoryIds = [...new Set(threadsResult.data.map(t => t.category_id))];

          const [profilesResult, categoriesResult] = await Promise.all([
            supabase.from('profiles').select('id, full_name, avatar_url, username, is_verified').in('id', userIds),
            supabase.from('forum_categories').select('id, name, slug, color').in('id', categoryIds)
          ]);

          const profilesMap: Record<string, any> = {};
          const categoriesMap: Record<string, any> = {};

          (profilesResult.data || []).forEach(p => { profilesMap[p.id] = p; });
          (categoriesResult.data || []).forEach(c => { categoriesMap[c.id] = c; });

          // Step 3: Fetch reply previews
          const threadIds = threadsResult.data.map(t => t.id);
          const { data: replies } = await supabase
            .from('forum_replies')
            .select('id, content, created_at, thread_id, user_id')
            .in('thread_id', threadIds)
            .is('parent_id', null)
            .order('created_at', { ascending: true })
            .limit(20);

          // Batch fetch reply authors
          const replyUserIds = [...new Set((replies || []).map(r => r.user_id))];
          let replyProfilesMap: Record<string, any> = {};
          if (replyUserIds.length > 0) {
            const { data: replyProfiles } = await supabase
              .from('profiles')
              .select('id, full_name, avatar_url, username')
              .in('id', replyUserIds);
            (replyProfiles || []).forEach(p => { replyProfilesMap[p.id] = p; });
          }

          // Group replies by thread (max 2 per thread)
          const threadReplies: Record<string, FeedThread['preview_replies']> = {};
          (replies || []).forEach(reply => {
            if (!threadReplies[reply.thread_id]) {
              threadReplies[reply.thread_id] = [];
            }
            if (threadReplies[reply.thread_id]!.length < 2) {
              const profile = replyProfilesMap[reply.user_id];
              threadReplies[reply.thread_id]!.push({
                id: reply.id,
                content: reply.content,
                created_at: reply.created_at || '',
                user: {
                  id: profile?.id || '',
                  full_name: profile?.full_name || 'Unknown',
                  avatar_url: profile?.avatar_url,
                  username: profile?.username
                }
              });
            }
          });

          // Step 4: Transform threads
          threadItems = threadsResult.data.map(thread => {
            const profile = profilesMap[thread.user_id];
            const category = categoriesMap[thread.category_id];
            return {
              type: 'thread' as const,
              id: thread.id,
              title: thread.title,
              content: thread.content,
              slug: thread.slug,
              category_slug: thread.category_slug,
              created_at: thread.created_at || '',
              replies_count: thread.replies_count || 0,
              image_url: thread.image_url || null,
              user: {
                id: profile?.id || '',
                full_name: profile?.full_name || 'Unknown User',
                avatar_url: profile?.avatar_url,
                username: profile?.username,
                is_verified: profile?.is_verified || false
              },
              category: {
                id: category?.id || '',
                name: category?.name || 'General',
                slug: category?.slug || '',
                color: category?.color
              },
              preview_replies: threadReplies[thread.id] || [],
              isFollowedCategory: followedCategories.includes(thread.category_id)
            };
          });

          // For forums filter, only show from followed categories
          if (filter === 'forums' && followedCategories.length > 0) {
            threadItems = threadItems.filter(t => followedCategories.includes(t.category.id));
          }
        }
      }

      // Fetch user likes and bookmarks for posts
      let userLikes: string[] = [];
      let userBookmarks: string[] = [];
      
      if (user && postsResult.data && postsResult.data.length > 0) {
        const postIds = postsResult.data.map(p => p.id);
        
        const [likesResult, bookmarksResult] = await Promise.all([
          supabase
            .from('likes')
            .select('post_id')
            .eq('user_id', user.id)
            .in('post_id', postIds),
          supabase
            .from('bookmarks')
            .select('post_id')
            .eq('user_id', user.id)
            .in('post_id', postIds)
        ]);
        
        userLikes = likesResult.data?.map(l => l.post_id) || [];
        userBookmarks = bookmarksResult.data?.map(b => b.post_id) || [];
      }

      // Transform posts to feed items
      const postItems: FeedPost[] = (postsResult.data || []).map(post => {
        return {
          ...post,
          type: 'post' as const,
          author: post.author as Profile,
          isLiked: userLikes.includes(post.id),
          isBookmarked: userBookmarks.includes(post.id)
        };
      });

      // Merge and sort by created_at
      let allItems: FeedItem[] = [...postItems, ...threadItems];
      
      // Sort with followed categories boosted slightly in 'recent' tab
      allItems.sort((a, b) => {
        const timeA = new Date(a.created_at).getTime();
        const timeB = new Date(b.created_at).getTime();
        
        // Boost followed category threads by treating them as 2 hours newer
        const boostA = a.type === 'thread' && a.isFollowedCategory ? 2 * 60 * 60 * 1000 : 0;
        const boostB = b.type === 'thread' && b.isFollowedCategory ? 2 * 60 * 60 * 1000 : 0;
        
        return (timeB + boostB) - (timeA + boostA);
      });

      if (append) {
        setItems(prev => [...prev, ...allItems]);
      } else {
        setItems(allItems);
        // Cache page 0 results for instant revisit
        if (pageNum === 0) {
          setCache(cacheKey, allItems, CACHE_EXPIRY.FEED);
        }
      }

      // Has more if we got items (check based on what we fetched)
      const hasMoreItems = allItems.length >= ITEMS_PER_PAGE / 2; // Be generous to avoid premature cutoff
      setHasMore(hasMoreItems);
      setPage(pageNum);
    } catch (error) {
      console.error('Error fetching feed:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      isLoadingRef.current = false;
    }
  }, [user, filter, followedCategories]);

  const loadMore = useCallback(() => {
    // Prevent duplicate calls
    if (loading || loadingMore || !hasMore || isLoadingRef.current) return;
    fetchFeed(page + 1, true);
  }, [loading, loadingMore, hasMore, page, fetchFeed]);

  const refresh = useCallback(() => {
    fetchFeed(0, false);
  }, [fetchFeed]);

  const toggleFollow = useCallback(async (categoryId: string) => {
    if (!user) return;
    
    const isFollowing = followedCategories.includes(categoryId);
    
    // Optimistic update
    setFollowedCategories(prev => 
      isFollowing 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
    
    // Also update items to reflect follow status
    setItems(prev => prev.map(item => {
      if (item.type === 'thread' && item.category.id === categoryId) {
        return { ...item, isFollowedCategory: !isFollowing };
      }
      return item;
    }));
    
    try {
      if (isFollowing) {
        await supabase
          .from('forum_follows')
          .delete()
          .eq('user_id', user.id)
          .eq('category_id', categoryId);
      } else {
        await supabase
          .from('forum_follows')
          .insert({ user_id: user.id, category_id: categoryId });
      }
    } catch (error) {
      // Revert on error
      setFollowedCategories(prev => 
        isFollowing 
          ? [...prev, categoryId]
          : prev.filter(id => id !== categoryId)
      );
    }
  }, [user, followedCategories]);

  // Toggle like for posts
  const toggleLike = useCallback(async (postId: string) => {
    if (!user) return;

    const post = items.find(item => item.type === 'post' && item.id === postId) as FeedPost | undefined;
    if (!post) return;

    const isCurrentlyLiked = post.isLiked;

    // Optimistic update
    setItems(prev => prev.map(item => {
      if (item.type === 'post' && item.id === postId) {
        return {
          ...item,
          isLiked: !isCurrentlyLiked,
          likes_count: isCurrentlyLiked ? (item.likes_count || 0) - 1 : (item.likes_count || 0) + 1
        };
      }
      return item;
    }));

    try {
      if (isCurrentlyLiked) {
        await supabase
          .from('likes')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', postId);
      } else {
        await supabase
          .from('likes')
          .insert({ user_id: user.id, post_id: postId });

        // Create 'like' notification for the post author
        if (post.user_id && post.user_id !== user.id) {
          const { data: targetProfile } = await supabase
            .from('profiles')
            .select('notifications_enabled')
            .eq('id', post.user_id)
            .single();

          if (targetProfile?.notifications_enabled !== false) {
            await supabase.from('notifications').insert({
              user_id: post.user_id,
              actor_id: user.id,
              type: 'like',
              post_id: postId,
            });
          }
        }
      }
    } catch (error) {
      // Revert on error
      setItems(prev => prev.map(item => {
        if (item.type === 'post' && item.id === postId) {
          return {
            ...item,
            isLiked: isCurrentlyLiked,
            likes_count: isCurrentlyLiked ? (item.likes_count || 0) + 1 : (item.likes_count || 0) - 1
          };
        }
        return item;
      }));
    }
  }, [user, items]);

  // Toggle bookmark for posts
  const toggleBookmark = useCallback(async (postId: string) => {
    if (!user) return;

    const post = items.find(item => item.type === 'post' && item.id === postId) as FeedPost | undefined;
    if (!post) return;

    const isCurrentlyBookmarked = post.isBookmarked;

    // Optimistic update
    setItems(prev => prev.map(item => {
      if (item.type === 'post' && item.id === postId) {
        return {
          ...item,
          isBookmarked: !isCurrentlyBookmarked
        };
      }
      return item;
    }));

    try {
      if (isCurrentlyBookmarked) {
        await supabase
          .from('bookmarks')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', postId);
      } else {
        await supabase
          .from('bookmarks')
          .insert({ user_id: user.id, post_id: postId });
      }
    } catch (error) {
      // Revert on error
      setItems(prev => prev.map(item => {
        if (item.type === 'post' && item.id === postId) {
          return {
            ...item,
            isBookmarked: isCurrentlyBookmarked
          };
        }
        return item;
      }));
    }
  }, [user, items]);

  // Delete post
  const deletePost = useCallback((postId: string) => {
    setItems(prev => prev.filter(item => !(item.type === 'post' && item.id === postId)));
  }, []);

  useEffect(() => {
    fetchFeed(0);
  }, [fetchFeed]);

  return {
    items,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    refresh,
    followedCategories,
    toggleFollow,
    toggleLike,
    toggleBookmark,
    deletePost
  };
};
