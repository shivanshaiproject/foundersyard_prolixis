import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { getCached, setCache, CACHE_EXPIRY } from '@/lib/cache';
import { runSupremeShieldScan, SupremeShieldResult } from '@/lib/supremeShield';
import { toast } from 'sonner';

type ForumCategory = Tables<'forum_categories'>;
type ForumThread = Tables<'forum_threads'>;
type ForumReply = Tables<'forum_replies'>;
type Profile = Tables<'profiles'>;

export interface ThreadWithAuthor extends ForumThread {
  author: Profile;
  category?: ForumCategory;
}

export interface ReplyWithAuthor extends ForumReply {
  author: Profile;
  replies?: ReplyWithAuthor[];
}

const THREADS_PER_PAGE = 20;
const INITIAL_REPLIES = 3;

export function useForumCategories() {
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      const cacheKey = 'forum_categories';
      
      // Check cache FIRST
      const cached = getCached<ForumCategory[]>(cacheKey);
      if (cached) {
        setCategories(cached);
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('forum_categories')
        .select('*')
        .order('name');
      
      const categories = (data || []) as ForumCategory[];
      setCache(cacheKey, categories, CACHE_EXPIRY.FORUMS);
      setCategories(categories);
      setLoading(false);
    };
    fetchCategories();
  }, []);

  return { categories, loading };
}

export function useForumThreads(categorySlug?: string) {
  const [threads, setThreads] = useState<ThreadWithAuthor[]>([]);
  const [category, setCategory] = useState<ForumCategory | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const prefetchedRef = useRef(false);

  const getCacheKey = useCallback((pageNum: number) => {
    return `forum_threads_${categorySlug || 'all'}_page${pageNum}`;
  }, [categorySlug]);

  const fetchThreadsPage = useCallback(async (pageNum: number, isLoadMore = false) => {
    const cacheKey = getCacheKey(pageNum);
    
    // Check cache FIRST for page 1
    if (pageNum === 1 && !isLoadMore) {
      const cached = getCached<{ threads: ThreadWithAuthor[], category: ForumCategory | null }>(cacheKey);
      if (cached) {
        setThreads(cached.threads);
        setCategory(cached.category);
        setLoading(false);
        // Prefetch page 2
        if (!prefetchedRef.current && cached.threads.length === THREADS_PER_PAGE) {
          prefetchedRef.current = true;
          prefetchNextPage(2);
        }
        return;
      }
    }

    if (isLoadMore) {
      setLoadingMore(true);
    } else if (pageNum === 1) {
      setLoading(true);
    }

    try {
      const offset = (pageNum - 1) * THREADS_PER_PAGE;
      let catData: ForumCategory | null = null;

      if (categorySlug) {
        // Check category cache
        const catCacheKey = `forum_category_${categorySlug}`;
        catData = getCached<ForumCategory>(catCacheKey);
        
        if (!catData) {
          const { data } = await supabase
            .from('forum_categories')
            .select('*')
            .eq('slug', categorySlug)
            .single();
          catData = data as ForumCategory;
          if (catData) {
            setCache(catCacheKey, catData, CACHE_EXPIRY.FORUMS);
          }
        }

        if (catData) {
          setCategory(catData);

          const { data } = await supabase
            .from('forum_threads')
            .select('*')
            .eq('category_id', catData.id)
            .order('is_pinned', { ascending: false })
            .order('created_at', { ascending: false })
            .range(offset, offset + THREADS_PER_PAGE - 1);

          // Fetch authors for all threads
          const threadsWithAuthors = await Promise.all(
            (data || []).map(async (t) => {
              const { data: author } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', t.user_id)
                .single();
              return { ...t, author: author as Profile };
            })
          );

          setHasMore(threadsWithAuthors.length === THREADS_PER_PAGE);

          // Cache results
          setCache(cacheKey, { threads: threadsWithAuthors, category: catData }, CACHE_EXPIRY.THREAD_PREVIEW);

          if (isLoadMore) {
            setThreads(prev => [...prev, ...threadsWithAuthors]);
          } else {
            setThreads(threadsWithAuthors);
          }

          // Prefetch next page
          if (pageNum === 1 && !prefetchedRef.current && threadsWithAuthors.length === THREADS_PER_PAGE) {
            prefetchedRef.current = true;
            prefetchNextPage(2);
          }
        }
      } else {
        const { data } = await supabase
          .from('forum_threads')
          .select('*')
          .order('created_at', { ascending: false })
          .range(offset, offset + THREADS_PER_PAGE - 1);

        const threadsWithAuthors = await Promise.all(
          (data || []).map(async (t) => {
            const { data: author } = await supabase.from('profiles').select('*').eq('id', t.user_id).single();
            const { data: cat } = await supabase.from('forum_categories').select('*').eq('id', t.category_id).single();
            return { ...t, author: author as Profile, category: cat as ForumCategory };
          })
        );

        setHasMore(threadsWithAuthors.length === THREADS_PER_PAGE);
        setCache(cacheKey, { threads: threadsWithAuthors, category: null }, CACHE_EXPIRY.THREAD_PREVIEW);

        if (isLoadMore) {
          setThreads(prev => [...prev, ...threadsWithAuthors]);
        } else {
          setThreads(threadsWithAuthors);
        }
      }
    } catch (err) {
      console.error('Error fetching threads:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [categorySlug, getCacheKey]);

  // Silent prefetch
  const prefetchNextPage = async (pageNum: number) => {
    const cacheKey = getCacheKey(pageNum);
    if (getCached(cacheKey)) return;

    try {
      const offset = (pageNum - 1) * THREADS_PER_PAGE;
      
      if (categorySlug && category) {
        const { data } = await supabase
          .from('forum_threads')
          .select('*')
          .eq('category_id', category.id)
          .order('is_pinned', { ascending: false })
          .order('created_at', { ascending: false })
          .range(offset, offset + THREADS_PER_PAGE - 1);

        if (data) {
          const threadsWithAuthors = await Promise.all(
            data.map(async (t) => {
              const { data: author } = await supabase.from('profiles').select('*').eq('id', t.user_id).single();
              return { ...t, author: author as Profile };
            })
          );
          setCache(cacheKey, { threads: threadsWithAuthors, category }, CACHE_EXPIRY.THREAD_PREVIEW);
        }
      }
    } catch {
      // Silent fail
    }
  };

  useEffect(() => {
    setPage(1);
    prefetchedRef.current = false;
    fetchThreadsPage(1);
  }, [categorySlug]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchThreadsPage(nextPage, true);
  }, [page, loadingMore, hasMore, fetchThreadsPage]);

  const createThread = async (title: string, content: string, categoryId: string, imageUrl?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: new Error('Not authenticated') };

    // Run Supreme Shield scan on title + content
    const fullContent = `${title} ${content}`;
    let scanResult: SupremeShieldResult;
    try {
      scanResult = await runSupremeShieldScan({
        text: fullContent,
        userId: user.id,
        contentType: 'thread',
      });
    } catch (err) {
      console.error('Supreme Shield scan failed:', err);
      return { error: new Error('Content moderation failed. Please try again.') };
    }

    // Block if scan blocked
    if (scanResult.action === 'block') {
      toast.error(scanResult.reason || 'Content Blocked: Professional standards violation.');
      return { error: new Error(scanResult.reason || 'Content blocked by moderation') };
    }

    const { data: catData } = await supabase
      .from('forum_categories')
      .select('slug')
      .eq('id', categoryId)
      .single();

    const categorySlugValue = catData?.slug || '';

    const generateBaseSlug = (text: string): string => {
      return text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()
        .substring(0, 70)
        .replace(/-+$/, '');
    };

    const baseSlug = generateBaseSlug(title);
    let finalSlug = baseSlug;
    let counter = 1;

    while (true) {
      const { data: existing } = await supabase
        .from('forum_threads')
        .select('id')
        .eq('slug', finalSlug)
        .maybeSingle();

      if (!existing) break;
      counter++;
      finalSlug = `${baseSlug}-${counter}`;
    }

    // Determine moderation status based on scan
    const moderationStatus = scanResult.action === 'shadow_ban' ? 'pending_review' : 
                             scanResult.action === 'flag_review' ? 'pending_review' : 'approved';
    const isShadowBanned = scanResult.isShadowBanned || scanResult.action === 'shadow_ban';

    const { data, error } = await supabase
      .from('forum_threads')
      .insert({
        title,
        content,
        category_id: categoryId,
        user_id: user.id,
        slug: finalSlug,
        category_slug: categorySlugValue,
        image_url: imageUrl || null,
        moderation_status: moderationStatus,
        is_shadow_banned: isShadowBanned,
        safety_token: scanResult.safetyToken,
        moderation_token: scanResult.moderationToken,
        is_approved: !isShadowBanned,
      })
      .select('*')
      .single();

    if (!error && data) {
      const { data: author } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setThreads([{ ...data, author: author as Profile } as ThreadWithAuthor, ...threads]);
      
      if (isShadowBanned) {
        // User sees success but content is hidden
        toast.success('Thread posted!');
      }
    }

    return { data, error };
  };

  const deleteThread = async (threadId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: new Error('Not authenticated') };

    const { error } = await supabase
      .from('forum_threads')
      .delete()
      .eq('id', threadId)
      .eq('user_id', user.id);

    if (!error) {
      setThreads(threads.filter(t => t.id !== threadId));
    }

    return { error };
  };

  return { threads, category, loading, loadingMore, hasMore, loadMore, createThread, deleteThread };
}

export function useForumThread(threadId: string) {
  const [thread, setThread] = useState<ThreadWithAuthor | null>(null);
  const [replies, setReplies] = useState<ReplyWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMoreReplies, setHasMoreReplies] = useState(false);
  const [loadingMoreReplies, setLoadingMoreReplies] = useState(false);
  const [totalReplies, setTotalReplies] = useState(0);
  const allRepliesRef = useRef<ReplyWithAuthor[]>([]);

  const fetchThread = async () => {
    if (!threadId) {
      setLoading(false);
      return;
    }

    const cacheKey = `forum_thread_${threadId}`;
    
    // Check cache FIRST
    const cached = getCached<{ thread: ThreadWithAuthor, replies: ReplyWithAuthor[], totalReplies: number }>(cacheKey);
    if (cached) {
      setThread(cached.thread);
      allRepliesRef.current = cached.replies;
      setTotalReplies(cached.totalReplies);
      // Show only first N replies
      setReplies(cached.replies.slice(0, INITIAL_REPLIES));
      setHasMoreReplies(cached.replies.length > INITIAL_REPLIES);
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data: threadData } = await supabase.from('forum_threads').select('*').eq('id', threadId).single();

    if (threadData) {
      const { data: author } = await supabase.from('profiles').select('*').eq('id', threadData.user_id).single();
      const { data: cat } = await supabase.from('forum_categories').select('*').eq('id', threadData.category_id).single();

      const threadWithAuthor = { ...threadData, author: author as Profile, category: cat as ForumCategory } as ThreadWithAuthor;
      setThread(threadWithAuthor);

      // Increment views (don't await)
      supabase.from('forum_threads').update({ views_count: (threadData.views_count || 0) + 1 }).eq('id', threadId);

      // Fetch all replies but only show first N
      const { data: repliesData } = await supabase
        .from('forum_replies')
        .select('*')
        .eq('thread_id', threadId)
        .is('parent_id', null)
        .order('created_at', { ascending: true });

      const { data: nestedReplies } = await supabase
        .from('forum_replies')
        .select('*')
        .eq('thread_id', threadId)
        .not('parent_id', 'is', null)
        .order('created_at', { ascending: true });

      const repliesWithAuthors = await Promise.all(
        (repliesData || []).map(async (r) => {
          const { data: rAuthor } = await supabase.from('profiles').select('*').eq('id', r.user_id).single();
          const childReplies = await Promise.all(
            (nestedReplies || []).filter(nr => nr.parent_id === r.id).map(async (nr) => {
              const { data: nrAuthor } = await supabase.from('profiles').select('*').eq('id', nr.user_id).single();
              return { ...nr, author: nrAuthor as Profile, replies: [] };
            })
          );
          return { ...r, author: rAuthor as Profile, replies: childReplies };
        })
      );

      const allReplies = repliesWithAuthors as ReplyWithAuthor[];
      allRepliesRef.current = allReplies;
      setTotalReplies(allReplies.length);
      
      // Only show first N replies initially (lazy load)
      setReplies(allReplies.slice(0, INITIAL_REPLIES));
      setHasMoreReplies(allReplies.length > INITIAL_REPLIES);

      // Cache the results
      setCache(cacheKey, { thread: threadWithAuthor, replies: allReplies, totalReplies: allReplies.length }, CACHE_EXPIRY.THREAD_PREVIEW);
    }

    setLoading(false);
  };

  const loadMoreReplies = useCallback(() => {
    if (loadingMoreReplies || !hasMoreReplies) return;
    
    setLoadingMoreReplies(true);
    
    // Load all remaining replies
    setReplies(allRepliesRef.current);
    setHasMoreReplies(false);
    setLoadingMoreReplies(false);
  }, [loadingMoreReplies, hasMoreReplies]);

  useEffect(() => {
    if (threadId) fetchThread();
  }, [threadId]);

  const createReply = async (content: string, parentId?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: new Error('Not authenticated') };

    // Run Supreme Shield scan on reply content
    let scanResult: SupremeShieldResult;
    try {
      scanResult = await runSupremeShieldScan({
        text: content,
        userId: user.id,
        contentType: 'reply',
      });
    } catch (err) {
      console.error('Supreme Shield scan failed:', err);
      return { error: new Error('Content moderation failed. Please try again.') };
    }

    // Block if scan blocked
    if (scanResult.action === 'block') {
      toast.error(scanResult.reason || 'Content Blocked: Professional standards violation.');
      return { error: new Error(scanResult.reason || 'Content blocked by moderation') };
    }

    // Determine moderation status
    const moderationStatus = scanResult.action === 'shadow_ban' ? 'pending_review' : 
                             scanResult.action === 'flag_review' ? 'pending_review' : 'approved';
    const isShadowBanned = scanResult.isShadowBanned || scanResult.action === 'shadow_ban';

    const { data, error } = await supabase
      .from('forum_replies')
      .insert({ 
        content, 
        thread_id: threadId, 
        user_id: user.id, 
        parent_id: parentId || null,
        moderation_status: moderationStatus,
        is_shadow_banned: isShadowBanned,
        safety_token: scanResult.safetyToken,
        moderation_token: scanResult.moderationToken,
        is_approved: !isShadowBanned,
      })
      .select('*')
      .single();

    if (!error) fetchThread();
    return { data, error };
  };

  const editReply = async (replyId: string, content: string) => {
    const { error } = await supabase.from('forum_replies').update({ content, edited_at: new Date().toISOString() }).eq('id', replyId);
    if (!error) fetchThread();
    return { error };
  };

  const deleteReply = async (replyId: string) => {
    const { error } = await supabase.from('forum_replies').delete().eq('id', replyId);
    if (!error) fetchThread();
    return { error };
  };

  return { 
    thread, 
    replies, 
    loading, 
    hasMoreReplies, 
    loadingMoreReplies, 
    totalReplies,
    loadMoreReplies,
    createReply, 
    editReply, 
    deleteReply, 
    refetch: fetchThread 
  };
}
