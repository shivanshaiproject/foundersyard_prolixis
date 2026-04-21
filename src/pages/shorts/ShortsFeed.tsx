import { useState, useRef, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronUp, ChevronDown, Plus, ArrowLeft, Bell } from 'lucide-react';
import { ShortCard } from '@/components/shorts/ShortCard';
import { ShortCardSkeleton } from '@/components/shorts/ShortCardSkeleton';
import { CreateShortModal } from '@/components/shorts/CreateShortModal';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { useShorts } from '@/hooks/useShorts';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function ShortsFeed() {
  const { shortId } = useParams();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const { user } = useAuth();
  const { 
    shorts, 
    loading, 
    hasMore, 
    fetchShorts, 
    likeShort, 
    checkIfLiked, 
    recordView, 
    shareShort 
  } = useShorts();
  const { unreadCount } = useNotifications();
  // Handle initial short ID from URL
  useEffect(() => {
    if (shortId && shorts.length > 0) {
      const index = shorts.findIndex(s => s.id === shortId);
      if (index !== -1) {
        setActiveIndex(index);
        scrollToIndex(index);
      }
    }
  }, [shortId, shorts]);

  // Scroll to specific index
  const scrollToIndex = useCallback((index: number) => {
    const container = containerRef.current;
    if (!container) return;

    const items = container.querySelectorAll('[data-short-item]');
    const targetItem = items[index] as HTMLElement;
    if (targetItem) {
      targetItem.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  // Handle scroll snap and detect active short
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
            const index = Number(entry.target.getAttribute('data-index'));
            if (!isNaN(index) && index !== activeIndex) {
              setActiveIndex(index);
              const short = shorts[index];
              if (short) {
                navigate(`/shorts/${short.id}`, { replace: true });
              }
            }
          }
        });
      },
      { threshold: 0.5, root: container }
    );

    const items = container.querySelectorAll('[data-short-item]');
    items.forEach((item) => observer.observe(item));

    return () => observer.disconnect();
  }, [shorts, activeIndex, navigate]);

  // Load more shorts when near the end
  useEffect(() => {
    if (activeIndex >= shorts.length - 3 && hasMore && !loading) {
      fetchShorts(shorts.length);
    }
  }, [activeIndex, shorts.length, hasMore, loading, fetchShorts]);

  const handlePrevious = () => {
    if (activeIndex > 0) {
      scrollToIndex(activeIndex - 1);
    }
  };

  const handleNext = () => {
    if (activeIndex < shorts.length - 1) {
      scrollToIndex(activeIndex + 1);
    }
  };

  const handleRecordView = useCallback((shortId: string, duration: number) => {
    recordView(shortId, duration);
  }, [recordView]);

  const handleCreateClick = () => {
    if (!user) {
      toast.error('Please sign in to create shorts');
      navigate('/auth');
      return;
    }
    setCreateModalOpen(true);
  };

  if (loading && shorts.length === 0) {
    return (
      <>
        <Helmet>
          <title>Shorts | FoundersYard</title>
        </Helmet>
        <div className="h-screen w-full bg-background">
          <ShortCardSkeleton />
        </div>
      </>
    );
  }

  if (!loading && shorts.length === 0) {
    return (
      <>
        <Helmet>
          <title>Shorts | FoundersYard</title>
        </Helmet>
        <div className="h-screen w-full bg-background flex items-center justify-center">
          <div className="text-center text-foreground">
            <p className="text-xl font-semibold mb-2">No shorts yet</p>
            <p className="text-muted-foreground mb-6">Be the first to share your journey!</p>
            {user && (
              <Button 
                onClick={() => setCreateModalOpen(true)}
                className="bg-primary hover:bg-primary/90"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Short
              </Button>
            )}
          </div>
        </div>
        <CreateShortModal 
          open={createModalOpen} 
          onOpenChange={setCreateModalOpen} 
        />
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Shorts | FoundersYard</title>
        <meta name="description" content="Watch short-form videos from founders sharing their journey" />
      </Helmet>

      <div className="fixed inset-0 bg-background flex flex-col overflow-hidden">
        {/* Floating Header with FoundersYard branding */}
        <div className="flex-shrink-0 h-14 flex items-center justify-between px-3 sm:px-4 bg-background/90 backdrop-blur-md border-b border-border/40 z-50">
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Back button */}
            <Link 
              to="/feed" 
              className="p-2 rounded-full hover:bg-secondary transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </Link>
            
            {/* Logo and branding */}
            <Link to="/feed" className="flex items-center gap-2 group">
              <img 
                src="/logo.png" 
                alt="FoundersYard" 
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-cover shadow-lg ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all" 
              />
              <div className="hidden sm:flex flex-col">
                <span className="text-base font-extrabold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text leading-tight">
                  FoundersYard
                </span>
                <span className="text-[10px] text-muted-foreground -mt-0.5">Shorts</span>
              </div>
              {/* Mobile: Just show "Shorts" badge */}
              <span className="sm:hidden text-sm font-semibold text-foreground">Shorts</span>
            </Link>
          </div>
          
          {/* Right side controls */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Notifications */}
            <Link to="/notifications" className="relative p-2 rounded-full hover:bg-secondary transition-colors">
              <Bell className="w-5 h-5 text-foreground" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full px-1">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>
            <ThemeToggle />
            <Button
              onClick={handleCreateClick}
              size="sm"
              className="bg-primary hover:bg-primary/90"
            >
              <Plus className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Create</span>
            </Button>
          </div>
        </div>

        {/* Shorts container with snap scroll - takes remaining height */}
        <div
          ref={containerRef}
          className="flex-1 w-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
          style={{ scrollSnapType: 'y mandatory' }}
        >
          {shorts.map((short, index) => (
            <div
              key={short.id}
              data-short-item
              data-index={index}
              className="h-full w-full snap-start snap-always flex-shrink-0"
              style={{ scrollSnapAlign: 'start', minHeight: '100%' }}
            >
              <ShortCard
                short={short}
                isActive={index === activeIndex}
                onLike={likeShort}
                onShare={shareShort}
                onViewRecorded={handleRecordView}
                checkIfLiked={checkIfLiked}
              />
            </div>
          ))}

          {/* Loading skeleton at end */}
          {hasMore && (
            <div className="h-full w-full snap-start flex-shrink-0" style={{ minHeight: '100%' }}>
              <ShortCardSkeleton />
            </div>
          )}
        </div>

        {/* Navigation buttons (desktop) */}
        <div className="hidden lg:flex fixed right-8 top-1/2 -translate-y-1/2 flex-col gap-2 z-40">
          <Button
            variant="outline"
            size="icon"
            onClick={handlePrevious}
            disabled={activeIndex === 0}
            className="rounded-full bg-secondary/80 border-border text-foreground hover:bg-secondary disabled:opacity-30"
          >
            <ChevronUp className="w-5 h-5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleNext}
            disabled={activeIndex >= shorts.length - 1 && !hasMore}
            className="rounded-full bg-secondary/80 border-border text-foreground hover:bg-secondary disabled:opacity-30"
          >
            <ChevronDown className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Create Short Modal */}
      <CreateShortModal 
        open={createModalOpen} 
        onOpenChange={setCreateModalOpen} 
      />

      {/* Hide scrollbar */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </>
  );
}
