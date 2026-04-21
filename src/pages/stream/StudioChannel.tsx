import { useState, useRef } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { 
  LayoutDashboard, 
  Video, 
  Settings, 
  Upload,
  ArrowLeft,
  Camera,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useStudio } from '@/hooks/useStudio';
import { cn } from '@/lib/utils';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/stream/studio' },
  { icon: Video, label: 'Content', href: '/stream/studio/content' },
  { icon: Settings, label: 'Channel', href: '/stream/studio/channel' },
];

export default function StudioChannel() {
  const { user, loading: authLoading } = useAuth();
  const { channel, loading, updateChannel, uploadBanner } = useStudio();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // Initialize form when channel loads
  useState(() => {
    if (channel) {
      setName(channel.channel_name || '');
      setDescription(channel.channel_description || '');
    }
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const handleSave = async () => {
    setSaving(true);
    await updateChannel({
      channel_name: name,
      channel_description: description,
    });
    setSaving(false);
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingBanner(true);
    await uploadBanner(file);
    setUploadingBanner(false);
  };

  return (
    <>
      <Helmet>
        <title>Channel Settings | Founders Studio</title>
        <meta name="description" content="Customize your channel on FY Streams" />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/40 px-4 h-14 flex items-center gap-4">
          <Link to="/stream" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Back to Stream</span>
          </Link>
          <div className="flex-1" />
          <span className="font-semibold text-foreground">Founders Studio</span>
          <div className="flex-1" />
        </header>

        <div className="flex">
          {/* Sidebar */}
          <aside className="w-56 shrink-0 hidden md:block border-r border-border/40">
            <nav className="p-2 space-y-1 sticky top-14">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                      isActive 
                        ? "bg-accent text-foreground font-medium" 
                        : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-sm">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 p-6 max-w-3xl">
            <h1 className="text-2xl font-bold text-foreground mb-6">Channel Customization</h1>

            {loading ? (
              <div className="space-y-6">
                <Skeleton className="h-48 w-full rounded-xl" />
                <Skeleton className="h-32 w-full rounded-xl" />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Banner */}
                <Card>
                  <CardHeader>
                    <CardTitle>Channel Banner</CardTitle>
                    <CardDescription>
                      This appears at the top of your channel page. Recommended size: 2560 x 440 pixels.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div 
                      className="relative aspect-[6/1] rounded-xl bg-muted overflow-hidden cursor-pointer group"
                      onClick={() => bannerInputRef.current?.click()}
                    >
                      {channel?.banner_url ? (
                        <img 
                          src={channel.banner_url} 
                          alt="Channel banner"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <User className="w-12 h-12 text-muted-foreground/30" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        {uploadingBanner ? (
                          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <div className="flex items-center gap-2 text-white">
                            <Camera className="w-5 h-5" />
                            <span className="text-sm font-medium">Upload banner</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <input
                      ref={bannerInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleBannerUpload}
                      className="hidden"
                    />
                  </CardContent>
                </Card>

                {/* Channel Info */}
                <Card>
                  <CardHeader>
                    <CardTitle>Channel Info</CardTitle>
                    <CardDescription>
                      Basic information about your channel.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Channel Name</Label>
                      <Input
                        id="name"
                        value={name || channel?.channel_name || ''}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your channel name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={description || channel?.channel_description || ''}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Tell viewers about your channel"
                        rows={4}
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button onClick={handleSave} disabled={saving}>
                        {saving ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </main>
        </div>
      </div>
    </>
  );
}
