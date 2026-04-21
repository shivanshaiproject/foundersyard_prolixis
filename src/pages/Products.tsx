import { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProductsHeader } from '@/components/products/ProductsHeader';
import { ProductsGrid } from '@/components/products/ProductsGrid';
import { ProductsRightSidebar } from '@/components/products/ProductsRightSidebar';
import { useProducts } from '@/hooks/useProducts';
import { useUserStreak } from '@/hooks/useUserStreak';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

type DateFilter = 'today' | 'yesterday' | 'week';

export default function Products() {
  const [activeFilter, setActiveFilter] = useState<DateFilter>('today');
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const {
    products,
    featuredProducts,
    userUpvotes,
    isLoading,
    toggleUpvote,
    topPicks,
    recommendedTool,
    makerHighlight,
  } = useProducts(activeFilter);

  const { streak } = useUserStreak();

  const handleUpvote = (productId: string) => {
    if (!user) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to upvote products',
      });
      navigate('/auth');
      return;
    }
    toggleUpvote(productId);
  };

  return (
    <>
      <Helmet>
        <title>Discover Products | FoundersYard</title>
        <meta
          name="description"
          content="Discover the best new products launching today. Upvote your favorites and help the founder community find the best tools."
        />
        <meta property="og:title" content="Discover Products | FoundersYard" />
        <meta
          property="og:description"
          content="Discover the best new products launching today. Upvote your favorites and help the founder community find the best tools."
        />
        <link rel="canonical" href="https://builder-vault.lovable.app/products" />
      </Helmet>

      <AppLayout>
        <div className="flex gap-4 lg:gap-6 max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <ProductsHeader
              activeFilter={activeFilter}
              onFilterChange={setActiveFilter}
              streak={streak ? {
                currentStreak: streak.current_streak,
                longestStreak: streak.longest_streak,
                totalActionsToday: streak.total_actions_today,
              } : null}
            />

            <ProductsGrid
              products={products}
              featuredProducts={featuredProducts}
              userUpvotes={userUpvotes}
              onUpvote={handleUpvote}
              isLoading={isLoading}
            />
          </div>

          {/* Right Sidebar - Desktop only */}
          <div className="hidden lg:block w-72 shrink-0">
            <div className="sticky top-20">
              <ProductsRightSidebar
                topPicks={topPicks as any}
                makerHighlight={makerHighlight}
                recommendedTool={recommendedTool as any}
              />
            </div>
          </div>
        </div>

        {/* Floating Submit Button - Mobile only */}
        <Link
          to="/products/new"
          className="lg:hidden fixed bottom-20 right-4 z-40"
        >
          <Button
            size="lg"
            className="h-14 w-14 rounded-full shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all"
          >
            <Plus className="w-6 h-6" />
            <span className="sr-only">Submit Product</span>
          </Button>
        </Link>
      </AppLayout>
    </>
  );
}