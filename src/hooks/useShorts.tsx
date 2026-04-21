import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { normalizeR2Url } from '@/lib/r2Url';
import { runSupremeShieldScan } from '@/lib/supremeShield';

export interface Short {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  duration: number;
  aspect_ratio: string;
  views_count: number;
  likes_count: number;
  shares_count: number;
  is_published: boolean;
  created_at: string;
  author: {
    id: string;
    full_name: string;
    username: string | null;
    avatar_url: string | null;
    is_verified: boolean;
  };
}

export interface ShortAnalytics {
  total_views: number;
  total_likes: number;
  total_shares: number;
  shorts_count: number;
}

export function useShorts() {
  const [shorts, setShorts] = useState<Short[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const { user } = useAuth();

  const fetchShorts = useCallback(async (offset = 0, limit = 10) => {
    try {
      const { data, error } = await supabase
        .from('shorts')
        .select(`
          *,
          author:profiles!shorts_user_id_fkey(
            id,
            full_name,
            username,
            avatar_url,
            is_verified
          )
        `)
        .eq('is_published', true)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      const shortsData = (data || []).map(short => ({
        ...short,
        video_url: normalizeR2Url(short.video_url),
        thumbnail_url: normalizeR2Url(short.thumbnail_url),
        author: short.author || {
          id: short.user_id,
          full_name: 'Unknown',
          username: null,
          avatar_url: null,
          is_verified: false
        }
      }));

      if (offset === 0) {
        setShorts(shortsData);
      } else {
        setShorts(prev => [...prev, ...shortsData]);
      }

      setHasMore(shortsData.length === limit);
    } catch (error) {
      console.error('Error fetching shorts:', error);
      toast.error('Failed to load shorts');
    } finally {
      setLoading(false);
    }
  }, []);

  const likeShort = async (shortId: string) => {
    if (!user) {
      toast.error('Please login to like');
      return false;
    }

    try {
      const { data: existingLike } = await supabase
        .from('short_likes')
        .select('id')
        .eq('short_id', shortId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingLike) {
        await supabase
          .from('short_likes')
          .delete()
          .eq('id', existingLike.id);
        
        // Track unlike interaction
        await supabase
          .from('user_content_interactions')
          .insert({
            user_id: user.id,
            content_type: 'short',
            content_id: shortId,
            interaction_type: 'unlike'
          });
        
        setShorts(prev => prev.map(s => 
          s.id === shortId ? { ...s, likes_count: Math.max(0, s.likes_count - 1) } : s
        ));
        return false;
      } else {
        await supabase
          .from('short_likes')
          .insert({ short_id: shortId, user_id: user.id });
        
        // Track like interaction
        await supabase
          .from('user_content_interactions')
          .insert({
            user_id: user.id,
            content_type: 'short',
            content_id: shortId,
            interaction_type: 'like'
          });
        
        setShorts(prev => prev.map(s => 
          s.id === shortId ? { ...s, likes_count: s.likes_count + 1 } : s
        ));
        return true;
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      toast.error('Failed to update like');
      return false;
    }
  };

  const checkIfLiked = async (shortId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data } = await supabase
        .from('short_likes')
        .select('id')
        .eq('short_id', shortId)
        .eq('user_id', user.id)
        .maybeSingle();

      return !!data;
    } catch {
      return false;
    }
  };

  const recordView = async (shortId: string, watchDuration: number = 0) => {
    try {
      // Record in short_analytics for backward compatibility
      await supabase
        .from('short_analytics')
        .insert({
          short_id: shortId,
          user_id: user?.id || null,
          event_type: 'view',
          watch_duration: watchDuration
        });

      // Also record in user_content_interactions for recommendation system
      if (user) {
        await supabase
          .from('user_content_interactions')
          .insert({
            user_id: user.id,
            content_type: 'short',
            content_id: shortId,
            interaction_type: watchDuration >= 3 ? 'view' : 'skip',
            watch_duration: watchDuration
          });
      }

      // Update views count locally
      setShorts(prev => prev.map(s => 
        s.id === shortId ? { ...s, views_count: s.views_count + 1 } : s
      ));
    } catch (error) {
      console.error('Error recording view:', error);
    }
  };

  const recordInteraction = async (
    shortId: string, 
    interactionType: 'like' | 'unlike' | 'share' | 'complete' | 'replay',
    watchPercentage?: number
  ) => {
    if (!user) return;
    
    try {
      await supabase
        .from('user_content_interactions')
        .insert({
          user_id: user.id,
          content_type: 'short',
          content_id: shortId,
          interaction_type: interactionType,
          watch_percentage: watchPercentage
        });
    } catch (error) {
      console.error('Error recording interaction:', error);
    }
  };

  const shareShort = async (shortId: string) => {
    try {
      await supabase
        .from('short_analytics')
        .insert({
          short_id: shortId,
          user_id: user?.id || null,
          event_type: 'share'
        });

      // Track share interaction for recommendations
      if (user) {
        await supabase
          .from('user_content_interactions')
          .insert({
            user_id: user.id,
            content_type: 'short',
            content_id: shortId,
            interaction_type: 'share'
          });
      }

      setShorts(prev => prev.map(s => 
        s.id === shortId ? { ...s, shares_count: s.shares_count + 1 } : s
      ));

      // Copy link to clipboard
      const url = `${window.location.origin}/shorts/${shortId}`;
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard!');
    } catch (error) {
      console.error('Error sharing short:', error);
    }
  };

  useEffect(() => {
    fetchShorts();
  }, [fetchShorts]);

  return {
    shorts,
    loading,
    hasMore,
    fetchShorts,
    likeShort,
    checkIfLiked,
    recordView,
    shareShort
  };
}

export function useShortsStudio() {
  const [shorts, setShorts] = useState<Short[]>([]);
  const [analytics, setAnalytics] = useState<ShortAnalytics>({
    total_views: 0,
    total_likes: 0,
    total_shares: 0,
    shorts_count: 0
  });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchMyShorts = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('shorts')
        .select(`
          *,
          author:profiles!shorts_user_id_fkey(
            id,
            full_name,
            username,
            avatar_url,
            is_verified
          )
        `)
        .eq('user_id', user.id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const shortsData = (data || []).map(short => ({
        ...short,
        video_url: normalizeR2Url(short.video_url),
        thumbnail_url: normalizeR2Url(short.thumbnail_url),
        author: short.author || {
          id: short.user_id,
          full_name: 'Unknown',
          username: null,
          avatar_url: null,
          is_verified: false
        }
      }));

      setShorts(shortsData);

      // Calculate analytics
      const stats = shortsData.reduce((acc, short) => ({
        total_views: acc.total_views + (short.views_count || 0),
        total_likes: acc.total_likes + (short.likes_count || 0),
        total_shares: acc.total_shares + (short.shares_count || 0),
        shorts_count: acc.shorts_count + 1
      }), { total_views: 0, total_likes: 0, total_shares: 0, shorts_count: 0 });

      setAnalytics(stats);
    } catch (error) {
      console.error('Error fetching my shorts:', error);
      toast.error('Failed to load your shorts');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const createShort = async (
    title: string,
    videoUrl: string,
    thumbnailUrl?: string,
    description?: string,
    duration?: number,
    moderationStatus?: string
  ) => {
    if (!user) {
      toast.error('Please login to upload');
      return null;
    }

    try {
      // Run Supreme Shield scan on title + description
      const textContent = `${title} ${description || ''}`.trim();
      const scanResult = await runSupremeShieldScan({
        text: textContent,
        userId: user.id,
        contentType: 'short',
      });

      // Block if scan blocked
      if (scanResult.action === 'block') {
        toast.error(scanResult.reason || 'Content Blocked: Professional standards violation.');
        return null;
      }

      // Determine if content needs admin review
      // Only send to review for SERIOUS issues, not minor flags
      const isShadowBanned = scanResult.isShadowBanned || scanResult.action === 'shadow_ban';
      
      // Check for high-severity watchlist matches (severity >= 4)
      const hasHighSeverityMatch = scanResult.watchlistResult?.matches?.some(
        (m: { severity_level?: number }) => (m.severity_level ?? 0) >= 4
      );
      
      // Only require review for: shadow banned, blocked (already handled above), or high-severity watchlist
      const requiresReview = isShadowBanned || hasHighSeverityMatch;
      
      const finalModerationStatus = requiresReview ? 'pending_review' : 
                                    moderationStatus || 'approved';

      const { data, error } = await supabase
        .from('shorts')
        .insert({
          user_id: user.id,
          title,
          video_url: videoUrl,
          thumbnail_url: thumbnailUrl,
          description,
          duration: duration || 0,
          is_published: !requiresReview,
          moderation_status: finalModerationStatus,
          moderation_token: scanResult.moderationToken,
          is_approved: !isShadowBanned,
        })
        .select()
        .single();

      if (error) throw error;

      if (finalModerationStatus === 'pending_review') {
        toast.success('Short submitted for review');
      } else {
        toast.success('Short published successfully!');
      }
      await fetchMyShorts();
      return data;
    } catch (error: any) {
      console.error('Error creating short:', error);
      toast.error(error.message || 'Failed to create short');
      return null;
    }
  };

  const deleteShort = async (shortId: string) => {
    if (!user) {
      toast.error('Please login to delete');
      return;
    }

    try {
      // Call edge function to handle R2 deletion with preservation logic
      const response = await supabase.functions.invoke('delete-r2-video', {
        body: { shortId }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to delete short');
      }

      setShorts(prev => prev.filter(s => s.id !== shortId));
      toast.success('Short deleted');
    } catch (error: any) {
      console.error('Error deleting short:', error);
      toast.error(error.message || 'Failed to delete short');
    }
  };

  const togglePublish = async (shortId: string, isPublished: boolean) => {
    try {
      const { error } = await supabase
        .from('shorts')
        .update({ is_published: isPublished })
        .eq('id', shortId)
        .eq('user_id', user?.id);

      if (error) throw error;

      setShorts(prev => prev.map(s => 
        s.id === shortId ? { ...s, is_published: isPublished } : s
      ));
      toast.success(isPublished ? 'Short published' : 'Short unpublished');
    } catch (error) {
      console.error('Error toggling publish:', error);
      toast.error('Failed to update short');
    }
  };

  useEffect(() => {
    fetchMyShorts();
  }, [fetchMyShorts]);

  return {
    shorts,
    analytics,
    loading,
    fetchMyShorts,
    createShort,
    deleteShort,
    togglePublish
  };
}
