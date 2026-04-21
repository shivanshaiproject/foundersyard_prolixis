import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, Json } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;

// Social link type definition
export interface SocialLink {
  type: 'twitter' | 'github' | 'linkedin' | 'instagram' | 'youtube' | 'website' | 'custom';
  url: string;
  label?: string;
}

interface ProfileWithStats extends Omit<Profile, 'social_links'> {
  networkCount: number;
  postsCount: number;
  networkStatus?: 'none' | 'pending' | 'requested' | 'networked';
  social_links: SocialLink[];
  mutualConnections?: Array<{
    id: string;
    full_name: string;
    avatar_url: string | null;
  }>;
}

// Helper to safely parse social_links JSON
const parseSocialLinks = (json: unknown): SocialLink[] => {
  if (!json) return [];
  if (Array.isArray(json)) {
    return json.filter((item): item is SocialLink => 
      typeof item === 'object' && 
      item !== null && 
      'type' in item && 
      'url' in item &&
      typeof (item as SocialLink).type === 'string' &&
      typeof (item as SocialLink).url === 'string'
    );
  }
  return [];
};

export function useProfile(profileId?: string) {
  const [profile, setProfile] = useState<ProfileWithStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    if (!profileId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profileData) {
        setProfile(null);
        return;
      }

      // Get network count (accepted connections)
      const { count: networkCount } = await supabase
        .from('network_connections')
        .select('*', { count: 'exact', head: true })
        .or(`requester_id.eq.${profileId},receiver_id.eq.${profileId}`)
        .eq('status', 'accepted');

      // Get posts count
      const { count: postsCount } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profileId);

      const { data: { user } } = await supabase.auth.getUser();
      let networkStatus: ProfileWithStats['networkStatus'] = 'none';
      let mutualConnections: ProfileWithStats['mutualConnections'] = [];

      if (user && user.id !== profileId) {
        // Check connection status
        const { data: connectionData } = await supabase
          .from('network_connections')
          .select('*')
          .or(
            `and(requester_id.eq.${user.id},receiver_id.eq.${profileId}),and(requester_id.eq.${profileId},receiver_id.eq.${user.id})`
          )
          .maybeSingle();

        if (connectionData) {
          if (connectionData.status === 'accepted') {
            networkStatus = 'networked';
          } else if (connectionData.status === 'pending') {
            networkStatus = connectionData.requester_id === user.id ? 'requested' : 'pending';
          }
        }

        // Get mutual connections
        const { data: myConnections } = await supabase
          .from('network_connections')
          .select('requester_id, receiver_id')
          .eq('status', 'accepted')
          .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`);

        const { data: theirConnections } = await supabase
          .from('network_connections')
          .select('requester_id, receiver_id')
          .eq('status', 'accepted')
          .or(`requester_id.eq.${profileId},receiver_id.eq.${profileId}`);

        if (myConnections && theirConnections) {
          const myNetworkIds = new Set(
            myConnections.flatMap(c =>
              c.requester_id === user.id ? [c.receiver_id] : [c.requester_id]
            )
          );

          const theirNetworkIds = theirConnections.flatMap(c =>
            c.requester_id === profileId ? [c.receiver_id] : [c.requester_id]
          );

          const mutualIds = theirNetworkIds.filter(id => myNetworkIds.has(id));

          if (mutualIds.length > 0) {
            const { data: mutualProfiles } = await supabase
              .from('profiles')
              .select('id, full_name, avatar_url')
              .in('id', mutualIds.slice(0, 5));

            mutualConnections = mutualProfiles || [];
          }
        }
      }

      setProfile({
        ...profileData,
        networkCount: networkCount || 0,
        postsCount: postsCount || 0,
        networkStatus,
        social_links: parseSocialLinks(profileData.social_links),
        mutualConnections,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [profileId]);

  const handleNetworkAction = async () => {
    if (!profile || !profileId) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id === profileId) return;

    if (profile.networkStatus === 'none') {
      // Send network request
      const { error } = await supabase.from('network_connections').insert({
        requester_id: user.id,
        receiver_id: profileId,
        status: 'pending',
      });

      if (!error) {
        setProfile({ ...profile, networkStatus: 'requested' });

        // Create notification
        const { data: targetProfile } = await supabase
          .from('profiles')
          .select('notifications_enabled')
          .eq('id', profileId)
          .single();

        if (targetProfile?.notifications_enabled) {
          await supabase.from('notifications').insert({
            user_id: profileId,
            actor_id: user.id,
            type: 'network_request',
          });
        }
      }
    } else if (profile.networkStatus === 'pending') {
      // Accept incoming request
      const { data: connection } = await supabase
        .from('network_connections')
        .select('id, requester_id')
        .eq('requester_id', profileId)
        .eq('receiver_id', user.id)
        .eq('status', 'pending')
        .single();

      if (connection) {
        const { error } = await supabase
          .from('network_connections')
          .update({ status: 'accepted', accepted_at: new Date().toISOString() })
          .eq('id', connection.id);

        if (!error) {
          setProfile({
            ...profile,
            networkStatus: 'networked',
            networkCount: profile.networkCount + 1,
          });

          // Create notification
          const { data: requesterProfile } = await supabase
            .from('profiles')
            .select('notifications_enabled')
            .eq('id', profileId)
            .single();

          if (requesterProfile?.notifications_enabled) {
            await supabase.from('notifications').insert({
              user_id: profileId,
              actor_id: user.id,
              type: 'network_accepted',
            });
          }
        }
      }
    } else if (profile.networkStatus === 'requested') {
      // Cancel pending request
      await supabase
        .from('network_connections')
        .delete()
        .eq('requester_id', user.id)
        .eq('receiver_id', profileId)
        .eq('status', 'pending');

      setProfile({ ...profile, networkStatus: 'none' });
    } else if (profile.networkStatus === 'networked') {
      // Remove from network
      await supabase
        .from('network_connections')
        .delete()
        .or(
          `and(requester_id.eq.${user.id},receiver_id.eq.${profileId}),and(requester_id.eq.${profileId},receiver_id.eq.${user.id})`
        );

      setProfile({
        ...profile,
        networkStatus: 'none',
        networkCount: Math.max(0, profile.networkCount - 1),
      });
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!profileId) return { error: new Error('No profile ID') };

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', profileId)
      .select()
      .single();

    if (!error && data) {
      setProfile(prev => prev ? { 
        ...prev, 
        ...data,
        social_links: parseSocialLinks(data.social_links)
      } : null);
    }

    return { data, error };
  };

  return { profile, loading, error, fetchProfile, handleNetworkAction, updateProfile };
}
