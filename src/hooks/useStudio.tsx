import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';

export interface StudioVideo {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  video_url: string | null;
  views_count: number;
  likes_count: number;
  comments_count: number;
  is_published: boolean;
  created_at: string;
  duration: number | null;
}

export interface ChannelStats {
  totalViews: number;
  totalLikes: number;
  totalVideos: number;
  subscriberCount: number;
}

export interface Channel {
  id: string;
  user_id: string;
  channel_name: string | null;
  channel_description: string | null;
  banner_url: string | null;
  is_verified: boolean;
  subscribers_count: number;
  created_at: string;
}

export function useStudio() {
  const { user } = useAuth();
  const [videos, setVideos] = useState<StudioVideo[]>([]);
  const [channel, setChannel] = useState<Channel | null>(null);
  const [stats, setStats] = useState<ChannelStats>({
    totalViews: 0,
    totalLikes: 0,
    totalVideos: 0,
    subscriberCount: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchChannel = useCallback(async () => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('channels')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching channel:', error);
      return null;
    }

    return data;
  }, [user]);

  const createChannel = useCallback(async () => {
    if (!user) return null;

    // Fetch user profile for default channel name
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    const { data, error } = await supabase
      .from('channels')
      .insert({
        user_id: user.id,
        channel_name: profile?.full_name || 'My Channel',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating channel:', error);
      toast({
        title: 'Error',
        description: 'Failed to create channel',
        variant: 'destructive',
      });
      return null;
    }

    return data;
  }, [user]);

  const fetchVideos = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('videos')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching videos:', error);
      return;
    }

    setVideos(data || []);
  }, [user]);

  const fetchStudioData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // Fetch or create channel
    let channelData = await fetchChannel();
    if (!channelData) {
      channelData = await createChannel();
    }
    setChannel(channelData);

    // Fetch videos
    await fetchVideos();

    // Calculate stats from videos
    const { data: videoStats } = await supabase
      .from('videos')
      .select('views_count, likes_count')
      .eq('user_id', user.id);

    if (videoStats) {
      const totalViews = videoStats.reduce((sum, v) => sum + (v.views_count || 0), 0);
      const totalLikes = videoStats.reduce((sum, v) => sum + (v.likes_count || 0), 0);
      
      setStats({
        totalViews,
        totalLikes,
        totalVideos: videoStats.length,
        subscriberCount: channelData?.subscribers_count || 0,
      });
    }

    setLoading(false);
  }, [user, fetchChannel, createChannel, fetchVideos]);

  const updateChannel = useCallback(async (updates: Partial<Channel>) => {
    if (!channel) return false;

    const { error } = await supabase
      .from('channels')
      .update(updates)
      .eq('id', channel.id);

    if (error) {
      console.error('Error updating channel:', error);
      toast({
        title: 'Error',
        description: 'Failed to update channel',
        variant: 'destructive',
      });
      return false;
    }

    setChannel({ ...channel, ...updates });
    toast({
      title: 'Success',
      description: 'Channel updated successfully',
    });
    return true;
  }, [channel]);

  const deleteVideo = useCallback(async (videoId: string) => {
    const { error } = await supabase
      .from('videos')
      .delete()
      .eq('id', videoId);

    if (error) {
      console.error('Error deleting video:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete video',
        variant: 'destructive',
      });
      return false;
    }

    setVideos(videos.filter(v => v.id !== videoId));
    toast({
      title: 'Success',
      description: 'Video deleted successfully',
    });
    return true;
  }, [videos]);

  const toggleVideoPublish = useCallback(async (videoId: string, isPublished: boolean) => {
    const { error } = await supabase
      .from('videos')
      .update({ is_published: isPublished })
      .eq('id', videoId);

    if (error) {
      console.error('Error toggling video publish:', error);
      toast({
        title: 'Error',
        description: 'Failed to update video',
        variant: 'destructive',
      });
      return false;
    }

    setVideos(videos.map(v => 
      v.id === videoId ? { ...v, is_published: isPublished } : v
    ));
    
    toast({
      title: 'Success',
      description: isPublished ? 'Video published' : 'Video unpublished',
    });
    return true;
  }, [videos]);

  const uploadBanner = useCallback(async (file: File) => {
    if (!user || !channel) return null;

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/banner.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('channel-banners')
      .upload(fileName, file, { upsert: true });

    if (uploadError) {
      console.error('Error uploading banner:', uploadError);
      toast({
        title: 'Error',
        description: 'Failed to upload banner',
        variant: 'destructive',
      });
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('channel-banners')
      .getPublicUrl(fileName);

    const bannerUrl = `${urlData.publicUrl}?t=${Date.now()}`;
    await updateChannel({ banner_url: bannerUrl });
    
    return bannerUrl;
  }, [user, channel, updateChannel]);

  useEffect(() => {
    fetchStudioData();
  }, [fetchStudioData]);

  return {
    videos,
    channel,
    stats,
    loading,
    fetchVideos,
    updateChannel,
    deleteVideo,
    toggleVideoPublish,
    uploadBanner,
    refetch: fetchStudioData,
  };
}
