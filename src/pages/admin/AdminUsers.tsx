import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { VerifiedBadge } from '@/components/shared/VerifiedBadge';
import { VIPBadge } from '@/components/shared/VIPBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Search, 
  MoreHorizontal, 
  BadgeCheck, 
  Crown, 
  AlertTriangle,
  Ban,
  Eye,
  UserX,
  UserCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface UserWithStrikes {
  id: string;
  full_name: string;
  username: string | null;
  avatar_url: string | null;
  is_verified: boolean | null;
  is_vip: boolean | null;
  created_at: string;
  strike_count: number;
  suspended_until: string | null;
  is_permanent_ban: boolean;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<UserWithStrikes[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url, is_verified, is_vip, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to fetch users');
      setLoading(false);
      return;
    }

    // Fetch strikes for all users
    const { data: strikes } = await supabase
      .from('user_strikes')
      .select('user_id, strike_count, suspended_until, is_permanent_ban');

    const strikesMap = new Map(strikes?.map(s => [s.user_id, s]) || []);

    const usersWithStrikes: UserWithStrikes[] = (profiles || []).map(profile => ({
      ...profile,
      strike_count: strikesMap.get(profile.id)?.strike_count || 0,
      suspended_until: strikesMap.get(profile.id)?.suspended_until || null,
      is_permanent_ban: strikesMap.get(profile.id)?.is_permanent_ban || false,
    }));

    setUsers(usersWithStrikes);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const toggleVerified = async (userId: string, currentStatus: boolean | null) => {
    const { error } = await supabase
      .from('profiles')
      .update({ is_verified: !currentStatus })
      .eq('id', userId);

    if (error) {
      toast.error('Failed to update verification status');
    } else {
      toast.success(`User ${!currentStatus ? 'verified' : 'unverified'}`);
      fetchUsers();
    }
  };

  const toggleVIP = async (userId: string, currentStatus: boolean | null) => {
    const { error } = await supabase
      .from('profiles')
      .update({ is_vip: !currentStatus })
      .eq('id', userId);

    if (error) {
      toast.error('Failed to update VIP status');
    } else {
      toast.success(`VIP status ${!currentStatus ? 'granted' : 'removed'}`);
      fetchUsers();
    }
  };

  const toggleSuspension = async (userId: string, isSuspended: boolean) => {
    if (isSuspended) {
      // Lift suspension
      const { error } = await supabase
        .from('user_strikes')
        .update({ suspended_until: null, is_permanent_ban: false })
        .eq('user_id', userId);

      if (error) {
        toast.error('Failed to lift suspension');
      } else {
        toast.success('Suspension lifted');
        fetchUsers();
      }
    } else {
      // Suspend for 7 days
      const suspendUntil = new Date();
      suspendUntil.setDate(suspendUntil.getDate() + 7);

      const { error } = await supabase
        .from('user_strikes')
        .upsert({ 
          user_id: userId, 
          suspended_until: suspendUntil.toISOString(),
          strike_count: 1
        });

      if (error) {
        toast.error('Failed to suspend user');
      } else {
        toast.success('User suspended for 7 days');
        fetchUsers();
      }
    }
  };

  const permanentBan = async (userId: string) => {
    const { error } = await supabase
      .from('user_strikes')
      .upsert({ 
        user_id: userId, 
        is_permanent_ban: true,
        strike_count: 3
      });

    if (error) {
      toast.error('Failed to ban user');
    } else {
      toast.success('User permanently banned');
      fetchUsers();
    }
  };

  const filteredUsers = users.filter(user => 
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (user: UserWithStrikes) => {
    if (user.is_permanent_ban) {
      return <Badge variant="destructive">Banned</Badge>;
    }
    if (user.suspended_until && new Date(user.suspended_until) > new Date()) {
      return <Badge variant="destructive" className="bg-orange-500">Suspended</Badge>;
    }
    if (user.strike_count > 0) {
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">{user.strike_count} Strike(s)</Badge>;
    }
    return <Badge variant="secondary" className="bg-green-100 text-green-700">Good Standing</Badge>;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">User Management</h1>
            <p className="text-muted-foreground mt-1">Manage users, badges, and account status</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Badges</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-[60px]">Actions</TableHead>
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
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          src={user.avatar_url}
                          name={user.full_name}
                          size="md"
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium">{user.full_name}</span>
                            {user.is_verified && <VerifiedBadge size="sm" />}
                            {user.is_vip && <VIPBadge />}
                          </div>
                          <span className="text-sm text-muted-foreground">
                            @{user.username || user.full_name?.toLowerCase().replace(/[^a-z0-9]/g, '') || `user_${user.id.slice(0, 6)}`}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {user.is_verified && (
                          <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                            <BadgeCheck className="w-3 h-3 mr-1" />
                            Verified
                          </Badge>
                        )}
                        {user.is_vip && (
                          <Badge variant="secondary" className="bg-gradient-to-r from-purple-100 to-amber-100 text-purple-700">
                            <Crown className="w-3 h-3 mr-1" />
                            VIP
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(user)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(user.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => window.open(`/profile/${user.id}`, '_blank')}>
                            <Eye className="w-4 h-4 mr-2" />
                            View Profile
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => toggleVerified(user.id, user.is_verified)}>
                            <BadgeCheck className="w-4 h-4 mr-2" />
                            {user.is_verified ? 'Remove Verified' : 'Grant Verified'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleVIP(user.id, user.is_vip)}>
                            <Crown className="w-4 h-4 mr-2" />
                            {user.is_vip ? 'Remove VIP' : 'Grant VIP'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => window.location.href = `/admin/strikes?user=${user.id}`}>
                            <AlertTriangle className="w-4 h-4 mr-2" />
                            Manage Strikes
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => toggleSuspension(user.id, !!(user.suspended_until || user.is_permanent_ban))}
                          >
                            {user.suspended_until || user.is_permanent_ban ? (
                              <>
                                <UserCheck className="w-4 h-4 mr-2" />
                                Lift Suspension
                              </>
                            ) : (
                              <>
                                <UserX className="w-4 h-4 mr-2" />
                                Suspend (7 days)
                              </>
                            )}
                          </DropdownMenuItem>
                          {!user.is_permanent_ban && (
                            <DropdownMenuItem 
                              onClick={() => permanentBan(user.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Ban className="w-4 h-4 mr-2" />
                              Permanent Ban
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
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
