import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface Channel {
  id: string;
  user_id: string;
  channel_name: string | null;
  channel_description: string | null;
  banner_url: string | null;
  is_verified: boolean;
  subscribers_count: number;
  created_at: string;
  updated_at: string;
  profile?: {
    full_name: string;
    username: string | null;
    avatar_url: string | null;
    is_verified: boolean;
  };
}

export interface Video {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  video_url: string | null;
  views_count: number;
  likes_count: number;
  comments_count: number;
  created_at: string;
  is_published: boolean;
}

export function useChannel(userId?: string) {
  const [channel, setChannel] = useState<Channel | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchChannel = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      // Fetch channel
      const { data: channelData, error: channelError } = await supabase
        .from('channels')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (channelError) throw channelError;

      // Fetch profile info
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, username, avatar_url, is_verified')
        .eq('id', userId)
        .single();

      if (channelData) {
        setChannel({
          ...channelData,
          profile: profileData || undefined
        });
      } else {
        // Create channel with profile info
        setChannel({
          id: '',
          user_id: userId,
          channel_name: profileData?.full_name || 'Channel',
          channel_description: null,
          banner_url: null,
          is_verified: profileData?.is_verified || false,
          subscribers_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          profile: profileData || undefined
        });
      }

      // Fetch videos
      const { data: videosData } = await supabase
        .from('videos')
        .select('*')
        .eq('user_id', userId)
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      setVideos(videosData || []);

      // Check subscription status
      if (user && channelData) {
        const { data: subData } = await supabase
          .from('channel_subscriptions')
          .select('id')
          .eq('channel_id', channelData.id)
          .eq('subscriber_id', user.id)
          .maybeSingle();
        
        setIsSubscribed(!!subData);
      }

    } catch (error) {
      console.error('Error fetching channel:', error);
    } finally {
      setLoading(false);
    }
  }, [userId, user]);

  useEffect(() => {
    fetchChannel();
  }, [fetchChannel]);

  const subscribe = async () => {
    if (!user) {
      toast({
        title: 'Login required',
        description: 'Please login to subscribe',
        variant: 'destructive',
      });
      return false;
    }

    if (!channel?.id) {
      toast({
        title: 'Error',
        description: 'Channel not found',
        variant: 'destructive',
      });
      return false;
    }

    try {
      const { error } = await supabase
        .from('channel_subscriptions')
        .insert({
          channel_id: channel.id,
          subscriber_id: user.id
        });

      if (error) throw error;

      setIsSubscribed(true);
      setChannel(prev => prev ? {
        ...prev,
        subscribers_count: prev.subscribers_count + 1
      } : null);

      toast({
        title: 'Subscribed!',
        description: `You're now subscribed to ${channel.channel_name || 'this channel'}`,
      });

      return true;
    } catch (error: any) {
      if (error.code === '23505') {
        setIsSubscribed(true);
        return true;
      }
      console.error('Subscribe error:', error);
      toast({
        title: 'Error',
        description: 'Failed to subscribe',
        variant: 'destructive',
      });
      return false;
    }
  };

  const unsubscribe = async () => {
    if (!user || !channel?.id) return false;

    try {
      const { error } = await supabase
        .from('channel_subscriptions')
        .delete()
        .eq('channel_id', channel.id)
        .eq('subscriber_id', user.id);

      if (error) throw error;

      setIsSubscribed(false);
      setChannel(prev => prev ? {
        ...prev,
        subscribers_count: Math.max(0, prev.subscribers_count - 1)
      } : null);

      toast({
        title: 'Unsubscribed',
        description: 'You have unsubscribed from this channel',
      });

      return true;
    } catch (error) {
      console.error('Unsubscribe error:', error);
      return false;
    }
  };

  const toggleSubscribe = async () => {
    if (isSubscribed) {
      return unsubscribe();
    } else {
      return subscribe();
    }
  };

  return {
    channel,
    videos,
    loading,
    isSubscribed,
    subscribe,
    unsubscribe,
    toggleSubscribe,
    refetch: fetchChannel
  };
}

export function useSaveVideo() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [savedVideos, setSavedVideos] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const fetchSavedVideos = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data } = await supabase
        .from('saved_videos')
        .select('video_id')
        .eq('user_id', user.id);
      
      if (data) {
        setSavedVideos(new Set(data.map(s => s.video_id)));
      }
    } catch (error) {
      console.error('Error fetching saved videos:', error);
    }
  }, [user]);

  useEffect(() => {
    fetchSavedVideos();
  }, [fetchSavedVideos]);

  const saveVideo = async (videoId: string) => {
    if (!user) {
      toast({
        title: 'Login required',
        description: 'Please login to save videos',
        variant: 'destructive',
      });
      return false;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('saved_videos')
        .insert({
          video_id: videoId,
          user_id: user.id
        });

      if (error) throw error;

      setSavedVideos(prev => new Set([...prev, videoId]));
      toast({
        title: 'Video saved',
        description: 'Added to your saved videos',
      });
      return true;
    } catch (error: any) {
      if (error.code === '23505') {
        return unsaveVideo(videoId);
      }
      console.error('Save error:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const unsaveVideo = async (videoId: string) => {
    if (!user) return false;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('saved_videos')
        .delete()
        .eq('video_id', videoId)
        .eq('user_id', user.id);

      if (error) throw error;

      setSavedVideos(prev => {
        const next = new Set(prev);
        next.delete(videoId);
        return next;
      });
      toast({
        title: 'Removed',
        description: 'Video removed from saved',
      });
      return true;
    } catch (error) {
      console.error('Unsave error:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const toggleSave = async (videoId: string) => {
    if (savedVideos.has(videoId)) {
      return unsaveVideo(videoId);
    }
    return saveVideo(videoId);
  };

  const isSaved = (videoId: string) => savedVideos.has(videoId);

  return {
    savedVideos,
    loading,
    saveVideo,
    unsaveVideo,
    toggleSave,
    isSaved
  };
}
