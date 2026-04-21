import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface NetworkConnection {
  id: string;
  requester_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  accepted_at: string | null;
  profile?: {
    id: string;
    full_name: string;
    username: string | null;
    avatar_url: string | null;
    bio: string | null;
  };
}

type NetworkStatus = 'none' | 'pending' | 'requested' | 'networked';

export function useNetwork(profileId?: string) {
  const { user } = useAuth();
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>('none');
  const [networkCount, setNetworkCount] = useState(0);
  const [mutualConnections, setMutualConnections] = useState<NetworkConnection['profile'][]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNetworkStatus = useCallback(async () => {
    if (!profileId) {
      setLoading(false);
      return;
    }

    try {
      // Get network count (accepted connections)
      const { count } = await supabase
        .from('network_connections')
        .select('*', { count: 'exact', head: true })
        .or(`requester_id.eq.${profileId},receiver_id.eq.${profileId}`)
        .eq('status', 'accepted');

      setNetworkCount(count || 0);

      // Check connection status with current user
      if (user && user.id !== profileId) {
        const { data: connectionData } = await supabase
          .from('network_connections')
          .select('*')
          .or(
            `and(requester_id.eq.${user.id},receiver_id.eq.${profileId}),and(requester_id.eq.${profileId},receiver_id.eq.${user.id})`
          )
          .maybeSingle();

        if (connectionData) {
          if (connectionData.status === 'accepted') {
            setNetworkStatus('networked');
          } else if (connectionData.status === 'pending') {
            // Check who sent the request
            if (connectionData.requester_id === user.id) {
              setNetworkStatus('requested'); // Current user sent the request
            } else {
              setNetworkStatus('pending'); // Other user sent the request (waiting for current user to accept)
            }
          }
        } else {
          setNetworkStatus('none');
        }

        // Get mutual connections
        await fetchMutualConnections();
      }
    } catch (err) {
      console.error('Error fetching network status:', err);
    } finally {
      setLoading(false);
    }
  }, [profileId, user]);

  const fetchMutualConnections = async () => {
    if (!user || !profileId || user.id === profileId) return;

    try {
      // Get current user's network
      const { data: myConnections } = await supabase
        .from('network_connections')
        .select('requester_id, receiver_id')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`);

      // Get target user's network
      const { data: theirConnections } = await supabase
        .from('network_connections')
        .select('requester_id, receiver_id')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${profileId},receiver_id.eq.${profileId}`);

      if (!myConnections || !theirConnections) return;

      // Extract IDs from connections
      const myNetworkIds = new Set(
        myConnections.flatMap(c => 
          c.requester_id === user.id ? [c.receiver_id] : [c.requester_id]
        )
      );

      const theirNetworkIds = theirConnections.flatMap(c =>
        c.requester_id === profileId ? [c.receiver_id] : [c.requester_id]
      );

      // Find mutual connections
      const mutualIds = theirNetworkIds.filter(id => myNetworkIds.has(id));

      if (mutualIds.length > 0) {
        const { data: mutualProfiles } = await supabase
          .from('profiles')
          .select('id, full_name, username, avatar_url, bio')
          .in('id', mutualIds.slice(0, 5)); // Limit to 5

        setMutualConnections(mutualProfiles || []);
      }
    } catch (err) {
      console.error('Error fetching mutual connections:', err);
    }
  };

  useEffect(() => {
    fetchNetworkStatus();
  }, [fetchNetworkStatus]);

  const sendNetworkRequest = async () => {
    if (!user || !profileId || user.id === profileId) return;

    const { error } = await supabase.from('network_connections').insert({
      requester_id: user.id,
      receiver_id: profileId,
      status: 'pending',
    });

    if (!error) {
      setNetworkStatus('requested');

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

    return { error };
  };

  const acceptNetworkRequest = async (connectionId: string, requesterId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('network_connections')
      .update({ status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('id', connectionId);

    if (!error) {
      setNetworkStatus('networked');
      setNetworkCount(prev => prev + 1);

      // Create notification for requester
      const { data: requesterProfile } = await supabase
        .from('profiles')
        .select('notifications_enabled')
        .eq('id', requesterId)
        .single();

      if (requesterProfile?.notifications_enabled) {
        await supabase.from('notifications').insert({
          user_id: requesterId,
          actor_id: user.id,
          type: 'network_accepted',
        });
      }
    }

    return { error };
  };

  const removeFromNetwork = async () => {
    if (!user || !profileId) return;

    const { error } = await supabase
      .from('network_connections')
      .delete()
      .or(
        `and(requester_id.eq.${user.id},receiver_id.eq.${profileId}),and(requester_id.eq.${profileId},receiver_id.eq.${user.id})`
      );

    if (!error) {
      setNetworkStatus('none');
      setNetworkCount(prev => Math.max(0, prev - 1));
    }

    return { error };
  };

  const cancelRequest = async () => {
    if (!user || !profileId) return;

    const { error } = await supabase
      .from('network_connections')
      .delete()
      .eq('requester_id', user.id)
      .eq('receiver_id', profileId)
      .eq('status', 'pending');

    if (!error) {
      setNetworkStatus('none');
    }

    return { error };
  };

  return {
    networkStatus,
    networkCount,
    mutualConnections,
    loading,
    fetchNetworkStatus,
    sendNetworkRequest,
    acceptNetworkRequest,
    removeFromNetwork,
    cancelRequest,
  };
}

export function useNetworkList() {
  const { user } = useAuth();
  const [connections, setConnections] = useState<NetworkConnection[]>([]);
  const [pendingRequests, setPendingRequests] = useState<NetworkConnection[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConnections = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Fetch accepted connections
      const { data: acceptedData } = await supabase
        .from('network_connections')
        .select('*')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`);

      if (acceptedData) {
        // Get profile data for each connection
        const profileIds = acceptedData.map(c =>
          c.requester_id === user.id ? c.receiver_id : c.requester_id
        );

        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, username, avatar_url, bio')
          .in('id', profileIds);

        const connectionsWithProfiles = acceptedData.map(c => ({
          ...c,
          status: c.status as 'pending' | 'accepted' | 'rejected',
          profile: profiles?.find(p =>
            p.id === (c.requester_id === user.id ? c.receiver_id : c.requester_id)
          ),
        }));

        setConnections(connectionsWithProfiles);
      }

      // Fetch pending requests (where user is the receiver)
      const { data: pendingData } = await supabase
        .from('network_connections')
        .select('*')
        .eq('status', 'pending')
        .eq('receiver_id', user.id);

      if (pendingData) {
        const requesterIds = pendingData.map(c => c.requester_id);

        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, username, avatar_url, bio')
          .in('id', requesterIds);

        const requestsWithProfiles = pendingData.map(c => ({
          ...c,
          status: c.status as 'pending' | 'accepted' | 'rejected',
          profile: profiles?.find(p => p.id === c.requester_id),
        }));

        setPendingRequests(requestsWithProfiles);
      }
    } catch (err) {
      console.error('Error fetching network:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  return {
    connections,
    pendingRequests,
    loading,
    fetchConnections,
  };
}
