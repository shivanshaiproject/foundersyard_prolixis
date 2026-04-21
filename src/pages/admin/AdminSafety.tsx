import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { 
  Search, 
  ShieldAlert, 
  ShieldCheck, 
  RefreshCw, 
  Eye,
  AlertTriangle,
  Ban,
  Clock,
  Users
} from 'lucide-react';

interface RestrictedUser {
  user_id: string;
  trust_level: number;
  violation_count: number;
  last_violation_type: string | null;
  last_violation_at: string | null;
  bypass_attempts: number;
  shadow_ban_count: number;
  updated_at: string | null;
  profile: {
    full_name: string;
    username: string | null;
    avatar_url: string | null;
  } | null;
}

interface ModerationLog {
  id: string;
  user_id: string;
  action_taken: string;
  reason: string;
  content_type: string | null;
  created_at: string;
  profile?: {
    full_name: string;
    username: string | null;
  } | null;
}

interface AdminAction {
  id: string;
  created_at: string;
  admin_user_id: string;
  target_user_id: string;
  action_type: string;
  reason: string | null;
  previous_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  admin_profile?: {
    full_name: string;
    username: string | null;
  } | null;
  target_profile?: {
    full_name: string;
    username: string | null;
  } | null;
}

export default function AdminSafety() {
  const [restrictedUsers, setRestrictedUsers] = useState<RestrictedUser[]>([]);
  const [moderationLogs, setModerationLogs] = useState<ModerationLog[]>([]);
  const [adminActions, setAdminActions] = useState<AdminAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<RestrictedUser | null>(null);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [showTrustDialog, setShowTrustDialog] = useState(false);
  const [newTrustLevel, setNewTrustLevel] = useState(50);
  const [restoreReason, setRestoreReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch users with low trust (restricted)
      const { data: reputations, error: repError } = await supabase
        .from('user_reputation')
        .select('*')
        .lt('trust_level', 10)
        .order('trust_level', { ascending: true });

      if (repError) throw repError;

      // Fetch profiles for these users
      const userIds = reputations?.map(r => r.user_id) || [];
      let profilesMap: Record<string, RestrictedUser['profile']> = {};
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, username, avatar_url')
          .in('id', userIds);
        
        profiles?.forEach(p => {
          profilesMap[p.id] = {
            full_name: p.full_name,
            username: p.username,
            avatar_url: p.avatar_url
          };
        });
      }

      const usersWithProfiles: RestrictedUser[] = (reputations || []).map(r => ({
        user_id: r.user_id,
        trust_level: r.trust_level || 0,
        violation_count: r.violation_count || 0,
        last_violation_type: r.last_violation_type,
        last_violation_at: r.last_violation_at,
        bypass_attempts: r.bypass_attempts || 0,
        shadow_ban_count: r.shadow_ban_count || 0,
        updated_at: r.updated_at,
        profile: profilesMap[r.user_id] || null
      }));

      setRestrictedUsers(usersWithProfiles);

      // Fetch recent moderation logs
      const { data: logs } = await supabase
        .from('moderation_logs')
        .select('id, user_id, action_taken, reason, content_type, created_at')
        .order('created_at', { ascending: false })
        .limit(50);

      // Get profiles for log users
      const logUserIds = [...new Set(logs?.map(l => l.user_id).filter(Boolean) || [])];
      let logProfilesMap: Record<string, { full_name: string; username: string | null }> = {};
      
      if (logUserIds.length > 0) {
        const { data: logProfiles } = await supabase
          .from('profiles')
          .select('id, full_name, username')
          .in('id', logUserIds);
        
        logProfiles?.forEach(p => {
          logProfilesMap[p.id] = { full_name: p.full_name, username: p.username };
        });
      }

      const logsWithProfiles = (logs || []).map(l => ({
        ...l,
        profile: l.user_id ? logProfilesMap[l.user_id] : null
      }));

      setModerationLogs(logsWithProfiles);

      // Fetch admin actions audit log
      const { data: actions } = await supabase
        .from('admin_actions_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      // Get profiles for admin actions
      const actionUserIds = [...new Set([
        ...(actions?.map(a => a.admin_user_id) || []),
        ...(actions?.map(a => a.target_user_id) || [])
      ])];
      
      let actionProfilesMap: Record<string, { full_name: string; username: string | null }> = {};
      
      if (actionUserIds.length > 0) {
        const { data: actionProfiles } = await supabase
          .from('profiles')
          .select('id, full_name, username')
          .in('id', actionUserIds);
        
        actionProfiles?.forEach(p => {
          actionProfilesMap[p.id] = { full_name: p.full_name, username: p.username };
        });
      }

      const actionsWithProfiles = (actions || []).map(a => ({
        ...a,
        previous_value: a.previous_value as Record<string, unknown> | null,
        new_value: a.new_value as Record<string, unknown> | null,
        admin_profile: actionProfilesMap[a.admin_user_id],
        target_profile: actionProfilesMap[a.target_user_id]
      }));

      setAdminActions(actionsWithProfiles);
    } catch (err) {
      console.error('Error fetching safety data:', err);
      toast.error('Failed to load safety data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRestorePrivileges = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    
    try {
      const { data, error } = await supabase.rpc('admin_restore_posting_privileges', {
        p_target_user_id: selectedUser.user_id,
        p_new_trust_level: 50,
        p_reason: restoreReason || 'Admin restored posting privileges'
      });

      if (error) throw error;

      toast.success(`Restored posting privileges for ${selectedUser.profile?.full_name || 'user'}`);
      setShowRestoreDialog(false);
      setSelectedUser(null);
      setRestoreReason('');
      fetchData();
    } catch (err: any) {
      console.error('Error restoring privileges:', err);
      toast.error(err.message || 'Failed to restore privileges');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSetTrustLevel = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    
    try {
      const { data, error } = await supabase.rpc('admin_set_trust_level', {
        p_target_user_id: selectedUser.user_id,
        p_trust_level: newTrustLevel,
        p_reason: restoreReason || `Admin set trust level to ${newTrustLevel}`
      });

      if (error) throw error;

      toast.success(`Set trust level to ${newTrustLevel} for ${selectedUser.profile?.full_name || 'user'}`);
      setShowTrustDialog(false);
      setSelectedUser(null);
      setNewTrustLevel(50);
      setRestoreReason('');
      fetchData();
    } catch (err: any) {
      console.error('Error setting trust level:', err);
      toast.error(err.message || 'Failed to set trust level');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredUsers = restrictedUsers.filter(user => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.profile?.full_name?.toLowerCase().includes(query) ||
      user.profile?.username?.toLowerCase().includes(query) ||
      user.last_violation_type?.toLowerCase().includes(query)
    );
  });

  const getTrustBadge = (level: number) => {
    if (level < 10) {
      return <Badge variant="destructive" className="gap-1"><Ban className="w-3 h-3" /> Restricted ({level})</Badge>;
    }
    if (level < 30) {
      return <Badge variant="secondary" className="bg-orange-500/20 text-orange-600 gap-1"><AlertTriangle className="w-3 h-3" /> Low ({level})</Badge>;
    }
    return <Badge variant="secondary" className="bg-green-500/20 text-green-600 gap-1"><ShieldCheck className="w-3 h-3" /> Normal ({level})</Badge>;
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'block':
      case 'blocked':
        return <Badge variant="destructive">Blocked</Badge>;
      case 'shadow_ban':
      case 'political_shadow_ban':
        return <Badge variant="secondary" className="bg-orange-500/20 text-orange-600">Shadow Banned</Badge>;
      case 'flag_review':
        return <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-600">Flagged</Badge>;
      case 'allow':
        return <Badge variant="secondary" className="bg-green-500/20 text-green-600">Allowed</Badge>;
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-destructive" />
              Safety & Trust Management
            </h1>
            <p className="text-muted-foreground">
              Manage user restrictions, trust levels, and moderation events
            </p>
          </div>
          <Button onClick={fetchData} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Restricted Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{restrictedUsers.length}</div>
              <p className="text-xs text-muted-foreground">Trust level &lt; 10</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Recent Blocks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {moderationLogs.filter(l => l.action_taken === 'block' || l.action_taken === 'blocked').length}
              </div>
              <p className="text-xs text-muted-foreground">Last 50 events</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Shadow Bans</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">
                {moderationLogs.filter(l => l.action_taken?.includes('shadow_ban')).length}
              </div>
              <p className="text-xs text-muted-foreground">Last 50 events</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Admin Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{adminActions.length}</div>
              <p className="text-xs text-muted-foreground">Audit log entries</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="restricted" className="space-y-4">
          <TabsList>
            <TabsTrigger value="restricted" className="gap-2">
              <Ban className="w-4 h-4" />
              Restricted Users ({restrictedUsers.length})
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-2">
              <Clock className="w-4 h-4" />
              Moderation Logs
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-2">
              <Eye className="w-4 h-4" />
              Admin Audit Log
            </TabsTrigger>
          </TabsList>

          {/* Restricted Users Tab */}
          <TabsContent value="restricted" className="space-y-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, username, or violation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {filteredUsers.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <ShieldCheck className="w-12 h-12 mx-auto text-green-500 mb-4" />
                  <h3 className="font-semibold text-lg">No Restricted Users</h3>
                  <p className="text-muted-foreground">All users have healthy trust levels</p>
                </CardContent>
              </Card>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Trust Level</TableHead>
                      <TableHead>Violations</TableHead>
                      <TableHead>Last Violation</TableHead>
                      <TableHead>Updated</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.user_id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <UserAvatar
                              src={user.profile?.avatar_url}
                              name={user.profile?.full_name || 'Unknown'}
                              size="sm"
                            />
                            <div>
                              <p className="font-medium">{user.profile?.full_name || 'Unknown'}</p>
                              {user.profile?.username && (
                                <p className="text-sm text-muted-foreground">@{user.profile.username}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{getTrustBadge(user.trust_level)}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{user.violation_count} violations</p>
                            <p className="text-muted-foreground">{user.bypass_attempts} bypass attempts</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{user.last_violation_type || 'N/A'}</p>
                            {user.last_violation_at && (
                              <p className="text-muted-foreground">
                                {formatDistanceToNow(new Date(user.last_violation_at), { addSuffix: true })}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {user.updated_at ? (
                            <span className="text-sm text-muted-foreground">
                              {formatDistanceToNow(new Date(user.updated_at), { addSuffix: true })}
                            </span>
                          ) : 'N/A'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedUser(user);
                                setNewTrustLevel(user.trust_level);
                                setShowTrustDialog(true);
                              }}
                            >
                              Set Trust
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedUser(user);
                                setShowRestoreDialog(true);
                              }}
                            >
                              <ShieldCheck className="w-4 h-4 mr-1" />
                              Restore
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* Moderation Logs Tab */}
          <TabsContent value="logs">
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Content Type</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {moderationLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{log.profile?.full_name || 'Unknown'}</p>
                          {log.profile?.username && (
                            <p className="text-sm text-muted-foreground">@{log.profile.username}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getActionBadge(log.action_taken)}</TableCell>
                      <TableCell className="max-w-xs truncate">{log.reason}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.content_type || 'unknown'}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Admin Audit Log Tab */}
          <TabsContent value="audit">
            {adminActions.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Eye className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold text-lg">No Admin Actions Yet</h3>
                  <p className="text-muted-foreground">Actions you take will be logged here</p>
                </CardContent>
              </Card>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Admin</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Target User</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adminActions.map((action) => (
                      <TableRow key={action.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{action.admin_profile?.full_name || 'Unknown'}</p>
                            {action.admin_profile?.username && (
                              <p className="text-sm text-muted-foreground">@{action.admin_profile.username}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{action.action_type.replace(/_/g, ' ')}</Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{action.target_profile?.full_name || 'Unknown'}</p>
                            {action.target_profile?.username && (
                              <p className="text-sm text-muted-foreground">@{action.target_profile.username}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {action.previous_value?.trust_level !== undefined && (
                              <span>
                                {String(action.previous_value.trust_level)} → {String(action.new_value?.trust_level)}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{action.reason || '-'}</TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(action.created_at), { addSuffix: true })}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Restore Dialog */}
      <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore Posting Privileges</DialogTitle>
            <DialogDescription>
              This will set {selectedUser?.profile?.full_name}'s trust level to 50 and allow them to post again.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Current Trust Level</label>
              <p className="text-2xl font-bold text-destructive">{selectedUser?.trust_level}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Reason (optional)</label>
              <Input
                placeholder="Why are you restoring privileges?"
                value={restoreReason}
                onChange={(e) => setRestoreReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRestoreDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleRestorePrivileges} disabled={actionLoading}>
              {actionLoading ? 'Restoring...' : 'Restore Privileges'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Set Trust Level Dialog */}
      <Dialog open={showTrustDialog} onOpenChange={setShowTrustDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Trust Level</DialogTitle>
            <DialogDescription>
              Manually adjust {selectedUser?.profile?.full_name}'s trust level (0-100).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div>
              <label className="text-sm font-medium">Current Trust Level</label>
              <p className="text-xl font-bold">{selectedUser?.trust_level}</p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">New Trust Level</label>
                <span className="text-2xl font-bold">{newTrustLevel}</span>
              </div>
              <Slider
                value={[newTrustLevel]}
                onValueChange={(v) => setNewTrustLevel(v[0])}
                max={100}
                min={0}
                step={1}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0 (Blocked)</span>
                <span className="text-destructive">10 (Restriction threshold)</span>
                <span>50 (Normal)</span>
                <span>100 (Trusted)</span>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Reason (optional)</label>
              <Input
                placeholder="Why are you changing the trust level?"
                value={restoreReason}
                onChange={(e) => setRestoreReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTrustDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSetTrustLevel} disabled={actionLoading}>
              {actionLoading ? 'Saving...' : 'Set Trust Level'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
