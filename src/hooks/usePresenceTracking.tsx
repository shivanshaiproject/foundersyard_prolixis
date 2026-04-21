import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const HEARTBEAT_INTERVAL = 2 * 60 * 1000; // 2 minutes

export const usePresenceTracking = () => {
  const { user } = useAuth();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!user) {
      // Clear interval if user logs out
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const updatePresence = async () => {
      try {
        // Call the database function to update presence
        await supabase.rpc('update_user_presence');
      } catch (error) {
        console.error('Error updating presence:', error);
      }
    };

    // Update immediately on mount
    updatePresence();

    // Set up interval for heartbeat
    intervalRef.current = setInterval(updatePresence, HEARTBEAT_INTERVAL);

    // Handle visibility change - update when user returns to tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updatePresence();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);
};
