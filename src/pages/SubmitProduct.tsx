import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Loader2, Rocket, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { generateSlug } from '@/lib/slugify';
import { cn } from '@/lib/utils';
import {
  BasicInfoStep,
  DetailsStep,
  MediaStep,
  LaunchStep,
  ReviewStep,
} from '@/components/products/SubmitSteps';

const steps = [
  { id: 1, name: 'Basic Info', description: 'Name, tagline, website' },
  { id: 2, name: 'Details', description: 'Category, description' },
  { id: 3, name: 'Media', description: 'Screenshots' },
  { id: 4, name: 'Launch', description: 'Schedule date' },
  { id: 5, name: 'Review', description: 'Final check' },
];

export default function SubmitProduct() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    tagline: '',
    description: '',
    websiteUrl: '',
    category: '',
    videoUrl: '',
  });
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [screenshotFiles, setScreenshotFiles] = useState<File[]>([]);
  const [screenshotPreviews, setScreenshotPreviews] = useState<string[]>([]);
  const [launchDate, setLaunchDate] = useState<Date | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!user) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto px-4 py-12 text-center">
          <Rocket className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Sign in to submit</h1>
          <p className="text-muted-foreground mb-6">
            You need to be signed in to submit a product.
          </p>
          <Link to="/auth">
            <Button>Sign In</Button>
          </Link>
        </div>
      </AppLayout>
    );
  }

  const handleIconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIconFile(file);
      setIconPreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveIcon = () => {
    setIconFile(null);
    setIconPreview(null);
  };

  const handleScreenshotsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + screenshotFiles.length > 5) {
      toast({ title: 'Maximum 5 screenshots allowed', variant: 'destructive' });
      return;
    }
    setScreenshotFiles([...screenshotFiles, ...files]);
    setScreenshotPreviews([...screenshotPreviews, ...files.map((f) => URL.createObjectURL(f))]);
  };

  const removeScreenshot = (index: number) => {
    setScreenshotFiles(screenshotFiles.filter((_, i) => i !== index));
    setScreenshotPreviews(screenshotPreviews.filter((_, i) => i !== index));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.name.trim() && formData.tagline.trim() && formData.websiteUrl.trim() && iconPreview;
      case 2:
        return formData.category && formData.description.trim();
      case 3:
        return screenshotPreviews.length > 0;
      case 4:
        return !!launchDate;
      case 5:
        return true;
      default:
        return false;
    }
  };

  const isComplete = () => {
    return (
      formData.name.trim() &&
      formData.tagline.trim() &&
      formData.websiteUrl.trim() &&
      formData.category &&
      formData.description.trim() &&
      iconPreview &&
      screenshotPreviews.length > 0 &&
      launchDate
    );
  };

  const handleSubmit = async () => {
    if (!isComplete()) {
      toast({ title: 'Please complete all required fields', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);

    try {
      let iconUrl = null;
      const screenshotUrls: string[] = [];

      // Upload icon
      if (iconFile) {
        const iconPath = `products/${user.id}/${Date.now()}_icon.${iconFile.name.split('.').pop()}`;
        const { error: iconError } = await supabase.storage
          .from('product-assets')
          .upload(iconPath, iconFile);

        if (!iconError) {
          const { data: urlData } = supabase.storage.from('product-assets').getPublicUrl(iconPath);
          iconUrl = urlData.publicUrl;
        }
      }

      // Upload screenshots
      for (const file of screenshotFiles) {
        const path = `products/${user.id}/${Date.now()}_${file.name}`;
        const { error } = await supabase.storage.from('product-assets').upload(path, file);

        if (!error) {
          const { data: urlData } = supabase.storage.from('product-assets').getPublicUrl(path);
          screenshotUrls.push(urlData.publicUrl);
        }
      }

      // Generate unique slug
      const baseSlug = generateSlug(formData.name);
      let slug = baseSlug;
      let counter = 1;

      while (true) {
        const { data: existing } = await supabase
          .from('products')
          .select('id')
          .eq('slug', slug)
          .maybeSingle();

        if (!existing) break;
        counter++;
        slug = generateSlug(formData.name, counter);
      }

      // Create product with scheduled launch date
      const { error: insertError } = await supabase.from('products').insert({
        name: formData.name,
        tagline: formData.tagline,
        description: formData.description || null,
        website_url: formData.websiteUrl,
        category: formData.category,
        video_url: formData.videoUrl || null,
        demo_video_url: formData.videoUrl || null,
        icon_url: iconUrl,
        screenshots: screenshotUrls,
        maker_id: user.id,
        slug,
        status: 'live', // No admin approval required - published on launch date
        launch_date: format(launchDate!, 'yyyy-MM-dd'),
      });

      if (insertError) throw insertError;

      toast({ 
        title: 'Product scheduled for launch!',
        description: `Your product will go live on ${format(launchDate!, 'MMMM d, yyyy')}`,
      });
      navigate('/products');
    } catch (error) {
      console.error('Submit error:', error);
      toast({ title: 'Error submitting product', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <BasicInfoStep
            formData={formData}
            setFormData={setFormData}
            iconPreview={iconPreview}
            onIconChange={handleIconChange}
            onRemoveIcon={handleRemoveIcon}
          />
        );
      case 2:
        return <DetailsStep formData={formData} setFormData={setFormData} />;
      case 3:
        return (
          <MediaStep
            screenshotPreviews={screenshotPreviews}
            onScreenshotsChange={handleScreenshotsChange}
            onRemoveScreenshot={removeScreenshot}
          />
        );
      case 4:
        return <LaunchStep launchDate={launchDate} setLaunchDate={setLaunchDate} />;
      case 5:
        return (
          <ReviewStep
            formData={formData}
            iconPreview={iconPreview}
            screenshotPreviews={screenshotPreviews}
            launchDate={launchDate}
          />
        );
      default:
        return null;
    }
  };

  return (
    <>
      <Helmet>
        <title>Submit Product | FoundersYard</title>
        <meta
          name="description"
          content="Submit your product to FoundersYard and get discovered by the founder community."
        />
      </Helmet>

      <AppLayout>
        <div className="max-w-3xl mx-auto px-4 py-6">
          <Link
            to="/products"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Products
          </Link>

          {/* Step Indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <button
                    onClick={() => step.id <= currentStep && setCurrentStep(step.id)}
                    disabled={step.id > currentStep}
                    className={cn(
                      'flex items-center gap-2 group',
                      step.id <= currentStep ? 'cursor-pointer' : 'cursor-not-allowed'
                    )}
                  >
                    <div
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                        step.id < currentStep
                          ? 'bg-primary text-primary-foreground'
                          : step.id === currentStep
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {step.id < currentStep ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        step.id
                      )}
                    </div>
                    <div className="hidden sm:block text-left">
                      <p
                        className={cn(
                          'text-sm font-medium',
                          step.id === currentStep
                            ? 'text-foreground'
                            : 'text-muted-foreground'
                        )}
                      >
                        {step.name}
                      </p>
                    </div>
                  </button>
                  {index < steps.length - 1 && (
                    <div
                      className={cn(
                        'w-8 sm:w-16 h-0.5 mx-2',
                        step.id < currentStep ? 'bg-primary' : 'bg-muted'
                      )}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Step Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border/50 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Rocket className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Submit Your Product</h1>
                <p className="text-sm text-muted-foreground">
                  Step {currentStep} of {steps.length}: {steps[currentStep - 1].description}
                </p>
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {renderStep()}
              </motion.div>
            </AnimatePresence>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep(currentStep - 1)}
                disabled={currentStep === 1}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Previous
              </Button>

              {currentStep < steps.length ? (
                <Button
                  type="button"
                  onClick={() => setCurrentStep(currentStep + 1)}
                  disabled={!canProceed()}
                  className="gap-2"
                >
                  Next
                  <ArrowRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting || !isComplete()}
                  className="gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Scheduling...
                    </>
                  ) : (
                    <>
                      <Rocket className="w-4 h-4" />
                      Schedule Launch
                    </>
                  )}
                </Button>
              )}
            </div>
          </motion.div>
        </div>
      </AppLayout>
    </>
  );
}
