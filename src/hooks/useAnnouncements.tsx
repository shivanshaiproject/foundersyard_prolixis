import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

type MediaType = 'image' | 'gif' | 'video' | null;

interface Announcement {
  id: string;
  title: string;
  content: string;
  media_url: string | null;
  media_type: MediaType;
  cta_text: string | null;
  cta_url: string | null;
  created_at: string;
}

export function useAnnouncements() {
  const { user } = useAuth();
  const [currentAnnouncement, setCurrentAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUnviewedAnnouncements = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Get active announcements that user hasn't dismissed
      const { data: announcements, error } = await supabase
        .from('announcements')
        .select(`
          id,
          title,
          content,
          media_url,
          media_type,
          cta_text,
          cta_url,
          created_at
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!announcements || announcements.length === 0) {
        setCurrentAnnouncement(null);
        setLoading(false);
        return;
      }

      // Check which ones user has already dismissed
      const { data: views, error: viewsError } = await supabase
        .from('announcement_views')
        .select('announcement_id, dismissed_at')
        .eq('user_id', user.id);

      if (viewsError) throw viewsError;

      const dismissedIds = new Set(
        (views || [])
          .filter(v => v.dismissed_at !== null)
          .map(v => v.announcement_id)
      );

      // Find first unviewed announcement
      const unviewed = announcements.find(a => !dismissedIds.has(a.id));
      if (unviewed) {
        setCurrentAnnouncement({
          ...unviewed,
          media_type: unviewed.media_type as MediaType,
        });

        // Track view if not already tracked
        const existingView = views?.find(v => v.announcement_id === unviewed.id);
        if (!existingView) {
          await supabase.from('announcement_views').insert({
            announcement_id: unviewed.id,
            user_id: user.id,
          });
        }
      } else {
        setCurrentAnnouncement(null);
      }
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchUnviewedAnnouncements();
  }, [fetchUnviewedAnnouncements]);

  const dismissAnnouncement = useCallback(async () => {
    if (!user || !currentAnnouncement) return;

    try {
      await supabase
        .from('announcement_views')
        .upsert({
          announcement_id: currentAnnouncement.id,
          user_id: user.id,
          dismissed_at: new Date().toISOString(),
        }, {
          onConflict: 'announcement_id,user_id',
        });

      setCurrentAnnouncement(null);
      // Fetch next unviewed announcement
      fetchUnviewedAnnouncements();
    } catch (error) {
      console.error('Error dismissing announcement:', error);
    }
  }, [user, currentAnnouncement, fetchUnviewedAnnouncements]);

  return {
    currentAnnouncement,
    loading,
    dismissAnnouncement,
  };
}
