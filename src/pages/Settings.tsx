import { useState, useRef, useEffect } from 'react';
import { User, Bell, Shield, LogOut, Upload, Camera, AtSign, ImageIcon, Building, AlertTriangle, ExternalLink, BadgeCheck, Crown, Loader2, Trophy, Link as LinkIconLucide } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { VerifiedBadge } from '@/components/shared/VerifiedBadge';
import { VIPBadge } from '@/components/shared/VIPBadge';
import { ImageCropModal } from '@/components/shared/ImageCropModal';
import { SocialLinksEditor, SocialLink } from '@/components/settings/SocialLinksEditor';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useStrikes } from '@/hooks/useStrikes';
import { useToast } from '@/hooks/use-toast';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LocationAutocomplete } from '@/components/shared/LocationAutocomplete';
import { RankProgressCard } from '@/components/profile/RankProgressCard';
import { RanksOverview } from '@/components/profile/RanksOverview';
import { format } from 'date-fns';

// URL normalization helper
const normalizeUrl = (url: string): string => {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return `https://${trimmed}`;
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const USERNAME_CHANGE_LIMIT = 3;
const USERNAME_RESET_DAYS = 90;

// Verification Request Component
function VerificationRequestSection({ profile, userId }: { profile: any; userId?: string }) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [existingRequest, setExistingRequest] = useState<any>(null);
  const [badgeType, setBadgeType] = useState<'verified' | 'vip'>('verified');
  const [reason, setReason] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (!userId) return;
    const fetchRequest = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('verification_requests')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      setExistingRequest(data);
      setLoading(false);
    };
    fetchRequest();
  }, [userId]);

  const submitRequest = async () => {
    if (!userId) return;
    setSubmitting(true);
    const { error } = await supabase
      .from('verification_requests')
      .insert({ user_id: userId, badge_type: badgeType, reason });
    
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Request submitted!', description: 'We will review your application soon.' });
      setExistingRequest({ status: 'pending', badge_type: badgeType });
    }
    setSubmitting(false);
  };

  if (profile?.is_verified && profile?.is_vip) return null;

  return (
    <div className="bg-card rounded-[20px] border border-border/40 p-6 space-y-4">
      <div className="flex items-center gap-2 text-foreground font-semibold">
        <BadgeCheck className="w-5 h-5" />
        Verification
      </div>

      {profile?.is_verified && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl">
          <VerifiedBadge size="md" />
          <span className="text-sm text-blue-700 dark:text-blue-300">Your account is verified!</span>
        </div>
      )}

      {profile?.is_vip && (
        <div className="flex items-center gap-2 p-3 bg-purple-50 dark:bg-purple-950/30 rounded-xl">
          <VIPBadge size="md" />
          <span className="text-sm text-purple-700 dark:text-purple-300">You have VIP status!</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : existingRequest?.status === 'pending' ? (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-950/30 rounded-xl">
          <p className="text-sm text-yellow-700 dark:text-yellow-300 font-medium">
            Your {existingRequest.badge_type === 'vip' ? 'VIP' : 'verification'} request is pending review.
          </p>
        </div>
      ) : existingRequest?.status === 'rejected' ? (
        <div className="space-y-3">
          <div className="p-4 bg-red-50 dark:bg-red-950/30 rounded-xl">
            <p className="text-sm text-red-700 dark:text-red-300">
              Your previous request was not approved: {existingRequest.rejection_reason || 'Did not meet requirements'}
            </p>
          </div>
          {!profile?.is_verified && (
            <Button onClick={() => setExistingRequest(null)} variant="outline" className="rounded-full">
              Submit New Request
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Request a verification badge for your profile to build trust with the community.
          </p>
          
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setBadgeType('verified')}
              className={`p-4 rounded-xl border-2 transition-all ${
                badgeType === 'verified' 
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30' 
                  : 'border-border hover:border-blue-300'
              }`}
            >
              <VerifiedBadge size="lg" className="mx-auto mb-2" />
              <p className="font-medium text-sm">Blue Badge</p>
              <p className="text-xs text-muted-foreground">Standard verification</p>
            </button>
            <button
              onClick={() => setBadgeType('vip')}
              className={`p-4 rounded-xl border-2 transition-all ${
                badgeType === 'vip' 
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/30' 
                  : 'border-border hover:border-purple-300'
              }`}
            >
              <VIPBadge size="lg" className="mx-auto mb-2" />
              <p className="font-medium text-sm">VIP Badge</p>
              <p className="text-xs text-muted-foreground">Premium status</p>
            </button>
          </div>

          <Textarea
            placeholder="Tell us why you should be verified..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="min-h-[80px]"
          />

          <Button 
            onClick={submitRequest} 
            disabled={submitting || !reason.trim()}
            className="bg-gradient-primary text-primary-foreground rounded-full"
          >
            {submitting ? 'Submitting...' : 'Request Verification'}
          </Button>
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const { profile, updateProfile, fetchProfile } = useProfile(user?.id);
  const { strikeStatus, strikeHistory, getStatusColor, getStatusLabel } = useStrikes();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [activeSection, setActiveSection] = useState<'profile' | 'ranks'>('profile');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  
  // Image crop states
  const [avatarCropSrc, setAvatarCropSrc] = useState<string | null>(null);
  const [coverCropSrc, setCoverCropSrc] = useState<string | null>(null);
  const [showAvatarCrop, setShowAvatarCrop] = useState(false);
  const [showCoverCrop, setShowCoverCrop] = useState(false);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);

  const [formData, setFormData] = useState({
    full_name: '',
    username: '',
    bio: '',
    company_name: '',
    company_website: '',
    location: '',
    linkedin_url: '',
    stage: '',
    position: '',
    notifications_enabled: true,
  });

  const positionOptions = [
    'Founder',
    'Founder & CEO',
    'Co-Founder',
    'CEO',
    'COO',
    'CTO',
    'CFO',
    'CMO',
    'CPO',
    'CRO',
    'CLO',
    'VP / Director',
    'Other',
  ];

  // Calculate remaining username changes
  const getRemainingUsernameChanges = () => {
    if (!profile) return USERNAME_CHANGE_LIMIT;
    
    const lastChanged = profile.username_changed_at ? new Date(profile.username_changed_at) : null;
    const changeCount = profile.username_change_count || 0;
    
    if (!lastChanged) return USERNAME_CHANGE_LIMIT;
    
    const daysSinceChange = Math.floor((Date.now() - lastChanged.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceChange >= USERNAME_RESET_DAYS) {
      return USERNAME_CHANGE_LIMIT;
    }
    
    return Math.max(0, USERNAME_CHANGE_LIMIT - changeCount);
  };

  const getNextChangeDate = () => {
    if (!profile?.username_changed_at) return null;
    const lastChanged = new Date(profile.username_changed_at);
    const nextReset = new Date(lastChanged.getTime() + USERNAME_RESET_DAYS * 24 * 60 * 60 * 1000);
    return nextReset;
  };

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        username: profile.username || '',
        bio: profile.bio || '',
        company_name: profile.company_name || '',
        company_website: profile.company_website || '',
        location: profile.location || '',
        linkedin_url: profile.linkedin_url || '',
        stage: profile.stage || '',
        position: (profile as any).position || '',
        notifications_enabled: profile.notifications_enabled ?? true,
      });
      // Load social links from profile
      setSocialLinks(profile.social_links || []);
    }
  }, [profile]);

  // Check username availability with debounce
  useEffect(() => {
    if (!formData.username || formData.username === profile?.username) {
      setUsernameAvailable(null);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingUsername(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', formData.username.toLowerCase())
        .neq('id', user?.id || '')
        .maybeSingle();
      
      setUsernameAvailable(!data && !error);
      setCheckingUsername(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.username, profile?.username, user?.id]);

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: 'File too large',
        description: 'Please select an image under 5MB.',
        variant: 'destructive',
      });
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please select an image file.',
        variant: 'destructive',
      });
      return;
    }

    // Show crop modal
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarCropSrc(reader.result as string);
      setShowAvatarCrop(true);
    };
    reader.readAsDataURL(file);
  };

  const handleAvatarCropComplete = async (croppedBlob: Blob) => {
    if (!user) return;
    
    setShowAvatarCrop(false);
    setAvatarCropSrc(null);
    setUploading(true);
    
    try {
      const filePath = `${user.id}/avatar.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, croppedBlob, { upsert: true, contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await updateProfile({ avatar_url: `${publicUrl}?t=${Date.now()}` });

      if (updateError) throw updateError;

      toast({ title: 'Avatar updated!' });
      fetchProfile();
    } catch (err: any) {
      toast({
        title: 'Upload failed',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: 'File too large',
        description: 'Please select an image under 5MB.',
        variant: 'destructive',
      });
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please select an image file.',
        variant: 'destructive',
      });
      return;
    }

    // Show crop modal
    const reader = new FileReader();
    reader.onload = () => {
      setCoverCropSrc(reader.result as string);
      setShowCoverCrop(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCoverCropComplete = async (croppedBlob: Blob) => {
    if (!user) return;
    
    setShowCoverCrop(false);
    setCoverCropSrc(null);
    setUploadingCover(true);
    
    try {
      const filePath = `${user.id}/cover.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('covers')
        .upload(filePath, croppedBlob, { upsert: true, contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('covers')
        .getPublicUrl(filePath);

      const { error: updateError } = await updateProfile({ cover_url: `${publicUrl}?t=${Date.now()}` });

      if (updateError) throw updateError;

      toast({ title: 'Cover image updated!' });
      fetchProfile();
    } catch (err: any) {
      toast({
        title: 'Upload failed',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    const remainingChanges = getRemainingUsernameChanges();
    const usernameChanged = formData.username !== profile?.username;
    
    if (usernameChanged && remainingChanges <= 0) {
      const nextDate = getNextChangeDate();
      toast({
        title: 'Username change limit reached',
        description: `You can change your username again on ${nextDate?.toLocaleDateString()}`,
        variant: 'destructive',
      });
      return;
    }

    if (usernameChanged && !usernameAvailable) {
      toast({
        title: 'Username unavailable',
        description: 'Please choose a different username.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    
    const updates: any = {
      full_name: formData.full_name,
      bio: formData.bio,
      company_name: formData.company_name,
      company_website: normalizeUrl(formData.company_website),
      location: formData.location,
      linkedin_url: normalizeUrl(formData.linkedin_url),
      stage: formData.stage || null,
      position: formData.position || null,
      notifications_enabled: formData.notifications_enabled,
      social_links: socialLinks.map(link => ({
        ...link,
        url: normalizeUrl(link.url)
      })),
    };

    if (usernameChanged && usernameAvailable) {
      updates.username = formData.username.toLowerCase();
      updates.username_changed_at = new Date().toISOString();
      updates.username_change_count = (profile?.username_change_count || 0) + 1;
    }

    const { error } = await updateProfile(updates);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Profile updated!' });
      fetchProfile();
    }
    setSaving(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const remainingChanges = getRemainingUsernameChanges();

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-6 max-w-2xl mx-auto">
        <h1 className="text-xl font-bold text-foreground">Settings</h1>

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-border/40 pb-2">
          <button
            onClick={() => setActiveSection('profile')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all ${
              activeSection === 'profile'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <User className="w-4 h-4" />
            Profile Settings
          </button>
          <button
            onClick={() => setActiveSection('ranks')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all ${
              activeSection === 'ranks'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <Trophy className="w-4 h-4" />
            Ranks
          </button>
        </div>

        {/* Ranks Section */}
        {activeSection === 'ranks' && (
          <div className="bg-card rounded-[20px] border border-border/40 p-6 space-y-5">
            <div className="flex items-center gap-2 text-foreground font-semibold">
              <Trophy className="w-5 h-5" />
              Your Rank Progress
            </div>
            <RankProgressCard userId={user?.id} />
            <div className="pt-3 border-t border-border/40">
              <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">
                All Ranks
              </p>
              <RanksOverview userId={user?.id} />
            </div>
          </div>
        )}

        {activeSection === 'profile' && (
          <>

        <div className="bg-card rounded-[20px] border border-border/40 overflow-hidden">
          {/* Cover Image Upload */}
          <div 
            className="relative h-32 bg-gradient-primary cursor-pointer group"
            onClick={() => coverInputRef.current?.click()}
            style={
              profile?.cover_url
                ? { backgroundImage: `url(${profile.cover_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                : undefined
            }
          >
            <div className="absolute inset-0 flex items-center justify-center bg-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity">
              {uploadingCover ? (
                <div className="w-6 h-6 border-2 border-background border-t-transparent rounded-full animate-spin" />
              ) : (
                <div className="flex items-center gap-2 text-background font-medium">
                  <ImageIcon className="w-5 h-5" />
                  Change Cover
                </div>
              )}
            </div>
              <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              onChange={handleCoverSelect}
              className="hidden"
            />
          </div>

          <div className="p-6 space-y-6">
            <div className="flex items-center gap-2 text-foreground font-semibold">
              <User className="w-5 h-5" />
              Profile Settings
            </div>

            {/* Avatar Upload */}
            <div className="flex items-center gap-5">
              <div className="relative group">
                <UserAvatar src={profile?.avatar_url} name={profile?.full_name} size="xl" />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute inset-0 flex items-center justify-center bg-foreground/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  {uploading ? (
                    <div className="w-5 h-5 border-2 border-background border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Camera className="w-5 h-5 text-background" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarSelect}
                  className="hidden"
                />
              </div>
              <div>
                <Button 
                  variant="outline" 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="rounded-full"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploading ? 'Uploading...' : 'Change Avatar'}
                </Button>
                <p className="text-xs text-muted-foreground mt-1.5">Max 5MB • JPG, PNG, GIF</p>
              </div>
            </div>

            <div className="grid gap-4">
              {/* Username field */}
              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="username">Username</Label>
                  <span className="text-xs text-muted-foreground">
                    {remainingChanges} change{remainingChanges !== 1 ? 's' : ''} remaining
                  </span>
                </div>
                <div className="relative mt-1.5">
                  <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={e => setFormData({ ...formData, username: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') })}
                    className="pl-9"
                    placeholder="your_username"
                    disabled={remainingChanges <= 0 && formData.username === profile?.username}
                  />
                  {checkingUsername && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
                  )}
                  {!checkingUsername && formData.username && formData.username !== profile?.username && (
                    <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium ${usernameAvailable ? 'text-success' : 'text-destructive'}`}>
                      {usernameAvailable ? '✓ Available' : '✗ Taken'}
                    </span>
                  )}
                </div>
                {remainingChanges <= 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Next change available on {getNextChangeDate()?.toLocaleDateString()}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={e => setFormData({ ...formData, bio: e.target.value })}
                  className="mt-1.5 min-h-[100px]"
                  placeholder="Tell us about yourself..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="company_name">Company</Label>
                  <Input
                    id="company_name"
                    value={formData.company_name}
                    onChange={e => setFormData({ ...formData, company_name: e.target.value })}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="stage">Stage</Label>
                  <Select
                    value={formData.stage}
                    onValueChange={(value) => setFormData({ ...formData, stage: value })}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Select stage" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="idea">Idea Stage</SelectItem>
                      <SelectItem value="pre_seed">Pre-Seed</SelectItem>
                      <SelectItem value="seed">Seed</SelectItem>
                      <SelectItem value="series_a">Series A</SelectItem>
                      <SelectItem value="series_b_plus">Series B+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="position">Position</Label>
                <Select
                  value={formData.position}
                  onValueChange={(value) => setFormData({ ...formData, position: value })}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    {positionOptions.map((pos) => (
                      <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="location">Location</Label>
                  <LocationAutocomplete
                    value={formData.location}
                    onChange={(value) => setFormData({ ...formData, location: value })}
                  />
                </div>
                <div>
                  <Label htmlFor="company_website">Website</Label>
                  <Input
                    id="company_website"
                    value={formData.company_website}
                    onChange={e => setFormData({ ...formData, company_website: e.target.value })}
                    className="mt-1.5"
                    placeholder="https://"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="linkedin_url">LinkedIn</Label>
                <Input
                  id="linkedin_url"
                  value={formData.linkedin_url}
                  onChange={e => setFormData({ ...formData, linkedin_url: e.target.value })}
                  className="mt-1.5"
                  placeholder="https://linkedin.com/in/..."
                />
              </div>

              {/* Social Links Section */}
              <div className="pt-4 border-t border-border/40">
                <div className="flex items-center gap-2 mb-3">
                  <LinkIconLucide className="w-4 h-4 text-muted-foreground" />
                  <Label>Social Links</Label>
                  <span className="text-xs text-muted-foreground">(up to 6)</span>
                </div>
                <SocialLinksEditor
                  links={socialLinks}
                  onChange={setSocialLinks}
                  maxLinks={6}
                />
              </div>
            </div>

            <Button onClick={handleSave} disabled={saving} className="bg-gradient-primary text-primary-foreground rounded-full">
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>

        {/* Community Compliance Status */}
        <div className={`bg-card rounded-[20px] border overflow-hidden ${
          strikeStatus && strikeStatus.strike_count > 0 
            ? strikeStatus.strike_count >= 2 
              ? 'border-destructive/40' 
              : 'border-warning/40'
            : 'border-border/40'
        }`}>
          <div className={`p-4 ${
            strikeStatus && strikeStatus.strike_count > 0
              ? strikeStatus.strike_count >= 2
                ? 'bg-destructive/5'
                : 'bg-warning/5'
              : ''
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className={`w-5 h-5 ${getStatusColor()}`} />
                <span className="font-semibold text-foreground">Community Compliance</span>
              </div>
              <span className={`text-sm font-medium ${getStatusColor()}`}>
                {getStatusLabel()}
              </span>
            </div>
          </div>
          
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Active Strikes</span>
              <div className="flex items-center gap-2">
                <span className={`text-2xl font-bold ${getStatusColor()}`}>
                  {strikeStatus?.strike_count || 0}
                </span>
                <span className="text-muted-foreground">/ 3</span>
              </div>
            </div>

            {/* Strike Progress Bar */}
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${
                  strikeStatus && strikeStatus.strike_count >= 2 
                    ? 'bg-destructive' 
                    : strikeStatus && strikeStatus.strike_count === 1 
                      ? 'bg-warning' 
                      : 'bg-success'
                }`}
                style={{ width: `${((strikeStatus?.strike_count || 0) / 3) * 100}%` }}
              />
            </div>

            {strikeStatus && strikeStatus.strike_count > 0 && strikeStatus.last_strike_reason && (
              <div className="bg-muted/50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Last Strike</span>
                  {strikeStatus.last_strike_date && (
                    <span className="text-muted-foreground">
                      {format(new Date(strikeStatus.last_strike_date), 'MMM d, yyyy')}
                    </span>
                  )}
                </div>
                <p className="text-sm text-foreground">{strikeStatus.last_strike_reason}</p>
              </div>
            )}

            {strikeHistory.length > 0 && (
              <div className="space-y-2">
                <span className="text-sm font-medium text-muted-foreground">Strike History</span>
                <div className="space-y-2">
                  {strikeHistory.slice(0, 3).map((strike) => (
                    <div key={strike.id} className="flex items-center justify-between text-sm bg-muted/30 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          strike.strike_number >= 2 ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'
                        }`}>
                          {strike.strike_number}
                        </span>
                        <span className="text-foreground">{strike.reason}</span>
                      </div>
                      <span className="text-muted-foreground text-xs">
                        {format(new Date(strike.issued_at), 'MMM d')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Link 
              to="/help" 
              className="flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Learn about Community Guidelines
            </Link>
        </div>

        {/* Verification Request Section */}
        <VerificationRequestSection profile={profile} userId={user?.id} />
        </div>


        <div className="bg-card rounded-[20px] border border-border/40 p-6 space-y-4">
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <Bell className="w-5 h-5" />
            Notifications
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Receive Notifications</p>
              <p className="text-sm text-muted-foreground">Get notified about network requests, likes, and comments</p>
            </div>
            <Switch 
              checked={formData.notifications_enabled} 
              onCheckedChange={(checked) => setFormData({ ...formData, notifications_enabled: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Email Notifications</p>
              <p className="text-sm text-muted-foreground">Receive updates via email</p>
            </div>
            <Switch />
          </div>
        </div>

        <div className="bg-card rounded-[20px] border border-border/40 p-6 space-y-4">
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <Shield className="w-5 h-5" />
            Account
          </div>

          <Button 
            variant="outline" 
            className="text-destructive hover:text-destructive rounded-full" 
            onClick={handleSignOut}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
        </>
        )}
      </div>

      {/* Image Crop Modals */}
      <ImageCropModal
        imageSrc={avatarCropSrc}
        open={showAvatarCrop}
        onClose={() => {
          setShowAvatarCrop(false);
          setAvatarCropSrc(null);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }}
        onCropComplete={handleAvatarCropComplete}
        aspectRatio={1}
        title="Crop Avatar"
      />
      <ImageCropModal
        imageSrc={coverCropSrc}
        open={showCoverCrop}
        onClose={() => {
          setShowCoverCrop(false);
          setCoverCropSrc(null);
          if (coverInputRef.current) coverInputRef.current.value = '';
        }}
        onCropComplete={handleCoverCropComplete}
        aspectRatio={3}
        title="Crop Cover Image"
      />
    </AppLayout>
  );
}