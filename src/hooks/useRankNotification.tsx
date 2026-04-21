import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { RankKey } from '@/lib/ranks';

interface RankNotification {
  id: string;
  old_rank: RankKey;
  new_rank: RankKey;
  created_at: string;
}

export function useRankNotification() {
  const { user } = useAuth();
  const [pendingRankUp, setPendingRankUp] = useState<RankNotification | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPendingNotification = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('rank_notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_shown', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      setPendingRankUp(data as RankNotification | null);
    } catch (error) {
      console.error('Error fetching rank notification:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPendingNotification();
  }, [fetchPendingNotification]);

  const acknowledgeRankUp = useCallback(async () => {
    if (!pendingRankUp) return;

    try {
      await supabase
        .from('rank_notifications')
        .update({ is_shown: true })
        .eq('id', pendingRankUp.id);

      setPendingRankUp(null);
    } catch (error) {
      console.error('Error acknowledging rank up:', error);
    }
  }, [pendingRankUp]);

  return {
    pendingRankUp,
    loading,
    acknowledgeRankUp,
  };
}
