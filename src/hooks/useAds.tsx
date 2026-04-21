import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAdvertiser, AdClick } from './useAdvertiser';
import { toast } from 'sonner';

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

export interface AdImpression {
  id: string;
  ad_id: string;
  user_id: string | null;
  ip_address: string | null;
  created_at: string;
}

export function useAds() {
  const { advertiserProfile } = useAdvertiser();
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (advertiserProfile) {
      fetchAds();
    } else {
      setLoading(false);
    }
  }, [advertiserProfile]);

  const fetchAds = async () => {
    if (!advertiserProfile) return;

    try {
      const { data, error } = await supabase
        .from('ads')
        .select('*')
        .eq('advertiser_id', advertiserProfile.id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAds((data || []) as Ad[]);
    } catch (error) {
      console.error('Error fetching ads:', error);
    } finally {
      setLoading(false);
    }
  };

  const createAd = async (adData: {
    headline: string;
    image_url?: string;
    destination_url: string;
    ad_type: string;
    billing_type: 'cpc' | 'cpm';
    cpc_bid?: number | null;
    cpm_rate?: number | null;
    daily_budget?: number;
    impressions_limit?: number | null;
    scheduled_at?: string | null;
  }) => {
    if (!advertiserProfile) {
      toast.error('You must be an advertiser to create ads');
      return null;
    }

    try {
      const insertData: any = {
        advertiser_id: advertiserProfile.id,
        headline: adData.headline,
        destination_url: adData.destination_url,
        ad_type: adData.ad_type,
        billing_type: adData.billing_type,
      };

      if (adData.image_url) {
        insertData.image_url = adData.image_url;
      }

      if (adData.billing_type === 'cpc') {
        insertData.cpc_bid = adData.cpc_bid;
        insertData.daily_budget = adData.daily_budget;
      } else {
        insertData.cpm_rate = adData.cpm_rate;
        insertData.impressions_limit = adData.impressions_limit;
        insertData.daily_budget = adData.daily_budget || 0;
      }

      // Always set status to pending_approval - admin must approve
      insertData.status = 'pending_approval';

      // Add scheduling if provided (will be applied after admin approves)
      if (adData.scheduled_at) {
        insertData.scheduled_at = adData.scheduled_at;
      }

      const { data, error } = await supabase
        .from('ads')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      
      setAds(prev => [data as Ad, ...prev]);
      toast.success('Ad submitted for approval! You\'ll be notified once it\'s reviewed.');
      return data;
    } catch (error: any) {
      console.error('Error creating ad:', error);
      toast.error(error.message || 'Failed to create ad');
      return null;
    }
  };

  const updateAd = async (adId: string, updates: Partial<Ad>) => {
    try {
      const { data, error } = await supabase
        .from('ads')
        .update(updates)
        .eq('id', adId)
        .select()
        .single();

      if (error) throw error;

      setAds(prev => prev.map(ad => ad.id === adId ? data as Ad : ad));
      toast.success('Ad updated successfully!');
      return data;
    } catch (error: any) {
      console.error('Error updating ad:', error);
      toast.error(error.message || 'Failed to update ad');
      return null;
    }
  };

  const pauseAd = async (adId: string) => {
    // Only active ads can be paused
    const ad = ads.find(a => a.id === adId);
    if (ad && ad.status !== 'active') {
      toast.error('Only active ads can be paused');
      return null;
    }
    return updateAd(adId, { status: 'paused' });
  };

  const resumeAd = async (adId: string) => {
    // SECURITY: Only paused ads can be resumed - prevents bypassing approval
    const ad = ads.find(a => a.id === adId);
    if (ad && ad.status !== 'paused') {
      toast.error('Only paused ads can be resumed');
      return null;
    }
    return updateAd(adId, { status: 'active' });
  };

  const deleteAd = async (adId: string) => {
    try {
      const { error } = await supabase
        .from('ads')
        .update({ is_deleted: true })
        .eq('id', adId);

      if (error) throw error;

      setAds(prev => prev.filter(ad => ad.id !== adId));
      toast.success('Ad deleted successfully!');
      return true;
    } catch (error: any) {
      console.error('Error deleting ad:', error);
      toast.error(error.message || 'Failed to delete ad');
      return false;
    }
  };

  const getAdClicks = async (adId: string): Promise<AdClick[]> => {
    try {
      const { data, error } = await supabase
        .from('ad_clicks')
        .select('*')
        .eq('ad_id', adId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as AdClick[];
    } catch (error) {
      console.error('Error fetching clicks:', error);
      return [];
    }
  };

  const getClicksOverTime = useCallback(async (days: number = 30) => {
    if (!advertiserProfile) return [];

    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data: adsData } = await supabase
        .from('ads')
        .select('id')
        .eq('advertiser_id', advertiserProfile.id);

      if (!adsData || adsData.length === 0) return [];

      const adIds = adsData.map(ad => ad.id);

      const { data: clicks, error } = await supabase
        .from('ad_clicks')
        .select('created_at, cost')
        .in('ad_id', adIds)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      const clicksByDay: { [key: string]: { clicks: number; spend: number } } = {};
      
      for (let i = 0; i <= days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (days - i));
        const key = date.toISOString().split('T')[0];
        clicksByDay[key] = { clicks: 0, spend: 0 };
      }

      (clicks || []).forEach((click: any) => {
        const key = click.created_at.split('T')[0];
        if (clicksByDay[key]) {
          clicksByDay[key].clicks += 1;
          clicksByDay[key].spend += click.cost;
        }
      });

      return Object.entries(clicksByDay).map(([date, data]) => ({
        date,
        clicks: data.clicks,
        spend: data.spend / 100
      }));
    } catch (error) {
      console.error('Error fetching clicks over time:', error);
      return [];
    }
  }, [advertiserProfile]);

  const getImpressionsOverTime = useCallback(async (days: number = 30) => {
    if (!advertiserProfile) return [];

    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data: adsData } = await supabase
        .from('ads')
        .select('id')
        .eq('advertiser_id', advertiserProfile.id);

      if (!adsData || adsData.length === 0) return [];

      const adIds = adsData.map(ad => ad.id);

      const { data: impressions, error } = await supabase
        .from('ad_impressions')
        .select('created_at')
        .in('ad_id', adIds)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      const impressionsByDay: { [key: string]: number } = {};
      
      for (let i = 0; i <= days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (days - i));
        const key = date.toISOString().split('T')[0];
        impressionsByDay[key] = 0;
      }

      (impressions || []).forEach((imp: any) => {
        const key = imp.created_at.split('T')[0];
        if (impressionsByDay[key] !== undefined) {
          impressionsByDay[key] += 1;
        }
      });

      return Object.entries(impressionsByDay).map(([date, impressions]) => ({
        date,
        impressions
      }));
    } catch (error) {
      console.error('Error fetching impressions over time:', error);
      return [];
    }
  }, [advertiserProfile]);

  const getTotalImpressions = useCallback(async () => {
    if (!advertiserProfile) return 0;

    try {
      const { data: adsData } = await supabase
        .from('ads')
        .select('id')
        .eq('advertiser_id', advertiserProfile.id);

      if (!adsData || adsData.length === 0) return 0;

      const adIds = adsData.map(ad => ad.id);

      const { count, error } = await supabase
        .from('ad_impressions')
        .select('*', { count: 'exact', head: true })
        .in('ad_id', adIds);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error fetching total impressions:', error);
      return 0;
    }
  }, [advertiserProfile]);

  const getTotalClicks = useCallback(async () => {
    if (!advertiserProfile) return 0;

    try {
      const { data: adsData } = await supabase
        .from('ads')
        .select('id')
        .eq('advertiser_id', advertiserProfile.id);

      if (!adsData || adsData.length === 0) return 0;

      const adIds = adsData.map(ad => ad.id);

      const { count, error } = await supabase
        .from('ad_clicks')
        .select('*', { count: 'exact', head: true })
        .in('ad_id', adIds);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error fetching total clicks:', error);
      return 0;
    }
  }, [advertiserProfile]);

  // Get stats for a specific ad
  const getAdStats = useCallback(async (adId: string) => {
    try {
      // Get the ad itself
      const { data: ad, error: adError } = await supabase
        .from('ads')
        .select('*')
        .eq('id', adId)
        .single();

      if (adError) throw adError;

      // Get click count
      const { count: clickCount } = await supabase
        .from('ad_clicks')
        .select('*', { count: 'exact', head: true })
        .eq('ad_id', adId);

      // Get impression count from ad_impressions table
      const { count: impressionCount } = await supabase
        .from('ad_impressions')
        .select('*', { count: 'exact', head: true })
        .eq('ad_id', adId);

      const clicks = clickCount || 0;
      const impressions = ad.impressions_count || impressionCount || 0;
      const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
      
      const spend = ad.billing_type === 'cpm' 
        ? (ad.cpm_spent || 0) 
        : (ad.total_spend || 0);

      return {
        ad: ad as Ad,
        clicks,
        impressions,
        ctr,
        spend
      };
    } catch (error) {
      console.error('Error fetching ad stats:', error);
      return null;
    }
  }, []);

  // Get impressions over time for a specific ad
  const getAdImpressionsOverTime = useCallback(async (adId: string, days: number = 30) => {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data: impressions, error } = await supabase
        .from('ad_impressions')
        .select('created_at')
        .eq('ad_id', adId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      const impressionsByDay: { [key: string]: number } = {};
      
      for (let i = 0; i <= days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (days - i));
        const key = date.toISOString().split('T')[0];
        impressionsByDay[key] = 0;
      }

      (impressions || []).forEach((imp: any) => {
        const key = imp.created_at.split('T')[0];
        if (impressionsByDay[key] !== undefined) {
          impressionsByDay[key] += 1;
        }
      });

      return Object.entries(impressionsByDay).map(([date, impressions]) => ({
        date,
        impressions
      }));
    } catch (error) {
      console.error('Error fetching ad impressions over time:', error);
      return [];
    }
  }, []);

  // Get clicks over time for a specific ad
  const getAdClicksOverTime = useCallback(async (adId: string, days: number = 30) => {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data: clicks, error } = await supabase
        .from('ad_clicks')
        .select('created_at, cost')
        .eq('ad_id', adId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      const clicksByDay: { [key: string]: { clicks: number; spend: number } } = {};
      
      for (let i = 0; i <= days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (days - i));
        const key = date.toISOString().split('T')[0];
        clicksByDay[key] = { clicks: 0, spend: 0 };
      }

      (clicks || []).forEach((click: any) => {
        const key = click.created_at.split('T')[0];
        if (clicksByDay[key]) {
          clicksByDay[key].clicks += 1;
          clicksByDay[key].spend += click.cost || 0;
        }
      });

      return Object.entries(clicksByDay).map(([date, data]) => ({
        date,
        clicks: data.clicks,
        spend: data.spend / 100
      }));
    } catch (error) {
      console.error('Error fetching ad clicks over time:', error);
      return [];
    }
  }, []);

  return {
    ads,
    loading,
    createAd,
    updateAd,
    pauseAd,
    resumeAd,
    deleteAd,
    getAdClicks,
    getClicksOverTime,
    getImpressionsOverTime,
    getTotalImpressions,
    getTotalClicks,
    getAdStats,
    getAdImpressionsOverTime,
    getAdClicksOverTime,
    refetch: fetchAds
  };
}
