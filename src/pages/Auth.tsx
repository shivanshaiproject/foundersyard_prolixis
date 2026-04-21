import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Eye, EyeOff, Check, X, Loader2, Mail, KeyRound, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { cn } from '@/lib/utils';
import { validateEmail, checkPasswordResetRateLimit, recordPasswordResetRequest } from '@/lib/emailValidation';
import { stripHtml } from '@/lib/sanitize';

type ResetStep = 'email' | 'sent' | 'newPassword' | 'success';

const maskEmail = (email: string) => {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local[0]}***@${domain}`;
};

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

export default function AuthPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [isLogin, setIsLogin] = useState(searchParams.get('mode') !== 'signup');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const [resetStep, setResetStep] = useState<ResetStep>('email');
  const [resetEmail, setResetEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [formData, setFormData] = useState({
    email: searchParams.get('email') || '',
    password: '',
    firstName: '',
    lastName: '',
    username: '',
  });

  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [usernameError, setUsernameError] = useState('');

  // Handle OAuth error hashes (e.g. #error=server_error&error_description=...)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('error=')) {
      const hashParams = new URLSearchParams(hash.substring(1));
      const rawDescription = hashParams.get('error_description');
      const decodedDescription = rawDescription ? decodeURIComponent(rawDescription.replace(/\+/g, ' ')) : '';
      const description = decodedDescription.includes('failed to sign in with vendor')
        ? 'Google sign-in is not configured correctly for this live domain yet. I fixed the app flow, but the Google provider settings for the published domain still need to be updated.'
        : decodedDescription || 'Please try again.';

      toast({
        title: 'Google sign-in failed',
        description,
        variant: 'destructive',
      });

      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, [toast]);

  useEffect(() => {
    const redirectAfterAuth = async (userId: string) => {
      const { data: prof } = await supabase
        .from('profiles')
        .select('username, has_onboarded')
        .eq('id', userId)
        .maybeSingle();

      if (!prof?.username || prof.username.trim() === '') {
        navigate('/choose-username', { replace: true });
      } else if (!prof.has_onboarded) {
        navigate('/welcome', { replace: true });
      } else {
        navigate('/feed', { replace: true });
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setForgotPasswordMode(true);
        setResetStep('newPassword');
        return;
      }
      if (session?.user && !forgotPasswordMode) {
        redirectAfterAuth(session.user.id);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user && !forgotPasswordMode) {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        if (hashParams.get('type') === 'recovery') {
          setForgotPasswordMode(true);
          setResetStep('newPassword');
          return;
        }
        redirectAfterAuth(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, forgotPasswordMode, toast]);

  const checkUsername = useCallback(async (username: string) => {
    if (!username || username.length < 3) {
      setUsernameStatus('invalid');
      setUsernameError('Username must be at least 3 characters');
      return;
    }
    const usernameRegex = /^[a-z0-9_]+$/;
    if (!usernameRegex.test(username)) {
      setUsernameStatus('invalid');
      setUsernameError('Only lowercase letters, numbers, and underscores');
      return;
    }
    if (username.length > 20) {
      setUsernameStatus('invalid');
      setUsernameError('Username must be 20 characters or less');
      return;
    }
    setUsernameStatus('checking');
    setUsernameError('');
    const { data, error } = await supabase.from('profiles').select('username').eq('username', username).maybeSingle();
    if (error) { setUsernameStatus('idle'); return; }
    if (data) { setUsernameStatus('taken'); setUsernameError('This username is already taken'); }
    else { setUsernameStatus('available'); setUsernameError(''); }
  }, []);

  useEffect(() => {
    if (isLogin || !formData.username) { setUsernameStatus('idle'); return; }
    const timer = setTimeout(() => { checkUsername(formData.username); }, 500);
    return () => clearTimeout(timer);
  }, [formData.username, isLogin, checkUsername]);

  const handleUsernameChange = (value: string) => {
    const sanitized = value.toLowerCase().replace(/\s/g, '').replace(/[^a-z0-9_]/g, '');
    setFormData({ ...formData, username: sanitized });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLogin) {
      const emailValidation = validateEmail(formData.email);
      if (!emailValidation.valid) { toast({ title: emailValidation.error || 'Invalid email', variant: 'destructive' }); return; }
    }
    if (!isLogin && usernameStatus !== 'available') { toast({ title: 'Please choose a valid username', variant: 'destructive' }); return; }
    if (!isLogin && !agreeToTerms) { toast({ title: 'Please agree to the Terms & Conditions', variant: 'destructive' }); return; }
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email: formData.email.trim().toLowerCase(), password: formData.password });
        if (error) throw error;
        toast({ title: 'Welcome back!' });
      } else {
        const sanitizedFirstName = stripHtml(formData.firstName).slice(0, 50);
        const sanitizedLastName = stripHtml(formData.lastName).slice(0, 50);
        const fullName = `${sanitizedFirstName} ${sanitizedLastName}`.trim();
        const { data: authData, error } = await supabase.auth.signUp({
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
          options: {
            emailRedirectTo: `${window.location.origin}/feed`,
            data: { full_name: fullName, username: formData.username },
          },
        });
        if (error) throw error;
        if (authData.user) {
          await supabase.from('profiles').update({ username: formData.username }).eq('id', authData.user.id);
        }
        toast({ title: 'Check your email!', description: 'We sent you a verification link to confirm your account.' });
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) { toast({ title: 'Please enter your email', variant: 'destructive' }); return; }
    const rateLimit = checkPasswordResetRateLimit();
    if (!rateLimit.allowed) { toast({ title: 'Please wait', description: `You can request another reset in ${rateLimit.remainingMinutes} minutes.`, variant: 'destructive' }); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim().toLowerCase(), { redirectTo: `${window.location.origin}/reset-password` });
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); }
    else { recordPasswordResetRequest(); setResetStep('sent'); toast({ title: 'Email sent!', description: 'Check your inbox for the reset link.' }); }
    setLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) { toast({ title: 'Passwords do not match', variant: 'destructive' }); return; }
    if (newPassword.length < 6) { toast({ title: 'Password must be at least 6 characters', variant: 'destructive' }); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); }
    else { setResetStep('success'); toast({ title: 'Password updated!', description: 'You can now login with your new password.' }); }
    setLoading(false);
  };

  const exitForgotPassword = () => {
    setForgotPasswordMode(false); setResetStep('email'); setResetEmail(''); setNewPassword(''); setConfirmPassword('');
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/auth`,
        extraParams: {
          prompt: 'select_account',
        },
      });
      if (result.error) {
        toast({
          title: 'Google sign-in failed',
          description: 'Please try again. If this keeps happening on the live domain, the Google provider settings need to be updated.',
          variant: 'destructive',
        });
      }
      if (result.redirected) return;
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setFormData({ ...formData, username: '', firstName: '', lastName: '' });
    setUsernameStatus('idle'); setUsernameError(''); setAgreeToTerms(false);
  };

  const inputClass = "h-14 rounded-2xl border border-border bg-muted/50 text-base text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:bg-muted/70 transition-colors";

  // --- Forgot password content ---
  const renderForgotPasswordContent = () => {
    switch (resetStep) {
      case 'email':
        return (
          <motion.form key="reset-email" onSubmit={handleSendResetEmail} className="space-y-5"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
            <div className="text-center mb-2">
              <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
                <KeyRound className="w-8 h-8 text-muted-foreground" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">Reset Password</h1>
              <p className="text-muted-foreground text-sm">Enter your email and we'll send you a reset link.</p>
            </div>
            <div>
              <Label htmlFor="resetEmail" className="text-xs font-medium text-muted-foreground mb-2 block uppercase tracking-wider">Email</Label>
              <Input id="resetEmail" type="email" placeholder="you@company.com" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} className={inputClass} required />
            </div>
            <GradientButton loading={loading} text="Send Reset Link" />
            <button type="button" onClick={exitForgotPassword} className="text-sm text-muted-foreground hover:text-foreground text-center w-full mt-2">
              ← Back to Login
            </button>
          </motion.form>
        );
      case 'sent':
        return (
          <motion.div key="reset-sent" className="space-y-5 flex flex-col items-center text-center"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
            <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center">
              <Mail className="w-8 h-8 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Check Your Email</h1>
            <p className="text-muted-foreground text-sm max-w-xs">
              We've sent a reset link to <span className="font-medium text-foreground">{maskEmail(resetEmail)}</span>
            </p>
            <div className="w-full space-y-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setResetStep('email')} className="w-full h-14 rounded-2xl font-semibold border-border/50">Resend Email</Button>
              <button type="button" onClick={exitForgotPassword} className="text-sm text-muted-foreground hover:text-foreground w-full">← Back to Login</button>
            </div>
          </motion.div>
        );
      case 'newPassword':
        return (
          <motion.form key="reset-new" onSubmit={handleResetPassword} className="space-y-5"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
            <div className="text-center mb-2">
              <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
                <KeyRound className="w-8 h-8 text-muted-foreground" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-1">New Password</h1>
              <p className="text-muted-foreground text-sm">Enter your new password below.</p>
            </div>
            <div>
              <Label htmlFor="newPassword" className="text-xs font-medium text-muted-foreground mb-2 block uppercase tracking-wider">New Password</Label>
              <div className="relative">
                <Input id="newPassword" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={cn(inputClass, "pr-12")} required minLength={6} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label htmlFor="confirmPassword" className="text-xs font-medium text-muted-foreground mb-2 block uppercase tracking-wider">Confirm Password</Label>
              <div className="relative">
                <Input id="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                  className={cn(inputClass, "pr-12", confirmPassword && newPassword !== confirmPassword && "ring-1 ring-destructive")} required minLength={6} />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmPassword && newPassword !== confirmPassword && <p className="text-xs text-destructive mt-1">Passwords do not match</p>}
            </div>
            <GradientButton loading={loading} text="Reset Password" disabled={newPassword !== confirmPassword} />
          </motion.form>
        );
      case 'success':
        return (
          <motion.div key="reset-success" className="space-y-5 flex flex-col items-center text-center"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
            <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Password Reset!</h1>
            <p className="text-muted-foreground text-sm max-w-xs">Your password has been successfully reset.</p>
            <Button type="button" onClick={() => { exitForgotPassword(); setIsLogin(true); }} className="w-full h-14 rounded-2xl font-semibold bg-primary hover:bg-primary/90 text-primary-foreground mt-2">
              Login to Your Account
            </Button>
          </motion.div>
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background relative overflow-hidden">
      {/* Background ambient gradients */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-primary/[0.04] blur-[100px]" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-primary/[0.03] blur-[120px]" />
      </div>

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between p-4 sm:p-6">
        <Link to="/" className="flex items-center gap-2.5">
          <img src="/logo.png" alt="FoundersYard" className="w-9 h-9 rounded-xl object-cover" />
          <span className="text-base font-bold text-foreground hidden sm:block">FoundersYard</span>
        </Link>
        <button
          onClick={toggleMode}
          className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-4 py-2 rounded-full bg-muted/50 hover:bg-muted"
        >
          {isLogin ? 'Sign Up' : 'Log In'}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4 pb-8 sm:pb-12 relative z-10">
        <div className="w-full max-w-sm">
          <AnimatePresence mode="wait">
            {forgotPasswordMode ? (
              renderForgotPasswordContent()
            ) : (
              <motion.div
                key={isLogin ? 'login' : 'signup'}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              >
                {/* Heading */}
                <div className="text-center mb-8">
                  <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
                    {isLogin ? 'Welcome Back' : 'Create Account'}
                  </h1>
                  <p className="text-muted-foreground text-sm">
                    {isLogin ? 'Sign in to continue your journey' : 'Join the founder community'}
                  </p>
                </div>

                {/* Google Button first */}
                {/* Google sign-in hidden for now
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full h-14 rounded-2xl bg-muted/50 hover:bg-muted/80 border border-border/30 flex items-center justify-center gap-3 text-sm font-medium text-foreground transition-colors mb-6 disabled:opacity-50"
                >
                  <GoogleIcon />
                  Continue with Google
                </button>
                */}

                {/* Divider - hidden while Google sign-in is disabled
                <div className="relative flex items-center gap-3 mb-6">
                  <div className="flex-1 h-px bg-border/50" />
                  <span className="text-xs text-muted-foreground/60 uppercase tracking-wider">or</span>
                  <div className="flex-1 h-px bg-border/50" />
                </div>
                */}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Name fields */}
                  {!isLogin && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="firstName" className="text-xs font-medium text-muted-foreground mb-2 block uppercase tracking-wider">First Name</Label>
                        <Input id="firstName" placeholder="John" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} className={inputClass} required={!isLogin} />
                      </div>
                      <div>
                        <Label htmlFor="lastName" className="text-xs font-medium text-muted-foreground mb-2 block uppercase tracking-wider">Last Name</Label>
                        <Input id="lastName" placeholder="Doe" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} className={inputClass} required={!isLogin} />
                      </div>
                    </div>
                  )}

                  {/* Username */}
                  {!isLogin && (
                    <div>
                      <Label htmlFor="username" className="text-xs font-medium text-muted-foreground mb-2 block uppercase tracking-wider">Username</Label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/60 font-medium text-sm">@</span>
                        <Input
                          id="username" placeholder="yourhandle" value={formData.username}
                          onChange={(e) => handleUsernameChange(e.target.value)}
                          className={cn(inputClass, "pl-9 pr-12",
                            usernameStatus === 'available' && 'ring-1 ring-emerald-500/50 bg-emerald-500/5',
                            (usernameStatus === 'taken' || usernameStatus === 'invalid') && 'ring-1 ring-destructive/50 bg-destructive/5'
                          )}
                          required={!isLogin}
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                          {usernameStatus === 'checking' && <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />}
                          {usernameStatus === 'available' && <Check className="w-4 h-4 text-emerald-400" />}
                          {(usernameStatus === 'taken' || usernameStatus === 'invalid') && <X className="w-4 h-4 text-destructive" />}
                        </div>
                      </div>
                      {usernameError && <p className="text-xs text-destructive mt-1.5 ml-1">{usernameError}</p>}
                      {usernameStatus === 'available' && <p className="text-xs text-emerald-400 mt-1.5 ml-1">@{formData.username} is available!</p>}
                    </div>
                  )}

                  {/* Email */}
                  <div>
                    <Label htmlFor="email" className="text-xs font-medium text-muted-foreground mb-2 block uppercase tracking-wider">Email</Label>
                    <Input id="email" type="email" placeholder="you@company.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className={inputClass} required />
                  </div>

                  {/* Password */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label htmlFor="password" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Password</Label>
                      {isLogin && (
                        <button type="button" onClick={() => setForgotPasswordMode(true)} className="text-xs text-primary hover:text-primary/80 font-medium">
                          Forgot?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })} className={cn(inputClass, "pr-12")} required minLength={6} />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Terms */}
                  {!isLogin && (
                    <div className="flex items-start gap-2.5 pt-1">
                      <Checkbox id="terms" checked={agreeToTerms} onCheckedChange={(checked) => setAgreeToTerms(checked as boolean)}
                        className="mt-0.5 h-5 w-5 rounded border-2 border-foreground/40 data-[state=checked]:bg-primary data-[state=checked]:border-primary" />
                      <Label htmlFor="terms" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                        I agree to the{' '}
                        <Link to="/terms" className="text-primary font-medium hover:underline">Terms</Link>{' '}
                        and{' '}
                        <Link to="/privacy" className="text-primary font-medium hover:underline">Privacy Policy</Link>
                      </Label>
                    </div>
                  )}

                  {/* Submit */}
                  <div className="pt-2">
                    <GradientButton
                      loading={loading}
                      text={isLogin ? 'Sign In' : 'Create Account'}
                      disabled={!isLogin && (usernameStatus !== 'available' || !agreeToTerms)}
                    />
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function GradientButton({ loading, text, disabled }: { loading: boolean; text: string; disabled?: boolean }) {
  return (
    <div className="rounded-2xl bg-gradient-to-r from-pink-500 via-red-500 to-orange-500 p-[1.5px]">
      <button
        type="submit"
        disabled={loading || disabled}
        className="w-full h-[52px] rounded-[14px] bg-background hover:bg-background/90 text-foreground font-semibold text-base transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : text}
      </button>
    </div>
  );
}
