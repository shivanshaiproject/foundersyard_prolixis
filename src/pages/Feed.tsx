import { useState, useEffect, useCallback, useRef } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PostCard } from '@/components/feed/PostCard';
import { PostComposer } from '@/components/feed/PostComposer';
import { FloatingPostButton } from '@/components/feed/FloatingPostButton';
import { FeedSkeleton } from '@/components/shared/LoadingSkeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { SponsoredPostCard } from '@/components/ads/SponsoredPostCard';
import { DiscoverFoundersTray } from '@/components/feed/DiscoverFoundersTray';
import { ForumThreadCard } from '@/components/feed/ForumThreadCard';
import { ShipsTray } from '@/components/ships/ShipsTray';
import { ShipViewer } from '@/components/ships/ShipViewer';
import { useShips } from '@/hooks/useShips';
import { useFeed, FeedPost, FeedThread, FeedFilter } from '@/hooks/useFeed';
import { supabase } from '@/integrations/supabase/client';
import { FileText, Users, RefreshCw, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Ad } from '@/hooks/useAdvertiser';

const feedTabs: { id: FeedFilter; label: string }[] = [
  { id: 'recent', label: 'Recents' },
  { id: 'following', label: 'Following' },
  { id: 'forums', label: 'Forums' },
  { id: 'popular', label: 'Popular' },
];

const PULL_THRESHOLD = 80;

export default function FeedPage() {
  const [activeTab, setActiveTab] = useState<FeedFilter>('recent');
  const { 
    items, 
    loading, 
    loadingMore, 
    hasMore, 
    loadMore, 
    refresh,
    followedCategories,
    toggleFollow,
    toggleLike, 
    toggleBookmark, 
    deletePost 
  } = useFeed(activeTab);
  const [sponsoredAds, setSponsoredAds] = useState<Ad[]>([]);
  const { shipUsers, getUserShipCount, respectShip, viewShip, deleteShip, myRespects } = useShips();
  const [shipViewerIndex, setShipViewerIndex] = useState<number | null>(null);
  const fetchedRef = useRef(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  
  // Pull-to-refresh state
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchSponsoredAds = useCallback(async () => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    
    try {
      const { data, error } = await supabase.functions.invoke('get-weighted-ads', {
        body: { count: 5 }
      });
      
      if (!error && data?.ads) {
        setSponsoredAds(data.ads);
      }
    } catch (err) {
      console.error('Failed to fetch sponsored ads:', err);
    }
  }, []);

  useEffect(() => {
    fetchSponsoredAds();
  }, [fetchSponsoredAds]);

  // Infinite scroll observer - don't trigger during initial load
  useEffect(() => {
    // Skip during initial load
    if (loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loadingMore, loadMore, loading]);

  // Pull-to-refresh handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      touchStartY.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (window.scrollY > 0 || isRefreshing) return;
    
    const touchY = e.touches[0].clientY;
    const diff = touchY - touchStartY.current;
    
    if (diff > 0 && touchStartY.current > 0) {
      setPullDistance(Math.min(diff * 0.5, PULL_THRESHOLD + 20));
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance >= PULL_THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(PULL_THRESHOLD);
      await refresh();
      setIsRefreshing(false);
    }
    setPullDistance(0);
    touchStartY.current = 0;
  };

  // Inject sponsored posts every 5 organic items
  const getItemsWithAds = useCallback(() => {
    if (sponsoredAds.length === 0) return items.map(item => ({ type: item.type, data: item }));
    
    const result: Array<{ type: 'post' | 'thread' | 'ad'; data: any }> = [];
    let adIndex = 0;
    
    items.forEach((item, index) => {
      result.push({ type: item.type, data: item });
      
      // Insert ad after every 5 items
      if ((index + 1) % 5 === 0 && adIndex < sponsoredAds.length) {
        result.push({ type: 'ad', data: sponsoredAds[adIndex] });
        adIndex = (adIndex + 1) % sponsoredAds.length;
      }
    });
    
    return result;
  }, [items, sponsoredAds]);

  const feedItems = getItemsWithAds();

  const getEmptyStateProps = () => {
    switch (activeTab) {
      case 'following':
        return {
          icon: Users,
          title: "No posts from people you follow",
          description: "Follow some founders to see their posts here!"
        };
      case 'forums':
        return {
          icon: Users,
          title: "No forum discussions",
          description: followedCategories.length === 0 
            ? "Follow some forum categories to see discussions here!" 
            : "No recent discussions in your followed categories."
        };
      default:
        return {
          icon: FileText,
          title: "No posts yet",
          description: "Be the first to share something with the community!"
        };
    }
  };

  return (
    <AppLayout>
      <div 
        ref={containerRef}
        className="relative min-h-[calc(100vh-64px)]"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Pull-to-refresh indicator */}
        <div 
          className={cn(
            "flex items-center justify-center overflow-hidden transition-all duration-200",
            pullDistance > 0 ? "py-2" : "py-0"
          )}
          style={{ height: pullDistance > 0 ? pullDistance : 0 }}
        >
          <div className={cn(
            "flex items-center gap-2 text-muted-foreground transition-opacity",
            pullDistance >= PULL_THRESHOLD ? "opacity-100" : "opacity-60"
          )}>
            <RefreshCw className={cn(
              "w-5 h-5 transition-transform",
              isRefreshing && "animate-spin",
              pullDistance >= PULL_THRESHOLD && !isRefreshing && "rotate-180"
            )} />
            <span className="text-sm">
              {isRefreshing 
                ? "Refreshing..." 
                : pullDistance >= PULL_THRESHOLD 
                  ? "Release to refresh" 
                  : "Pull to refresh"}
            </span>
          </div>
        </div>

        <div className="px-3 sm:px-4 py-4 space-y-4 pb-24 overflow-x-hidden">
          {/* Ships Tray */}
          <ShipsTray />

          {/* Feed Tabs */}
          <div className="flex items-center gap-2 p-1 bg-secondary/50 rounded-full w-fit overflow-x-auto">
            {feedTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'feed-tab whitespace-nowrap',
                  activeTab === tab.id && 'active'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <PostComposer />

          {/* Feed Items */}
          {loading ? (
            <FeedSkeleton />
          ) : items.length === 0 ? (
            <EmptyState {...getEmptyStateProps()} />
          ) : (
            <div className="space-y-4">
              {feedItems.map((item, index) => {
                const elements: React.ReactNode[] = [];

                if (item.type === 'ad') {
                  elements.push(<SponsoredPostCard key={`ad-${item.data.id}-${index}`} ad={item.data} />);
                } else if (item.type === 'thread') {
                  const thread = item.data as FeedThread;
                  elements.push(
                    <ForumThreadCard
                      key={`thread-${thread.id}`}
                      thread={thread}
                      isFollowing={followedCategories.includes(thread.category.id)}
                      onFollowToggle={toggleFollow}
                    />
                  );
                } else {
                  const post = item.data as FeedPost;
                  const { type, ...postWithoutType } = post;
                  const shipCount = getUserShipCount(post.author.id);
                  elements.push(
                    <PostCard
                      key={post.id}
                      post={postWithoutType}
                      onLike={toggleLike}
                      onBookmark={toggleBookmark}
                      onDelete={deletePost}
                      activeShipsCount={shipCount}
                      onShipClick={shipCount > 0 ? () => {
                        const idx = shipUsers.findIndex(s => s.userId === post.author.id);
                        if (idx >= 0) setShipViewerIndex(idx);
                      } : undefined}
                    />
                  );
                }

                // Insert discover tray after 7th item (only on recent/following tabs)
                if (index === 6 && (activeTab === 'recent' || activeTab === 'following')) {
                  elements.push(<DiscoverFoundersTray key="discover-tray" />);
                }

                return elements;
              })}
              
              {/* Infinite scroll trigger with loading indicator */}
              <div ref={loadMoreRef} className="h-16 flex items-center justify-center">
                {loadingMore && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-sm">Loading more...</span>
                  </div>
                )}
                {!hasMore && items.length > 0 && (
                  <div className="text-sm text-muted-foreground py-4">
                    You've reached the end
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Floating Post Button - Fixed position */}
        <div className="fixed bottom-24 lg:bottom-6 right-6 lg:right-auto lg:left-1/2 lg:translate-x-[320px] z-40">
          <FloatingPostButton />
        </div>
      </div>

      {/* Ship viewer from post avatar clicks */}
      {shipViewerIndex !== null && (
        <ShipViewer
          shipUsers={shipUsers}
          initialUserIndex={shipViewerIndex}
          myRespects={myRespects}
          onRespect={respectShip}
          onView={viewShip}
          onDelete={deleteShip}
          onClose={() => setShipViewerIndex(null)}
        />
      )}
    </AppLayout>
  );
}
