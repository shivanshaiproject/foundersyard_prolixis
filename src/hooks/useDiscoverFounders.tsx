import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface SuggestedFounder {
  id: string;
  full_name: string;
  username: string | null;
  avatar_url: string | null;
  company_name: string | null;
  context_line: string;
  score: number;
}

export function useDiscoverFounders() {
  const { user } = useAuth();
  const [founders, setFounders] = useState<SuggestedFounder[]>([]);
  const [loading, setLoading] = useState(false);
  const fetchedRef = useRef(false);

  const fetchFounders = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-suggested-founders', {
        body: { user_id: user.id, limit: 15 },
      });
      if (!error && data?.founders) {
        setFounders(data.founders);
      }
    } catch (err) {
      console.error('Failed to fetch suggested founders:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!fetchedRef.current && user?.id) {
      fetchedRef.current = true;
      fetchFounders();
    }
  }, [fetchFounders, user?.id]);

  const refresh = useCallback(() => {
    fetchedRef.current = false;
    return fetchFounders();
  }, [fetchFounders]);

  const dismissFounder = useCallback((id: string) => {
    setFounders((prev) => prev.filter((f) => f.id !== id));
  }, []);

  return { founders, loading, refresh, dismissFounder };
}
