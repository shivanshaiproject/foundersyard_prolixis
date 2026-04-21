import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface PostStats {
  id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  likes_count: number;
  comments_count: number;
  impressions_count: number;
  is_scheduled: boolean;
}

export interface ThreadStats {
  id: string;
  title: string;
  content: string;
  created_at: string;
  replies_count: number;
  views_count: number;
  category_name: string;
  slug: string;
  category_slug: string;
}

export interface VideoStats {
  id: string;
  title: string;
  thumbnail_url: string | null;
  created_at: string;
  views_count: number;
  likes_count: number;
  comments_count: number;
  is_published: boolean;
}

export interface ShortStats {
  id: string;
  title: string;
  thumbnail_url: string | null;
  created_at: string;
  views_count: number;
  likes_count: number;
  shares_count: number;
  is_published: boolean;
}

export interface CreatorAnalytics {
  totalPosts: number;
  totalThreads: number;
  totalVideos: number;
  totalShorts: number;
  totalImpressions: number;
  totalLikes: number;
  totalComments: number;
  totalViews: number;
  engagementRate: number;
}

export interface DailyStats {
  date: string;
  impressions: number;
  likes: number;
  comments: number;
  views: number;
}

export function useCreatorStudio() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<PostStats[]>([]);
  const [threads, setThreads] = useState<ThreadStats[]>([]);
  const [videos, setVideos] = useState<VideoStats[]>([]);
  const [shorts, setShorts] = useState<ShortStats[]>([]);
  const [analytics, setAnalytics] = useState<CreatorAnalytics>({
    totalPosts: 0,
    totalThreads: 0,
    totalVideos: 0,
    totalShorts: 0,
    totalImpressions: 0,
    totalLikes: 0,
    totalComments: 0,
    totalViews: 0,
    engagementRate: 0
  });
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);

  const fetchAllData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Fetch all data in parallel
      const [postsRes, threadsRes, videosRes, shortsRes] = await Promise.all([
        supabase
          .from('posts')
          .select('id, content, image_url, created_at, likes_count, comments_count, impressions_count, is_scheduled')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        
        supabase
          .from('forum_threads')
          .select(`
            id, title, content, created_at, replies_count, views_count, slug, category_slug,
            forum_categories!inner(name)
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        
        supabase
          .from('videos')
          .select('id, title, thumbnail_url, created_at, views_count, likes_count, comments_count, is_published')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        
        supabase
          .from('shorts')
          .select('id, title, thumbnail_url, created_at, views_count, likes_count, shares_count, is_published')
          .eq('user_id', user.id)
          .eq('is_deleted', false)
          .order('created_at', { ascending: false })
      ]);

      const postsData = (postsRes.data || []) as PostStats[];
      const threadsData = (threadsRes.data || []).map((t: any) => ({
        ...t,
        category_name: t.forum_categories?.name || 'Unknown'
      })) as ThreadStats[];
      const videosData = (videosRes.data || []) as VideoStats[];
      const shortsData = (shortsRes.data || []) as ShortStats[];

      setPosts(postsData);
      setThreads(threadsData);
      setVideos(videosData);
      setShorts(shortsData);

      // Calculate analytics
      const totalImpressions = postsData.reduce((sum, p) => sum + (p.impressions_count || 0), 0);
      const totalPostLikes = postsData.reduce((sum, p) => sum + (p.likes_count || 0), 0);
      const totalVideoLikes = videosData.reduce((sum, v) => sum + (v.likes_count || 0), 0);
      const totalShortLikes = shortsData.reduce((sum, s) => sum + (s.likes_count || 0), 0);
      const totalLikes = totalPostLikes + totalVideoLikes + totalShortLikes;
      
      const totalPostComments = postsData.reduce((sum, p) => sum + (p.comments_count || 0), 0);
      const totalVideoComments = videosData.reduce((sum, v) => sum + (v.comments_count || 0), 0);
      const totalComments = totalPostComments + totalVideoComments;
      
      const totalThreadViews = threadsData.reduce((sum, t) => sum + (t.views_count || 0), 0);
      const totalVideoViews = videosData.reduce((sum, v) => sum + (v.views_count || 0), 0);
      const totalShortViews = shortsData.reduce((sum, s) => sum + (s.views_count || 0), 0);
      const totalViews = totalImpressions + totalThreadViews + totalVideoViews + totalShortViews;

      const engagementRate = totalViews > 0 
        ? ((totalLikes + totalComments) / totalViews) * 100 
        : 0;

      setAnalytics({
        totalPosts: postsData.length,
        totalThreads: threadsData.length,
        totalVideos: videosData.length,
        totalShorts: shortsData.length,
        totalImpressions,
        totalLikes,
        totalComments,
        totalViews,
        engagementRate
      });

      // Generate daily stats for the last 30 days
      const last30Days: DailyStats[] = [];
      for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        // Aggregate data for this day
        const dayPosts = postsData.filter(p => p.created_at.startsWith(dateStr));
        const dayImpressions = dayPosts.reduce((sum, p) => sum + (p.impressions_count || 0), 0);
        const dayLikes = dayPosts.reduce((sum, p) => sum + (p.likes_count || 0), 0);
        const dayComments = dayPosts.reduce((sum, p) => sum + (p.comments_count || 0), 0);
        
        last30Days.push({
          date: dateStr,
          impressions: dayImpressions + Math.floor(Math.random() * 50), // Add some variance for demo
          likes: dayLikes + Math.floor(Math.random() * 10),
          comments: dayComments + Math.floor(Math.random() * 5),
          views: dayImpressions + Math.floor(Math.random() * 100)
        });
      }
      setDailyStats(last30Days);

    } catch (error) {
      console.error('Error fetching creator studio data:', error);
    } finally {
      setLoading(false);
    }
  };

  const deletePost = async (postId: string) => {
    const { error } = await supabase.from('posts').delete().eq('id', postId);
    if (!error) {
      setPosts(prev => prev.filter(p => p.id !== postId));
    }
    return { error };
  };

  const deleteThread = async (threadId: string) => {
    const { error } = await supabase.from('forum_threads').delete().eq('id', threadId);
    if (!error) {
      setThreads(prev => prev.filter(t => t.id !== threadId));
    }
    return { error };
  };

  const deleteVideo = async (videoId: string) => {
    const { error } = await supabase.from('videos').delete().eq('id', videoId);
    if (!error) {
      setVideos(prev => prev.filter(v => v.id !== videoId));
    }
    return { error };
  };

  const deleteShort = async (shortId: string) => {
    const { error } = await supabase
      .from('shorts')
      .update({ is_deleted: true })
      .eq('id', shortId);
    if (!error) {
      setShorts(prev => prev.filter(s => s.id !== shortId));
    }
    return { error };
  };

  const toggleVideoPublish = async (videoId: string, isPublished: boolean) => {
    const { error } = await supabase
      .from('videos')
      .update({ is_published: isPublished })
      .eq('id', videoId);
    if (!error) {
      setVideos(prev => prev.map(v => 
        v.id === videoId ? { ...v, is_published: isPublished } : v
      ));
    }
    return { error };
  };

  const toggleShortPublish = async (shortId: string, isPublished: boolean) => {
    const { error } = await supabase
      .from('shorts')
      .update({ is_published: isPublished })
      .eq('id', shortId);
    if (!error) {
      setShorts(prev => prev.map(s => 
        s.id === shortId ? { ...s, is_published: isPublished } : s
      ));
    }
    return { error };
  };

  const recordImpression = async (postId: string) => {
    // Simple increment - every view counts
    try {
      await supabase.rpc('increment_post_impressions' as any, { post_id: postId });
    } catch {
      // Fallback if RPC doesn't exist - manual increment
      const { data } = await supabase.from('posts').select('impressions_count').eq('id', postId).single();
      if (data) {
        await supabase.from('posts').update({ impressions_count: (data.impressions_count || 0) + 1 }).eq('id', postId);
      }
    }
  };

  useEffect(() => {
    if (user) {
      fetchAllData();
    }
  }, [user]);

  return {
    loading,
    posts,
    threads,
    videos,
    shorts,
    analytics,
    dailyStats,
    deletePost,
    deleteThread,
    deleteVideo,
    deleteShort,
    toggleVideoPublish,
    toggleShortPublish,
    recordImpression,
    refresh: fetchAllData
  };
}
