import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Users, Rocket, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { VerifiedBadge } from '@/components/shared/VerifiedBadge';
import { NetworkButton } from '@/components/shared/NetworkButton';
import slide1 from '@/assets/onboarding-slide-1.jpg';
import slide2 from '@/assets/onboarding-slide-2.jpg';
import slide3 from '@/assets/onboarding-slide-3.jpg';

interface TopFounder {
  id: string;
  full_name: string;
  username: string | null;
  avatar_url: string | null;
  company_name: string | null;
  is_verified: boolean | null;
}

export default function Welcome() {
  const [step, setStep] = useState(0);
  const [followedCount, setFollowedCount] = useState(0);
  const [topFounders, setTopFounders] = useState<TopFounder[]>([]);
  const [loadingFounders, setLoadingFounders] = useState(false);
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const { theme, setTheme } = useTheme();

  // Force light theme on welcome page, restore on unmount
  useEffect(() => {
    const prev = theme;
    setTheme('light');
    return () => { if (prev) setTheme(prev); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if ((profile as any)?.has_onboarded) {
      navigate('/feed', { replace: true });
    }
  }, [profile, navigate]);

  useEffect(() => {
    const fetchTopFounders = async () => {
      if (!user) return;
      setLoadingFounders(true);
      try {
        const { data } = await supabase
          .from('profiles')
          .select('id, full_name, username, avatar_url, company_name, is_verified')
          .neq('id', user.id)
          .not('avatar_url', 'is', null)
          .not('username', 'is', null)
          .order('is_verified', { ascending: false })
          .limit(12);
        if (data) setTopFounders(data);
      } catch (err) {
        console.error('Failed to fetch founders:', err);
      } finally {
        setLoadingFounders(false);
      }
    };
    fetchTopFounders();
  }, [user]);

  const checkFollowCount = useCallback(async () => {
    if (!user) return;
    const { count } = await supabase
      .from('network_connections')
      .select('*', { count: 'exact', head: true })
      .eq('requester_id', user.id);
    setFollowedCount(count || 0);
  }, [user]);

  useEffect(() => {
    if (step === 3) {
      checkFollowCount();
      const interval = setInterval(checkFollowCount, 2000);
      return () => clearInterval(interval);
    }
  }, [step, checkFollowCount]);

  const completeOnboarding = async () => {
    if (user) {
      await supabase.from('profiles').update({ has_onboarded: true } as any).eq('id', user.id);
      await refreshProfile();
    }
    navigate('/feed', { replace: true });
  };

  const handleNext = () => {
    if (step < 3) setStep(s => s + 1);
  };

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || profile?.full_name?.split(' ')[0] || 'Founder';

  const introSlides = [
    {
      image: slide1,
      title: `Welcome, ${firstName}!`,
      subtitle: 'Your journey starts here',
      description: "You've joined a community of ambitious founders building the future.",
    },
    {
      image: slide2,
      title: 'Connect & Collaborate',
      subtitle: 'Find your tribe',
      description: 'Share wins, find co-founders, and get real advice from people who get it.',
    },
    {
      image: slide3,
      title: 'Launch & Grow',
      subtitle: 'Ship with confidence',
      description: 'Showcase your products, get upvotes, and grow with community support.',
    },
  ];

  // Follow step (step === 3)
  if (step === 3) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex-1 flex flex-col items-center px-4 pt-12 sm:pt-16 pb-8 max-w-2xl mx-auto w-full">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8 w-full">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Follow Founders</h1>
            <p className="text-muted-foreground text-sm sm:text-base max-w-md mx-auto">
              Follow at least 2 founders to personalize your feed
            </p>
          </motion.div>

          <div className="w-full grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8 flex-1 overflow-y-auto">
            {loadingFounders ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-card rounded-2xl p-4 animate-pulse border border-border/30">
                  <div className="w-14 h-14 rounded-full bg-muted mx-auto mb-3" />
                  <div className="h-3 bg-muted rounded w-2/3 mx-auto mb-2" />
                  <div className="h-8 bg-muted rounded w-full mx-auto mt-3" />
                </div>
              ))
            ) : (
              topFounders.map((founder, i) => (
                <motion.div
                  key={founder.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.04 }}
                  className="bg-card rounded-2xl p-4 border border-border/40 flex flex-col items-center text-center shadow-sm hover:shadow-md transition-shadow"
                >
                  <UserAvatar src={founder.avatar_url} name={founder.full_name} size="lg" className="mb-2" />
                  <div className="flex items-center gap-1 mb-0.5">
                    <p className="text-sm font-semibold text-foreground truncate max-w-[100px]">{founder.full_name}</p>
                    {founder.is_verified && <VerifiedBadge size="sm" />}
                  </div>
                  {founder.company_name && (
                    <p className="text-xs text-muted-foreground truncate w-full mb-2">{founder.company_name}</p>
                  )}
                  {!founder.company_name && <div className="mb-2" />}
                  <NetworkButton profileId={founder.id} size="sm" className="w-full text-xs" />
                </motion.div>
              ))
            )}
          </div>

          <div className="w-full max-w-md mx-auto sticky bottom-4">
            <div className="text-center text-sm text-muted-foreground mb-3">
              {followedCount >= 2 ? (
                <span className="text-primary font-medium">✓ Following {followedCount} founders</span>
              ) : (
                <span>Follow {Math.max(0, 2 - followedCount)} more to continue</span>
              )}
            </div>
            <Button
              onClick={completeOnboarding}
              disabled={followedCount < 2}
              className="w-full h-14 rounded-2xl text-base font-semibold gap-2 bg-foreground hover:bg-foreground/90 text-background disabled:opacity-40"
            >
              Let's Go!
              <ArrowRight className="w-5 h-5" />
            </Button>
            <button onClick={completeOnboarding} className="text-sm text-muted-foreground hover:text-foreground transition-colors w-full mt-3 text-center">
              Skip for now
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Intro slides (step 0-2)
  const currentIntro = introSlides[step];

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      <div className="flex-1 relative min-h-[50vh]">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0"
          >
            <img src={currentIntro.image} alt={currentIntro.title} className="w-full h-full object-cover" draggable={false} />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-black/20" />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="relative z-10 -mt-24 sm:-mt-32">
        <div className="bg-card rounded-t-[32px] sm:rounded-t-[40px] px-6 sm:px-8 pt-8 sm:pt-10 pb-8 sm:pb-10 shadow-[0_-10px_40px_rgba(0,0,0,0.3)] border-t border-border/10">
          <div className="max-w-lg mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              >
                <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground leading-tight mb-2 tracking-tight">
                  {currentIntro.title}
                </h1>
                <p className="text-primary font-semibold text-sm mb-3">{currentIntro.subtitle}</p>
                <p className="text-muted-foreground text-base leading-relaxed mb-8">{currentIntro.description}</p>
              </motion.div>
            </AnimatePresence>

            <div className="flex items-center gap-2 mb-6">
              {[0, 1, 2, 3].map(i => (
                <div
                  key={i}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === step ? 'w-8 bg-foreground' : i < step ? 'w-2 bg-foreground/40' : 'w-2 bg-muted-foreground/30'
                  }`}
                />
              ))}
            </div>

            <Button
              onClick={handleNext}
              className="w-full h-14 rounded-2xl text-base font-semibold bg-foreground hover:bg-foreground/90 text-background gap-2 shadow-lg hover:shadow-xl transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              Continue
              <ArrowRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
