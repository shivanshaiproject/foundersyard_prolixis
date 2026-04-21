import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface StrikeStatus {
  strike_count: number;
  last_strike_date: string | null;
  last_strike_reason: string | null;
  suspended_until: string | null;
  is_permanent_ban: boolean;
}

interface StrikeHistoryItem {
  id: string;
  strike_number: number;
  reason: string;
  issued_at: string;
  issued_by: string;
}

export function useStrikes() {
  const { user } = useAuth();
  const [strikeStatus, setStrikeStatus] = useState<StrikeStatus | null>(null);
  const [strikeHistory, setStrikeHistory] = useState<StrikeHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStrikeStatus = async () => {
    if (!user) {
      setStrikeStatus(null);
      setStrikeHistory([]);
      setLoading(false);
      return;
    }

    try {
      // Fetch current strike status
      const { data: status } = await supabase
        .from('user_strikes')
        .select('*')
        .eq('user_id', user.id)
        .single();

      setStrikeStatus(status || {
        strike_count: 0,
        last_strike_date: null,
        last_strike_reason: null,
        suspended_until: null,
        is_permanent_ban: false,
      });

      // Fetch strike history
      const { data: history } = await supabase
        .from('strike_history')
        .select('*')
        .eq('user_id', user.id)
        .order('issued_at', { ascending: false });

      setStrikeHistory(history || []);
    } catch (err) {
      console.error('Error fetching strike status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStrikeStatus();
  }, [user]);

  const isSuspended = () => {
    if (!strikeStatus) return false;
    if (strikeStatus.is_permanent_ban) return true;
    if (strikeStatus.suspended_until) {
      return new Date(strikeStatus.suspended_until) > new Date();
    }
    return false;
  };

  const getSuspensionEndDate = () => {
    if (!strikeStatus?.suspended_until) return null;
    return new Date(strikeStatus.suspended_until);
  };

  const getStatusColor = () => {
    if (!strikeStatus) return 'text-success';
    switch (strikeStatus.strike_count) {
      case 0: return 'text-success';
      case 1: return 'text-warning';
      case 2: return 'text-orange-500';
      case 3: return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusLabel = () => {
    if (!strikeStatus) return 'Good Standing';
    if (strikeStatus.is_permanent_ban) return 'Account Disabled';
    if (isSuspended()) return 'Suspended';
    switch (strikeStatus.strike_count) {
      case 0: return 'Good Standing';
      case 1: return 'Warning Issued';
      case 2: return 'Final Warning';
      default: return 'Unknown';
    }
  };

  return {
    strikeStatus,
    strikeHistory,
    loading,
    isSuspended,
    getSuspensionEndDate,
    getStatusColor,
    getStatusLabel,
    refetch: fetchStrikeStatus,
  };
}
