import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { format } from 'date-fns';

export type SubscriptionTier = 'free' | 'one_time' | 'pro';

export interface UsageLimits {
  analyses_count: number;
  chat_queries_count: number;
  pitch_reviews_count: number;
  stress_test_refreshes: number;
}

export interface Usage {
  analyses_count: number;
  chat_queries_count: number;
  pitch_reviews_count: number;
  stress_test_refreshes: number;
}

// Define limits per tier
const TIER_LIMITS: Record<SubscriptionTier, UsageLimits> = {
  free: {
    analyses_count: 1, // Total, not monthly
    chat_queries_count: 4, // Per day
    pitch_reviews_count: 0,
    stress_test_refreshes: 0,
  },
  one_time: {
    analyses_count: 1, // One startup only
    chat_queries_count: 0, // No chat
    pitch_reviews_count: 1,
    stress_test_refreshes: 0,
  },
  pro: {
    analyses_count: 4, // Per month
    chat_queries_count: 30, // Per month
    pitch_reviews_count: 2, // Per month
    stress_test_refreshes: 4, // Per month
  },
};

export function useSubscription() {
  const { user } = useAuth();
  const [tier, setTier] = useState<SubscriptionTier>('free');
  const [usage, setUsage] = useState<Usage>({
    analyses_count: 0,
    chat_queries_count: 0,
    pitch_reviews_count: 0,
    stress_test_refreshes: 0,
  });
  const [loading, setLoading] = useState(true);
  const [oneTimeUsed, setOneTimeUsed] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  const currentMonth = format(new Date(), 'yyyy-MM');

  const fetchSubscription = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Fetch subscription
      const { data: subscription } = await supabase
        .from('intelligent_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (subscription) {
        const plan = subscription.plan as string;
        
        // Check if subscription has expired (for pro plan)
        if (plan === 'pro' && subscription.expires_at) {
          const expiry = new Date(subscription.expires_at);
          const now = new Date();
          
          if (expiry < now) {
            // Subscription expired, update to cancelled
            await supabase
              .from('intelligent_subscriptions')
              .update({ status: 'expired' })
              .eq('id', subscription.id);
            
            setTier('free');
            setExpiresAt(null);
            console.log('Pro subscription expired, downgraded to free');
          } else {
            setTier('pro');
            setExpiresAt(subscription.expires_at);
          }
        } else if (plan === 'pro') {
          setTier('pro');
          setExpiresAt(subscription.expires_at);
        } else if (plan === 'one_time') {
          setTier('one_time');
          setOneTimeUsed(subscription.one_time_used ?? false);
          setExpiresAt(null);
        } else {
          setTier('free');
          setExpiresAt(null);
        }
      } else {
        setTier('free');
        setExpiresAt(null);
      }

      // Fetch usage for current month
      const { data: usageData } = await supabase
        .from('user_usage')
        .select('*')
        .eq('user_id', user.id)
        .eq('month', currentMonth)
        .maybeSingle();

      if (usageData) {
        setUsage({
          analyses_count: usageData.analyses_count ?? 0,
          chat_queries_count: usageData.chat_queries_count ?? 0,
          pitch_reviews_count: usageData.pitch_reviews_count ?? 0,
          stress_test_refreshes: usageData.stress_test_refreshes ?? 0,
        });
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setLoading(false);
    }
  }, [user, currentMonth]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const getLimits = useCallback((): UsageLimits => {
    return TIER_LIMITS[tier];
  }, [tier]);

  const canUse = useCallback((feature: keyof UsageLimits): boolean => {
    const limits = getLimits();
    
    // One-time tier special handling
    if (tier === 'one_time' && oneTimeUsed) {
      return false;
    }

    // Check if feature is available for this tier
    if (limits[feature] === 0) {
      return false;
    }

    // Check usage against limit
    return usage[feature] < limits[feature];
  }, [tier, usage, oneTimeUsed, getLimits]);

  const getRemainingUsage = useCallback((feature: keyof UsageLimits): number => {
    const limits = getLimits();
    const remaining = limits[feature] - usage[feature];
    return Math.max(0, remaining);
  }, [usage, getLimits]);

  const incrementUsage = useCallback(async (feature: keyof UsageLimits): Promise<boolean> => {
    if (!user) return false;
    if (!canUse(feature)) return false;

    try {
      // Upsert usage record
      const { data: existing } = await supabase
        .from('user_usage')
        .select('*')
        .eq('user_id', user.id)
        .eq('month', currentMonth)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('user_usage')
          .update({ 
            [feature]: (existing[feature] ?? 0) + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_usage')
          .insert({
            user_id: user.id,
            month: currentMonth,
            [feature]: 1
          });

        if (error) throw error;
      }

      // Update local state
      setUsage(prev => ({
        ...prev,
        [feature]: prev[feature] + 1
      }));

      return true;
    } catch (error) {
      console.error('Error incrementing usage:', error);
      return false;
    }
  }, [user, currentMonth, canUse]);

  const isFeatureLocked = useCallback((feature: keyof UsageLimits): boolean => {
    const limits = getLimits();
    return limits[feature] === 0;
  }, [getLimits]);

  const isPro = tier === 'pro';
  const isFree = tier === 'free';
  const isOneTime = tier === 'one_time';

  // Calculate days remaining for pro subscription
  const daysRemaining = expiresAt 
    ? Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  return {
    tier,
    usage,
    loading,
    limits: getLimits(),
    canUse,
    getRemainingUsage,
    incrementUsage,
    isFeatureLocked,
    isPro,
    isFree,
    isOneTime,
    oneTimeUsed,
    expiresAt,
    daysRemaining,
    refetch: fetchSubscription,
  };
}
