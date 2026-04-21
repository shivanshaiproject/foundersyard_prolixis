import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Key, Copy, Trash2, Plus, RefreshCw, Eye, EyeOff } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface ApiKey {
  id: string;
  key_prefix: string;
  name: string;
  is_active: boolean;
  rate_limit_per_minute: number;
  last_used_at: string | null;
  request_count: number;
  created_at: string;
}

// Hash function matching the edge function
async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Generate a secure random API key
function generateApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const prefix = 'fy_';
  let key = prefix;
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

const AdminAPIKeys = () => {
  const { user } = useAuth();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyRateLimit, setNewKeyRateLimit] = useState(100);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [showGeneratedKey, setShowGeneratedKey] = useState(true);

  const fetchApiKeys = async () => {
    try {
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApiKeys(data || []);
    } catch (error) {
      console.error('Error fetching API keys:', error);
      toast.error('Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) {
      toast.error('Please enter a name for the API key');
      return;
    }

    try {
      const rawKey = generateApiKey();
      const keyHash = await hashApiKey(rawKey);
      const keyPrefix = rawKey.substring(0, 7) + '...';

      const { error } = await supabase.from('api_keys').insert({
        key_hash: keyHash,
        key_prefix: keyPrefix,
        name: newKeyName.trim(),
        rate_limit_per_minute: newKeyRateLimit,
        created_by: user?.id,
      });

      if (error) throw error;

      setGeneratedKey(rawKey);
      setNewKeyName('');
      setNewKeyRateLimit(100);
      fetchApiKeys();
      toast.success('API key created successfully');
    } catch (error) {
      console.error('Error creating API key:', error);
      toast.error('Failed to create API key');
    }
  };

  const handleToggleActive = async (keyId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('api_keys')
        .update({ is_active: !isActive })
        .eq('id', keyId);

      if (error) throw error;

      setApiKeys(prev =>
        prev.map(key =>
          key.id === keyId ? { ...key, is_active: !isActive } : key
        )
      );
      toast.success(`API key ${!isActive ? 'activated' : 'deactivated'}`);
    } catch (error) {
      console.error('Error toggling API key:', error);
      toast.error('Failed to update API key');
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    try {
      const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('id', keyId);

      if (error) throw error;

      setApiKeys(prev => prev.filter(key => key.id !== keyId));
      toast.success('API key deleted');
    } catch (error) {
      console.error('Error deleting API key:', error);
      toast.error('Failed to delete API key');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleString();
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">API Keys</h1>
            <p className="text-muted-foreground">
              Manage API keys for the public metrics endpoint
            </p>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={(open) => {
            setCreateDialogOpen(open);
            if (!open) {
              setGeneratedKey(null);
              setNewKeyName('');
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create API Key
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {generatedKey ? 'API Key Created' : 'Create New API Key'}
                </DialogTitle>
                <DialogDescription>
                  {generatedKey
                    ? 'Copy this key now. You won\'t be able to see it again!'
                    : 'Create a new API key for accessing the public metrics endpoint.'}
                </DialogDescription>
              </DialogHeader>

              {generatedKey ? (
                <div className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-sm break-all">
                        {showGeneratedKey ? generatedKey : '•'.repeat(generatedKey.length)}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowGeneratedKey(!showGeneratedKey)}
                      >
                        {showGeneratedKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => copyToClipboard(generatedKey)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-destructive font-medium">
                    ⚠️ This key will only be shown once. Please save it securely.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="keyName">Key Name</Label>
                    <Input
                      id="keyName"
                      placeholder="e.g., Portfolio Dashboard"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rateLimit">Rate Limit (requests/minute)</Label>
                    <Input
                      id="rateLimit"
                      type="number"
                      min={1}
                      max={1000}
                      value={newKeyRateLimit}
                      onChange={(e) => setNewKeyRateLimit(parseInt(e.target.value) || 100)}
                    />
                  </div>
                </div>
              )}

              <DialogFooter>
                {generatedKey ? (
                  <Button onClick={() => {
                    setCreateDialogOpen(false);
                    setGeneratedKey(null);
                  }}>
                    Done
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateKey}>
                      Create Key
                    </Button>
                  </>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* API Endpoint Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">API Endpoint</CardTitle>
            <CardDescription>
              Use this endpoint to fetch public metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <code className="text-sm">
                  GET https://guscztdcyoxrekeppemc.supabase.co/functions/v1/get-public-metrics
                </code>
              </div>
              <div className="text-sm text-muted-foreground">
                <p className="font-medium mb-2">Headers:</p>
                <code className="block p-2 bg-muted rounded">X-API-Key: your_api_key_here</code>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* API Keys List */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Active Keys</CardTitle>
              <CardDescription>
                {apiKeys.length} API key(s) configured
              </CardDescription>
            </div>
            <Button variant="outline" size="icon" onClick={fetchApiKeys}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : apiKeys.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No API keys created yet. Create one to get started.
              </div>
            ) : (
              <div className="space-y-4">
                {apiKeys.map((key) => (
                  <div
                    key={key.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Key className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{key.name}</span>
                          <Badge variant={key.is_active ? 'default' : 'secondary'}>
                            {key.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <code>{key.key_prefix}</code> • {key.request_count} requests
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Last used: {formatDate(key.last_used_at)} • 
                          Rate limit: {key.rate_limit_per_minute}/min
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={key.is_active}
                        onCheckedChange={() => handleToggleActive(key.id, key.is_active)}
                      />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete API Key</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{key.name}"? This action cannot be undone.
                              Any applications using this key will stop working.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteKey(key.id)}
                              className="bg-destructive text-destructive-foreground"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Trigger Aggregation */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Manual Aggregation</CardTitle>
            <CardDescription>
              Trigger metrics aggregation manually (normally runs every 5 minutes)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  toast.info('Triggering aggregation...');
                  const response = await fetch(
                    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/aggregate-metrics`,
                    { method: 'POST' }
                  );
                  const result = await response.json();
                  if (result.success) {
                    toast.success('Metrics aggregated successfully');
                  } else {
                    throw new Error(result.error);
                  }
                } catch (error) {
                  console.error('Aggregation error:', error);
                  toast.error('Failed to aggregate metrics');
                }
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Run Aggregation Now
            </Button>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminAPIKeys;
