import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { sanitizeError } from '@/lib/errorUtils';

export interface AdvertiserProfile {
  id: string;
  user_id: string;
  company_name: string | null;
  website_url: string | null;
  terms_accepted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Wallet {
  id: string;
  advertiser_id: string;
  balance: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface Ad {
  id: string;
  advertiser_id: string;
  headline: string;
  image_url: string | null;
  destination_url: string;
  ad_type: string;
  billing_type: 'cpc' | 'cpm';
  cpc_bid: number | null;
  cpm_rate: number | null;
  daily_budget: number;
  daily_spend: number;
  total_clicks: number;
  total_spend: number;
  impressions_count: number;
  impressions_limit: number | null;
  cpm_spent: number;
  status: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface WalletTransaction {
  id: string;
  wallet_id: string;
  amount: number;
  type: string;
  description: string | null;
  razorpay_payment_id: string | null;
  razorpay_order_id: string | null;
  created_at: string;
}

export interface AdClick {
  id: string;
  ad_id: string;
  user_id: string | null;
  ip_address: string | null;
  cost: number;
  created_at: string;
}

export function useAdvertiser() {
  const { user } = useAuth();
  const [advertiserProfile, setAdvertiserProfile] = useState<AdvertiserProfile | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdvertiser, setIsAdvertiser] = useState(false);
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setAdvertiserProfile(null);
      setWallet(null);
      setIsAdvertiser(false);
      setError(null);
      setChecked(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setChecked(false);
    setError(null);
    fetchAdvertiserData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const fetchAdvertiserData = async () => {
    if (!user) return;

    setLoading(true);
    setChecked(false);
    setError(null);

    try {
      const { data: profile, error: profileError } = await supabase
        .from('advertiser_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (!profile) {
        setAdvertiserProfile(null);
        setWallet(null);
        setIsAdvertiser(false);
        return;
      }

      setAdvertiserProfile(profile as AdvertiserProfile);
      setIsAdvertiser(true);

      let { data: walletData, error: walletFetchError } = await supabase
        .from('wallets')
        .select('*')
        .eq('advertiser_id', profile.id)
        .maybeSingle();

      if (walletFetchError) throw walletFetchError;

      // Auto-create wallet if missing for existing advertiser
      if (!walletData) {
        const { data: newWallet, error: walletError } = await supabase
          .from('wallets')
          .insert({
            advertiser_id: profile.id,
            balance: 0,
          })
          .select()
          .single();

        if (walletError) {
          throw walletError;
        }

        walletData = newWallet;
        // Wallet created silently - no need to show technical message to user
      }

      if (walletData) {
        setWallet(walletData as Wallet);
      }
    } catch (err: any) {
      console.error('Error fetching advertiser data:', err);
      setAdvertiserProfile(null);
      setWallet(null);
      setIsAdvertiser(false);
      setError(sanitizeError(err));
    } finally {
      setLoading(false);
      setChecked(true);
    }
  };

  const becomeAdvertiser = async () => {
    if (!user) {
      toast.error('You must be logged in to become an advertiser');
      return null;
    }

    try {
      // Create advertiser profile
      const { data: profile, error: profileError } = await supabase
        .from('advertiser_profiles')
        .insert({
          user_id: user.id,
          terms_accepted_at: new Date().toISOString()
        })
        .select()
        .single();

      if (profileError) throw profileError;

      // Create wallet
      const { data: walletData, error: walletError } = await supabase
        .from('wallets')
        .insert({
          advertiser_id: profile.id,
          balance: 0
        })
        .select()
        .single();

      if (walletError) throw walletError;

      setAdvertiserProfile(profile as AdvertiserProfile);
      setWallet(walletData as Wallet);
      setIsAdvertiser(true);

      toast.success('Welcome to FoundersYard Ads!');
      return profile;
    } catch (error: any) {
      console.error('Error becoming advertiser:', error);
      toast.error(sanitizeError(error));
      return null;
    }
  };

  const refreshWallet = async () => {
    if (!advertiserProfile) return;

    const { data: walletData } = await supabase
      .from('wallets')
      .select('*')
      .eq('advertiser_id', advertiserProfile.id)
      .maybeSingle();

    if (walletData) {
      setWallet(walletData as Wallet);
    }
  };

  return {
    advertiserProfile,
    wallet,
    loading,
    checked,
    error,
    isAdvertiser,
    becomeAdvertiser,
    refreshWallet,
    refetch: fetchAdvertiserData
  };
}
