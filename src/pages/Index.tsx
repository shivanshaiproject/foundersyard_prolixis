import { useState, useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { ArrowRight, ChevronRight, Users, Rocket, Zap, Globe, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import slide1 from '@/assets/onboarding-slide-1.jpg';
import slide2 from '@/assets/onboarding-slide-2.jpg';
import slide3 from '@/assets/onboarding-slide-3.jpg';
import slide4 from '@/assets/onboarding-slide-4.jpg';

// Preload all images in parallel for instant display
const preloadImages = [slide1, slide2, slide3, slide4];
preloadImages.forEach((src) => {
  const img = new Image();
  img.src = src;
});

const slides = [
  {
    image: slide1,
    icon: Users,
    badge: 'Community',
    badgeIcon: Users,
    title: 'Build Together\nWith Founders',
    description: 'Join a thriving community of founders sharing wins, challenges, and real insights.',
  },
  {
    image: slide2,
    icon: Globe,
    badge: 'Network',
    badgeIcon: Globe,
    title: 'Connect With\nReal Builders',
    description: 'Network with verified founders across AI, SaaS, Fintech, and more.',
  },
  {
    image: slide3,
    icon: Rocket,
    badge: 'Launch',
    badgeIcon: Rocket,
    title: 'Launch Your\nProducts',
    description: 'Showcase your products, get feedback, and grow with community support.',
  },
  {
    image: slide4,
    icon: Zap,
    badge: 'Celebrate',
    badgeIcon: Sparkles,
    title: 'Grow & Celebrate\nTogether',
    description: 'Share milestones, find co-founders, and be part of something bigger.',
  },
];

const Index = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  
  let user = null;
  let loading = false;

  try {
    const auth = useAuth();
    user = auth.user;
    loading = auth.loading;
  } catch {
    // AuthProvider not yet mounted
  }

  useEffect(() => {
    if (window.location.hash.includes('error=')) {
      window.location.replace(`${window.location.origin}/auth${window.location.hash}`);
    }
  }, []);
  const { theme, setTheme } = useTheme();

  // Force light theme on this page, restore on unmount
  useEffect(() => {
    const prev = theme;
    setTheme('light');
    return () => { if (prev) setTheme(prev); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps


  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/feed" replace />;
  }

  const isLastSlide = currentSlide === slides.length - 1;
  const slide = slides[currentSlide];

  const handleNext = () => {
    if (isLastSlide) return;
    setCurrentSlide(s => s + 1);
  };

  const handleDragEnd = (_: any, info: PanInfo) => {
    const threshold = 50;
    if (info.offset.x < -threshold && currentSlide < slides.length - 1) {
      setCurrentSlide(s => s + 1);
    } else if (info.offset.x > threshold && currentSlide > 0) {
      setCurrentSlide(s => s - 1);
    }
  };

  const goToSlide = (i: number) => {
    setCurrentSlide(i);
  };

  return (
    <>
    <Helmet>
      <title>FoundersYard – India's Social Platform for Startup Founders</title>
      <meta name="description" content="Join 1,000+ Indian founders on FoundersYard. Network, share wins, get feedback, find co-founders, and grow your startup with a real community." />
      <link rel="canonical" href="https://foundersyard.in/" />
      <meta property="og:type" content="website" />
      <meta property="og:url" content="https://foundersyard.in/" />
      <meta property="og:title" content="FoundersYard – India's Social Platform for Startup Founders" />
      <meta property="og:description" content="Join 1,000+ Indian founders. Network, share wins, find co-founders." />
      <meta property="og:site_name" content="FoundersYard" />
      <meta name="twitter:card" content="summary_large_image" />
      <script type="application/ld+json">{JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "FoundersYard",
        "url": "https://foundersyard.in",
        "description": "India's social platform for startup founders to network, share, and grow.",
        "publisher": { "@type": "Organization", "name": "FoundersYard", "url": "https://foundersyard.in" }
      })}</script>
    </Helmet>
    <div className="min-h-screen bg-background flex flex-col lg:flex-row relative overflow-hidden">
      {/* Full-screen image carousel with swipe */}
      <motion.div
        className="flex-1 relative min-h-[55vh] sm:min-h-[60vh] lg:min-h-0 lg:h-screen lg:w-1/2 cursor-grab active:cursor-grabbing"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0"
          >
            <img
              src={slide.image}
              alt={slide.title}
              className="w-full h-full object-cover object-center"
              fetchPriority={currentSlide === 0 ? 'high' : undefined}
              loading={currentSlide === 0 ? 'eager' : 'lazy'}
              draggable={false}
            />
            {/* Gradient overlay - bottom on mobile, right on desktop */}
            <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-background via-background/10 to-transparent" />
          </motion.div>
        </AnimatePresence>

        {/* Logo top-left */}
        <div className="absolute top-5 left-5 z-20 flex items-center gap-2.5">
          <img src="/logo.png" alt="FoundersYard" className="w-10 h-10 rounded-xl shadow-lg" />
          <span className="text-white font-bold text-lg drop-shadow-lg tracking-tight">FoundersYard</span>
        </div>

        {/* Login top-right */}
        <Link to="/auth" className="absolute top-5 right-5 z-20 lg:hidden">
          <span className="text-white/90 text-sm font-semibold hover:text-white transition-colors drop-shadow-lg px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20">
            Login
          </span>
        </Link>

        {/* Floating badge on image */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`badge-${currentSlide}`}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="absolute bottom-36 sm:bottom-44 lg:bottom-10 left-6 sm:left-8 z-20"
          >
            <span className="text-sm font-medium text-white bg-white/15 backdrop-blur-md rounded-full px-4 py-1.5 border border-white/20 shadow-lg flex items-center gap-1.5">
              <slide.badgeIcon className="w-3.5 h-3.5" />
              {slide.badge}
            </span>
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Bottom card section (mobile) / Right side (desktop) */}
      <div className="relative z-10 -mt-28 sm:-mt-36 lg:mt-0 lg:w-1/2 lg:h-screen lg:flex lg:items-center lg:justify-center">
        <div className="bg-card rounded-t-[32px] sm:rounded-t-[40px] lg:rounded-none px-6 sm:px-8 lg:px-12 xl:px-16 pt-8 sm:pt-10 lg:pt-0 pb-8 sm:pb-10 lg:pb-0 shadow-[0_-10px_40px_rgba(0,0,0,0.3)] lg:shadow-none border-t border-border/10 lg:border-0 lg:bg-background">
          <div className="max-w-lg mx-auto">
            {/* Login button for desktop */}
            <div className="hidden lg:flex justify-end mb-8">
              <Link to="/auth">
                <span className="text-sm font-semibold text-foreground hover:text-foreground/80 transition-colors px-5 py-2.5 rounded-full border border-border hover:bg-muted/50">
                  Login
                </span>
              </Link>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              >
                <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-extrabold text-foreground leading-[1.1] whitespace-pre-line mb-3 lg:mb-4 tracking-tight">
                  {slide.title}
                </h1>
                <p className="text-muted-foreground text-base sm:text-lg lg:text-xl leading-relaxed mb-8">
                  {slide.description}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Progress dots */}
            <div className="flex items-center gap-2 mb-6">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goToSlide(i)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === currentSlide ? 'w-8 bg-foreground' : 'w-2 bg-muted-foreground/30'
                  }`}
                />
              ))}
            </div>

            {/* Action buttons */}
            {isLastSlide ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-3"
              >
                <Link to="/auth?mode=signup">
                  <Button className="w-full h-14 rounded-2xl text-base font-semibold bg-foreground hover:bg-foreground/90 text-background gap-2 shadow-lg hover:shadow-xl transition-all hover:scale-[1.01] active:scale-[0.99]">
                    Get Started
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </Link>
                <Link to="/auth">
                  <Button variant="outline" className="w-full h-14 rounded-2xl text-base font-semibold border-2 hover:bg-muted/50 transition-all">
                    Sign In
                  </Button>
                </Link>
              </motion.div>
            ) : (
              <Button
                onClick={handleNext}
                className="w-full h-14 rounded-2xl text-base font-semibold bg-foreground hover:bg-foreground/90 text-background gap-2 shadow-lg hover:shadow-xl transition-all hover:scale-[1.01] active:scale-[0.99]"
              >
                Continue
                <ChevronRight className="w-5 h-5" />
              </Button>
            )}

            {/* Social proof */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-center text-xs text-muted-foreground/60 mt-5 flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3 h-3" />
              Trusted by 1,000+ founders across India
            </motion.p>

            {/* Copyright */}
            <p className="text-center text-[10px] text-muted-foreground/40 mt-3">
              © {new Date().getFullYear()} FoundersYard | Built by Prolixis. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default Index;
