import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdsLayout } from '@/components/ads/AdsLayout';
import { AdPreview } from '@/components/ads/AdPreview';
import { CpcBidSlider } from '@/components/ads/CpcBidSlider';
import { ImageCropModal } from '@/components/shared/ImageCropModal';
import { AdContentGuidelinesModal } from '@/components/ads/AdContentGuidelinesModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAds } from '@/hooks/useAds';
import { useAdvertiser } from '@/hooks/useAdvertiser';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, ImageIcon, X, ArrowLeft, MousePointer, Shield, Zap, CalendarIcon, Clock, Rocket, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function CreateCPCCampaign() {
  const navigate = useNavigate();
  const { createAd } = useAds();
  const { advertiserProfile } = useAdvertiser();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [headline, setHeadline] = useState('');
  const [destinationUrl, setDestinationUrl] = useState('');
  const [adType, setAdType] = useState('sidebar');
  const [cpcBid, setCpcBid] = useState(50);
  const [dailyBudget, setDailyBudget] = useState(1000);
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Scheduling states
  const [scheduleType, setScheduleType] = useState<'now' | 'later'>('now');
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(undefined);
  const [scheduledTime, setScheduledTime] = useState('09:00');
  
  // Image crop states
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [showCrop, setShowCrop] = useState(false);
  
  // Guidelines modal state
  const [showGuidelines, setShowGuidelines] = useState(false);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCropSrc(reader.result as string);
      setShowCrop(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    setShowCrop(false);
    setCropSrc(null);
    setUploading(true);

    try {
      const fileName = `${advertiserProfile?.id}/${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('ad-creatives')
        .upload(fileName, croppedBlob, { contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('ad-creatives')
        .getPublicUrl(fileName);

      setImageUrl(publicUrl);
      toast.success('Image uploaded successfully!');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeImage = () => {
    setImageUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validateUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const getScheduledAt = (): string | null => {
    if (scheduleType === 'now' || !scheduledDate) return null;
    
    const [hours, minutes] = scheduledTime.split(':').map(Number);
    const scheduled = new Date(scheduledDate);
    scheduled.setHours(hours, minutes, 0, 0);
    return scheduled.toISOString();
  };

  const validateForm = () => {
    if (!headline.trim()) {
      toast.error('Please enter a headline');
      return false;
    }

    if (headline.length > 60) {
      toast.error('Headline must be 60 characters or less');
      return false;
    }

    if (!destinationUrl.trim()) {
      toast.error('Please enter a destination URL');
      return false;
    }

    if (!validateUrl(destinationUrl)) {
      toast.error('Please enter a valid URL');
      return false;
    }

    if (scheduleType === 'later' && !scheduledDate) {
      toast.error('Please select a start date');
      return false;
    }

    return true;
  };

  const handleLaunchClick = () => {
    if (validateForm()) {
      setShowGuidelines(true);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setShowGuidelines(false);

    try {
      const scheduledAt = getScheduledAt();
      const adData = {
        headline: headline.trim(),
        image_url: imageUrl || undefined,
        destination_url: destinationUrl.trim(),
        ad_type: adType,
        billing_type: 'cpc' as const,
        cpc_bid: cpcBid * 100,
        daily_budget: dailyBudget * 100,
        scheduled_at: scheduledAt,
      };

      const result = await createAd(adData);

      if (result) {
        navigate('/ads/campaigns');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Generate time options
  const timeOptions = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      timeOptions.push(time);
    }
  }

  return (
    <AdsLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link to="/ads/create" className="p-2 rounded-xl hover:bg-secondary transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <MousePointer className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">CPC Campaign</h1>
                <p className="text-sm text-muted-foreground">Every click is a potential customer</p>
              </div>
            </div>
          </div>
        </div>

        {/* Premium Banner */}
        <div className="bg-gradient-to-r from-blue-500/10 via-blue-500/5 to-transparent border border-blue-500/20 rounded-2xl p-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="font-semibold text-blue-700 dark:text-blue-300">Pay Only When Someone Clicks</p>
              <p className="text-sm text-blue-600/80 dark:text-blue-400/80 mt-1">
                Your budget is spent only when visitors engage with your ad.
              </p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Form */}
          <div className="space-y-6">
            {/* Ad Creative */}
            <div className="bg-card border border-border/50 rounded-2xl p-6 space-y-6">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-blue-500 text-white text-sm font-bold flex items-center justify-center">1</span>
                <h2 className="text-lg font-semibold">Ad Creative</h2>
              </div>

              {/* Headline */}
              <div className="space-y-2">
                <Label htmlFor="headline">Headline <span className="text-muted-foreground font-normal">(make it count)</span></Label>
                <Input
                  id="headline"
                  placeholder="What makes you stand out?"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  maxLength={60}
                  className="h-12"
                />
                <p className="text-xs text-muted-foreground text-right">
                  {headline.length}/60 characters
                </p>
              </div>

              {/* Image Upload */}
              <div className="space-y-2">
                <Label>Ad Image <span className="text-muted-foreground font-normal">(optional but recommended)</span></Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                
                {imageUrl ? (
                  <div className="relative aspect-video rounded-xl overflow-hidden border border-border">
                    <img src={imageUrl} alt="Ad preview" className="w-full h-full object-cover" />
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute top-2 right-2 w-8 h-8"
                      onClick={removeImage}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="w-full aspect-video rounded-xl border-2 border-dashed border-border hover:border-blue-500/50 transition-colors flex flex-col items-center justify-center gap-3 bg-secondary/30"
                  >
                    {uploading ? (
                      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                          <ImageIcon className="w-6 h-6 text-blue-500" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium">Click to upload</p>
                          <p className="text-xs text-muted-foreground">PNG, JPG up to 5MB</p>
                        </div>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Destination URL */}
              <div className="space-y-2">
                <Label htmlFor="url">Where should clicks go?</Label>
                <Input
                  id="url"
                  type="url"
                  placeholder="https://yourwebsite.com/landing-page"
                  value={destinationUrl}
                  onChange={(e) => setDestinationUrl(e.target.value)}
                  className="h-12"
                />
              </div>

              {/* Ad Type */}
              <div className="space-y-3">
                <Label>Ad Placement</Label>
                <RadioGroup value={adType} onValueChange={setAdType}>
                  <div className="flex items-center space-x-3 p-4 rounded-xl border border-border bg-secondary/30">
                    <RadioGroupItem value="sidebar" id="sidebar" />
                    <Label htmlFor="sidebar" className="flex-1 cursor-pointer">
                      <span className="font-medium">Sidebar Suggestions</span>
                      <p className="text-xs text-muted-foreground">Appears in "Suggested for you" section</p>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>

            {/* Bidding & Budget */}
            <div className="bg-card border border-border/50 rounded-2xl p-6 space-y-6">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-blue-500 text-white text-sm font-bold flex items-center justify-center">2</span>
                <h2 className="text-lg font-semibold">Bidding & Budget</h2>
              </div>

              <CpcBidSlider value={cpcBid} onChange={setCpcBid} />

              <div className="space-y-2">
                <Label htmlFor="budget">Daily Budget</Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                  <Input
                    id="budget"
                    type="number"
                    min={100}
                    value={dailyBudget}
                    onChange={(e) => setDailyBudget(Number(e.target.value))}
                    className="h-12 pl-8"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Minimum ₹100 per day
                </p>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <Zap className="w-5 h-5 text-emerald-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                    Up to {Math.floor(dailyBudget / cpcBid)} clicks/day
                  </p>
                  <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80">
                    At ₹{cpcBid}/click with your ₹{dailyBudget} daily budget
                  </p>
                </div>
              </div>
            </div>

            {/* Scheduling */}
            <div className="bg-card border border-border/50 rounded-2xl p-6 space-y-6">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-blue-500 text-white text-sm font-bold flex items-center justify-center">3</span>
                <h2 className="text-lg font-semibold">Launch Timing</h2>
              </div>

              <RadioGroup value={scheduleType} onValueChange={(v) => setScheduleType(v as 'now' | 'later')}>
                <div className={cn(
                  "flex items-center space-x-3 p-4 rounded-xl border transition-colors cursor-pointer",
                  scheduleType === 'now' ? 'border-blue-500/50 bg-blue-500/5' : 'border-border'
                )}>
                  <RadioGroupItem value="now" id="now" />
                  <Label htmlFor="now" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Rocket className="w-4 h-4 text-blue-500" />
                      <span className="font-medium">Launch Immediately</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Start getting clicks as soon as you submit</p>
                  </Label>
                </div>
                
                <div className={cn(
                  "p-4 rounded-xl border transition-colors",
                  scheduleType === 'later' ? 'border-blue-500/50 bg-blue-500/5' : 'border-border'
                )}>
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="later" id="later" />
                    <Label htmlFor="later" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4 text-blue-500" />
                        <span className="font-medium">Schedule for Later</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Pick a date and time to start</p>
                    </Label>
                  </div>
                  
                  {scheduleType === 'later' && (
                    <div className="mt-4 pt-4 border-t border-border/50 flex gap-3">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "flex-1 justify-start text-left font-normal",
                              !scheduledDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {scheduledDate ? format(scheduledDate, "PPP") : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={scheduledDate}
                            onSelect={setScheduledDate}
                            disabled={(date) => date < new Date()}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                      
                      <Select value={scheduledTime} onValueChange={setScheduledTime}>
                        <SelectTrigger className="w-32">
                          <Clock className="w-4 h-4 mr-2" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {timeOptions.map((time) => (
                            <SelectItem key={time} value={time}>
                              {time}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </RadioGroup>
            </div>

            {/* Submit */}
            <Button
              onClick={handleLaunchClick}
              disabled={submitting || !headline || !destinationUrl}
              className="w-full h-14 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-lg font-semibold rounded-xl"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : scheduleType === 'later' && scheduledDate ? (
                <>
                  <CalendarIcon className="w-5 h-5 mr-2" />
                  Schedule Campaign
                </>
              ) : (
                <>
                  <Rocket className="w-5 h-5 mr-2" />
                  Launch Campaign
                </>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              All ads require admin approval before going live
            </p>
          </div>

          {/* Preview */}
          <div className="lg:sticky lg:top-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Live Preview</h2>
              <span className="px-2.5 py-1 bg-secondary rounded-full text-xs text-muted-foreground">
                Sidebar Ad
              </span>
            </div>
            <AdPreview
              headline={headline}
              imageUrl={imageUrl}
              destinationUrl={destinationUrl}
            />
            <div className="flex items-center gap-2 justify-center text-xs text-muted-foreground">
              <CheckCircle className="w-3.5 h-3.5 text-primary" />
              This is how founders will see your ad
            </div>
          </div>
        </div>

        {/* Image Crop Modal */}
        <ImageCropModal
          imageSrc={cropSrc}
          open={showCrop}
          onClose={() => {
            setShowCrop(false);
            setCropSrc(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
          }}
          onCropComplete={handleCropComplete}
          aspectRatio={16 / 9}
          title="Crop Ad Image"
        />

        {/* Content Guidelines Modal */}
        <AdContentGuidelinesModal
          open={showGuidelines}
          onOpenChange={setShowGuidelines}
          onConfirm={handleSubmit}
          isSubmitting={submitting}
        />
      </div>
    </AdsLayout>
  );
}
