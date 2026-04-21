import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface Ship {
  id: string;
  user_id: string;
  media_url: string;
  media_type: string;
  file_key: string | null;
  views_count: number;
  respects_count: number;
  expires_at: string;
  created_at: string;
}

export interface ShipWithAuthor extends Ship {
  author: {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
}

export interface ShipUser {
  userId: string;
  username: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  ships: ShipWithAuthor[];
}

export function useShips() {
  const { user } = useAuth();
  const [shipUsers, setShipUsers] = useState<ShipUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [myRespects, setMyRespects] = useState<Set<string>>(new Set());
  const [connectedIds, setConnectedIds] = useState<Set<string>>(new Set());

  // Fetch connected user IDs for sorting
  const fetchConnections = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('network_connections')
      .select('requester_id, receiver_id')
      .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .eq('status', 'connected');
    if (data) {
      const ids = new Set<string>();
      data.forEach(c => {
        if (c.requester_id === user.id) ids.add(c.receiver_id);
        else ids.add(c.requester_id);
      });
      setConnectedIds(ids);
    }
  }, [user?.id]);

  const fetchActiveShips = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('ships')
        .select(`*, author:profiles!ships_user_id_fkey(id, full_name, username, avatar_url)`)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      const userMap = new Map<string, ShipUser>();
      for (const ship of (data || [])) {
        const author = ship.author as any;
        if (!author) continue;
        if (!userMap.has(author.id)) {
          userMap.set(author.id, {
            userId: author.id,
            username: author.username,
            fullName: author.full_name,
            avatarUrl: author.avatar_url,
            ships: [],
          });
        }
        userMap.get(author.id)!.ships.push({ ...ship, author });
      }

      // Sort: current user first, then connected, then by recency
      const sorted = Array.from(userMap.values()).sort((a, b) => {
        if (user?.id === a.userId) return -1;
        if (user?.id === b.userId) return 1;
        const aConnected = connectedIds.has(a.userId);
        const bConnected = connectedIds.has(b.userId);
        if (aConnected && !bConnected) return -1;
        if (!aConnected && bConnected) return 1;
        return new Date(b.ships[0].created_at).getTime() - new Date(a.ships[0].created_at).getTime();
      });

      setShipUsers(sorted);
    } catch (err) {
      console.error('Error fetching ships:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, connectedIds]);

  const fetchMyRespects = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('ship_respects')
      .select('ship_id')
      .eq('user_id', user.id);
    if (data) {
      setMyRespects(new Set(data.map(r => r.ship_id)));
    }
  }, [user]);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  useEffect(() => {
    fetchActiveShips();
    fetchMyRespects();
  }, [fetchActiveShips, fetchMyRespects]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel('ships-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ships' }, () => {
        fetchActiveShips();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchActiveShips]);

  const createShip = useCallback(async (file: File) => {
    if (!user) { toast.error('Please sign in'); return false; }

    try {
      const { data: urlData, error: urlError } = await supabase.functions.invoke('generate-ship-presigned-url', {
        body: { fileName: file.name, fileType: file.type, fileSize: file.size }
      });

      if (urlError || !urlData?.uploadUrl) {
        throw new Error(urlData?.error || 'Failed to get upload URL');
      }

      const uploadRes = await fetch(urlData.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });

      if (!uploadRes.ok) throw new Error('Upload failed');

      const mediaType = file.type.startsWith('video/') ? 'video' : 'image';
      const { error: insertError } = await supabase.from('ships').insert({
        user_id: user.id,
        media_url: urlData.publicUrl,
        media_type: mediaType,
        file_key: urlData.fileKey,
      });

      if (insertError) throw insertError;

      toast.success('Ship posted!');
      await fetchActiveShips();
      return true;
    } catch (err: any) {
      console.error('Error creating ship:', err);
      toast.error(err.message || 'Failed to create ship');
      return false;
    }
  }, [user, fetchActiveShips]);

  const respectShip = useCallback(async (shipId: string) => {
    if (!user) { toast.error('Please sign in'); return; }

    const hasRespected = myRespects.has(shipId);

    if (hasRespected) {
      await supabase.from('ship_respects').delete().eq('ship_id', shipId).eq('user_id', user.id);
      setMyRespects(prev => { const s = new Set(prev); s.delete(shipId); return s; });
    } else {
      await supabase.from('ship_respects').insert({ ship_id: shipId, user_id: user.id });
      setMyRespects(prev => new Set(prev).add(shipId));
    }
    fetchActiveShips();
  }, [user, myRespects, fetchActiveShips]);

  const viewShip = useCallback(async (shipId: string) => {
    if (!user) return;
    try {
      await supabase.from('ship_views').upsert(
        { ship_id: shipId, viewer_id: user.id },
        { onConflict: 'ship_id,viewer_id' }
      );
    } catch {
      // non-critical
    }
  }, [user]);

  const deleteShip = useCallback(async (shipId: string) => {
    if (!user) return;
    await supabase.from('ships').delete().eq('id', shipId).eq('user_id', user.id);
    await fetchActiveShips();
    toast.success('Ship deleted');
  }, [user, fetchActiveShips]);

  const getUserShipCount = useCallback((userId: string) => {
    const u = shipUsers.find(s => s.userId === userId);
    return u?.ships.length || 0;
  }, [shipUsers]);

  return {
    shipUsers,
    loading,
    createShip,
    respectShip,
    viewShip,
    deleteShip,
    myRespects,
    getUserShipCount,
  };
}

export function useUserShipLog(userId?: string) {
  const [ships, setShips] = useState<Ship[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }

    const fetchShips = async () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from('ships')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', sevenDaysAgo)
        .order('created_at', { ascending: false })
        .limit(10);

      setShips((data as Ship[]) || []);
      setLoading(false);
    };

    fetchShips();
  }, [userId]);

  return { ships, loading };
}
