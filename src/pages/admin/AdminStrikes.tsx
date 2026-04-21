import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  AlertTriangle,
  Search,
  Minus,
  Plus,
  UserCheck,
  Ban,
  History
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface UserStrike {
  user_id: string;
  strike_count: number;
  last_strike_date: string | null;
  last_strike_reason: string | null;
  suspended_until: string | null;
  is_permanent_ban: boolean;
  profiles: {
    full_name: string;
    username: string | null;
    avatar_url: string | null;
  };
}

interface StrikeHistoryItem {
  id: string;
  strike_number: number;
  reason: string;
  issued_by: string;
  issued_at: string;
}

export default function AdminStrikes() {
  const [searchParams] = useSearchParams();
  const [strikes, setStrikes] = useState<UserStrike[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('user') || '');
  const [selectedUser, setSelectedUser] = useState<UserStrike | null>(null);
  const [strikeHistory, setStrikeHistory] = useState<StrikeHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchStrikes = async () => {
    setLoading(true);
    
    // Fetch user strikes first
    const { data: strikesData, error } = await supabase
      .from('user_strikes')
      .select('user_id, strike_count, last_strike_date, last_strike_reason, suspended_until, is_permanent_ban')
      .order('strike_count', { ascending: false });

    if (error) {
      toast.error('Failed to fetch strikes');
      setLoading(false);
      return;
    }

    // Fetch profile details for each strike
    const strikesWithProfiles = await Promise.all((strikesData || []).map(async (strike: any) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, username, avatar_url')
        .eq('id', strike.user_id)
        .maybeSingle();

      return {
        ...strike,
        profiles: profile || { full_name: 'Unknown', username: null, avatar_url: null }
      };
    }));

    setStrikes(strikesWithProfiles as UserStrike[]);
    setLoading(false);
  };

  const fetchStrikeHistory = async (userId: string) => {
    setHistoryLoading(true);
    const { data, error } = await supabase
      .from('strike_history')
      .select('*')
      .eq('user_id', userId)
      .order('issued_at', { ascending: false });

    if (!error) {
      setStrikeHistory(data || []);
    }
    setHistoryLoading(false);
  };

  useEffect(() => {
    fetchStrikes();
  }, []);

  const addStrike = async (userId: string, currentCount: number) => {
    const newCount = currentCount + 1;
    let suspendedUntil = null;
    let isPermanentBan = false;

    if (newCount === 2) {
      suspendedUntil = new Date();
      suspendedUntil.setDate(suspendedUntil.getDate() + 7);
    } else if (newCount >= 3) {
      isPermanentBan = true;
    }

    const { error } = await supabase
      .from('user_strikes')
      .update({
        strike_count: newCount,
        last_strike_date: new Date().toISOString(),
        last_strike_reason: 'Admin manual strike',
        suspended_until: suspendedUntil?.toISOString() || null,
        is_permanent_ban: isPermanentBan,
      })
      .eq('user_id', userId);

    if (error) {
      toast.error('Failed to add strike');
      return;
    }

    await supabase
      .from('strike_history')
      .insert({
        user_id: userId,
        strike_number: newCount,
        reason: 'Admin manual strike',
        issued_by: 'admin',
      });

    toast.success(`Strike added (${newCount}/3)`);
    fetchStrikes();
  };

  const removeStrike = async (userId: string, currentCount: number) => {
    if (currentCount <= 0) return;

    const newCount = currentCount - 1;

    const { error } = await supabase
      .from('user_strikes')
      .update({
        strike_count: newCount,
        suspended_until: null,
        is_permanent_ban: false,
      })
      .eq('user_id', userId);

    if (error) {
      toast.error('Failed to remove strike');
    } else {
      toast.success(`Strike removed (${newCount}/3)`);
      fetchStrikes();
    }
  };

  const liftSuspension = async (userId: string) => {
    const { error } = await supabase
      .from('user_strikes')
      .update({
        suspended_until: null,
        is_permanent_ban: false,
      })
      .eq('user_id', userId);

    if (error) {
      toast.error('Failed to lift suspension');
    } else {
      toast.success('Suspension lifted');
      fetchStrikes();
    }
  };

  const permanentBan = async (userId: string) => {
    const { error } = await supabase
      .from('user_strikes')
      .update({
        is_permanent_ban: true,
        strike_count: 3,
      })
      .eq('user_id', userId);

    if (error) {
      toast.error('Failed to ban user');
    } else {
      toast.success('User permanently banned');
      fetchStrikes();
    }
  };

  const clearAllStrikes = async (userId: string) => {
    const { error } = await supabase
      .from('user_strikes')
      .delete()
      .eq('user_id', userId);

    if (error) {
      toast.error('Failed to clear strikes');
    } else {
      toast.success('All strikes cleared');
      fetchStrikes();
    }
  };

  const filteredStrikes = strikes.filter(strike => 
    strike.profiles.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    strike.profiles.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    strike.user_id.includes(searchQuery)
  );

  const getStatusBadge = (strike: UserStrike) => {
    if (strike.is_permanent_ban) {
      return <Badge variant="destructive">Permanently Banned</Badge>;
    }
    if (strike.suspended_until && new Date(strike.suspended_until) > new Date()) {
      return <Badge variant="destructive" className="bg-orange-500">Suspended until {format(new Date(strike.suspended_until), 'MMM d')}</Badge>;
    }
    return <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">{strike.strike_count} Strike(s)</Badge>;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Strike Management</h1>
            <p className="text-muted-foreground mt-1">Manage user strikes and suspensions</p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Strikes</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Strike</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5}>
                      <div className="h-12 bg-muted rounded animate-pulse" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredStrikes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    {searchQuery ? 'No users found matching your search' : 'No users with strikes'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredStrikes.map((strike) => (
                  <TableRow key={strike.user_id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          src={strike.profiles.avatar_url}
                          name={strike.profiles.full_name}
                          size="sm"
                        />
                        <div>
                          <p className="font-medium">{strike.profiles.full_name}</p>
                          <p className="text-xs text-muted-foreground">@{strike.profiles.username || 'unknown'}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3].map((num) => (
                          <div
                            key={num}
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              num <= strike.strike_count
                                ? 'bg-destructive text-destructive-foreground'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {num}
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(strike)}</TableCell>
                    <TableCell>
                      {strike.last_strike_date ? (
                        <div>
                          <p className="text-sm">{format(new Date(strike.last_strike_date), 'MMM d, yyyy')}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[150px]">{strike.last_strike_reason}</p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8"
                          onClick={() => removeStrike(strike.user_id, strike.strike_count)}
                          disabled={strike.strike_count <= 0}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8"
                          onClick={() => addStrike(strike.user_id, strike.strike_count)}
                          disabled={strike.strike_count >= 3}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                        
                        {(strike.suspended_until || strike.is_permanent_ban) && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => liftSuspension(strike.user_id)}
                          >
                            <UserCheck className="w-4 h-4 mr-1" />
                            Lift
                          </Button>
                        )}
                        
                        {!strike.is_permanent_ban && (
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => permanentBan(strike.user_id)}
                          >
                            <Ban className="w-4 h-4 mr-1" />
                            Ban
                          </Button>
                        )}

                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-8 w-8"
                              onClick={() => {
                                setSelectedUser(strike);
                                fetchStrikeHistory(strike.user_id);
                              }}
                            >
                              <History className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Strike History - {selectedUser?.profiles.full_name}</DialogTitle>
                              <DialogDescription>Complete history of strikes for this user</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-3 max-h-[400px] overflow-y-auto">
                              {historyLoading ? (
                                <div className="text-center py-4">Loading...</div>
                              ) : strikeHistory.length === 0 ? (
                                <div className="text-center py-4 text-muted-foreground">No strike history</div>
                              ) : (
                                strikeHistory.map((item) => (
                                  <div key={item.id} className="p-3 bg-muted/50 rounded-lg">
                                    <div className="flex items-center justify-between mb-1">
                                      <Badge variant="outline">Strike #{item.strike_number}</Badge>
                                      <span className="text-xs text-muted-foreground">
                                        {format(new Date(item.issued_at), 'MMM d, yyyy HH:mm')}
                                      </span>
                                    </div>
                                    <p className="text-sm">{item.reason}</p>
                                    <p className="text-xs text-muted-foreground mt-1">By: {item.issued_by}</p>
                                  </div>
                                ))
                              )}
                            </div>
                            <div className="pt-4 border-t">
                              <Button 
                                variant="outline" 
                                className="w-full"
                                onClick={() => {
                                  if (selectedUser) clearAllStrikes(selectedUser.user_id);
                                }}
                              >
                                Clear All Strikes
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AdminLayout>
  );
}
