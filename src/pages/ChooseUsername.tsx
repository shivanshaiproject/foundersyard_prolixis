import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, X, Loader2, AtSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

export default function ChooseUsername() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [username, setUsername] = useState('');
  const [status, setStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // If user already has a username, continue the right flow
  useEffect(() => {
    if (profile?.username && profile.username.length >= 3) {
      if ((profile as any).has_onboarded) {
        navigate('/feed', { replace: true });
      } else {
        navigate('/welcome', { replace: true });
      }
    }
  }, [profile, navigate]);

  const checkUsername = useCallback(async (uname: string) => {
    if (!uname || uname.length < 3) {
      setStatus('invalid');
      setError('Username must be at least 3 characters');
      return;
    }
    if (!/^[a-z0-9_]+$/.test(uname)) {
      setStatus('invalid');
      setError('Only lowercase letters, numbers, and underscores');
      return;
    }
    if (uname.length > 20) {
      setStatus('invalid');
      setError('Username must be 20 characters or less');
      return;
    }
    setStatus('checking');
    setError('');
    const { data } = await supabase.from('profiles').select('username').eq('username', uname).maybeSingle();
    if (data) {
      setStatus('taken');
      setError('This username is already taken');
    } else {
      setStatus('available');
      setError('');
    }
  }, []);

  useEffect(() => {
    if (!username) { setStatus('idle'); return; }
    const timer = setTimeout(() => checkUsername(username), 500);
    return () => clearTimeout(timer);
  }, [username, checkUsername]);

  const handleChange = (value: string) => {
    setUsername(value.toLowerCase().replace(/\s/g, '').replace(/[^a-z0-9_]/g, ''));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status !== 'available' || !user) return;
    setLoading(true);
    try {
      const { error: err } = await supabase.from('profiles').update({ username }).eq('id', user.id);
      if (err) throw err;
      await refreshProfile();
      toast({ title: 'Username set!' });
      navigate('/welcome', { replace: true });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full bg-primary/5 blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm relative z-10"
      >
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-2xl bg-muted/80 flex items-center justify-center mx-auto mb-6 shadow-lg">
            <AtSign className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Choose Your Username</h1>
          <p className="text-muted-foreground text-sm">This is how other founders will find you.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-base font-medium">@</div>
            <Input
              type="text"
              value={username}
              onChange={(e) => handleChange(e.target.value)}
              placeholder="your_username"
              className="h-14 rounded-2xl border-0 bg-muted/50 text-base pl-9 pr-12 focus-visible:ring-1 focus-visible:ring-primary/50"
              autoFocus
              maxLength={20}
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              {status === 'checking' && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
              {status === 'available' && <Check className="w-4 h-4 text-emerald-400" />}
              {(status === 'taken' || status === 'invalid') && <X className="w-4 h-4 text-destructive" />}
            </div>
          </div>
          {error && <p className="text-xs text-destructive -mt-4">{error}</p>}
          {status === 'available' && <p className="text-xs text-emerald-400 -mt-4">Username is available!</p>}

          <div className="p-[1.5px] rounded-2xl bg-gradient-to-r from-pink-500 via-red-500 to-orange-500">
            <Button
              type="submit"
              disabled={status !== 'available' || loading}
              className={cn(
                "w-full h-14 rounded-[calc(1rem-1.5px)] text-base font-semibold",
                "bg-background hover:bg-muted text-foreground",
                "disabled:opacity-50"
              )}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Continue'}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
