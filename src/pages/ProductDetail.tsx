import { useParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { ArrowLeft, ExternalLink, Share2, Calendar, Globe } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { UpvoteButton } from '@/components/products/UpvoteButton';
import { MakerProfileCard } from '@/components/products/MakerProfileCard';
import { ProductComments } from '@/components/products/ProductComments';
import { RecommendedToolSlot } from '@/components/products/RecommendedToolSlot';
import { useProduct, useProducts } from '@/hooks/useProducts';
import { useProductComments } from '@/hooks/useProductComments';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export default function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const { product, isLoading, isUpvoted, toggleUpvote } = useProduct(slug || '');
  const { recommendedTool } = useProducts();
  const { comments, isSubmitting, submitComment } = useProductComments(product?.id || '');

  if (isLoading) {
    return (
      <AppLayout>
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex gap-6">
            <div className="flex-1 space-y-6">
              <Skeleton className="h-32 rounded-xl" />
              <Skeleton className="h-64 rounded-xl" />
              <Skeleton className="h-48 rounded-xl" />
            </div>
            <div className="hidden lg:block w-80 space-y-6">
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-48 rounded-xl" />
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!product) {
    return (
      <AppLayout>
        <div className="max-w-6xl mx-auto px-4 py-12 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Product not found</h1>
          <p className="text-muted-foreground mb-4">
            This product may have been removed or doesn't exist.
          </p>
          <Link to="/products">
            <Button>Browse Products</Button>
          </Link>
        </div>
      </AppLayout>
    );
  }

  const handleUpvote = () => {
    if (!user) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to upvote products',
      });
      navigate('/auth');
      return;
    }
    toggleUpvote();
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({
        title: product.name,
        text: product.tagline,
        url,
      });
    } else {
      await navigator.clipboard.writeText(url);
      toast({ title: 'Link copied!' });
    }
  };

  // Check vote visibility (4 hours after midnight IST)
  const launchDate = new Date(product.launch_time);
  const now = new Date();
  const hoursSinceLaunch = (now.getTime() - launchDate.getTime()) / (1000 * 60 * 60);
  const showVotes = hoursSinceLaunch >= 4;

  return (
    <>
      <Helmet>
        <title>{product.name} - {product.tagline} | FoundersYard</title>
        <meta name="description" content={product.tagline} />
        <meta property="og:title" content={`${product.name} | FoundersYard`} />
        <meta property="og:description" content={product.tagline} />
        {product.icon_url && <meta property="og:image" content={product.icon_url} />}
        <link rel="canonical" href={`https://foundersyard.in/products/${product.slug}`} />
        <meta property="og:url" content={`https://foundersyard.in/products/${product.slug}`} />
        <meta property="og:site_name" content="FoundersYard" />
        <meta property="og:type" content="product" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${product.name} | FoundersYard`} />
        <meta name="twitter:description" content={product.tagline} />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Product",
          "name": product.name,
          "description": product.tagline,
          "url": `https://foundersyard.in/products/${product.slug}`,
          ...(product.icon_url ? { "image": product.icon_url } : {}),
          "brand": { "@type": "Organization", "name": "FoundersYard" }
        })}</script>
      </Helmet>

      <AppLayout>
        <div className="max-w-6xl mx-auto px-4 py-6">
          {/* Back Button */}
          <Link
            to="/products"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Products
          </Link>

          <div className="flex gap-6">
            {/* Left Column - Main Content */}
            <div className="flex-1 min-w-0 space-y-6">
              {/* Header */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card border border-border/50 rounded-2xl p-6"
              >
                <div className="flex items-start gap-5">
                  {/* Product Icon */}
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-muted to-muted/50 overflow-hidden border border-border/30 shrink-0">
                    {product.icon_url ? (
                      <img
                        src={product.icon_url}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-muted-foreground">
                        {product.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <h1 className="text-2xl font-bold text-foreground mb-1">
                      {product.name}
                    </h1>
                    <p className="text-lg text-muted-foreground mb-3">
                      {product.tagline}
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                      <Badge variant="secondary" className="capitalize">
                        {product.category.replace('-', ' ')}
                      </Badge>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>
                          Launched {formatDistanceToNow(new Date(product.launch_time), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions - Mobile */}
                <div className="flex items-center gap-3 mt-6 lg:hidden">
                  <UpvoteButton
                    productId={product.id}
                    upvotesCount={product.upvotes_count}
                    isUpvoted={isUpvoted}
                    showVotes={showVotes}
                    onUpvote={handleUpvote}
                    variant="large"
                  />
                  <a
                    href={product.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1"
                  >
                    <Button className="w-full gap-2">
                      <Globe className="w-4 h-4" />
                      Visit Website
                    </Button>
                  </a>
                  <Button variant="outline" size="icon" onClick={handleShare}>
                    <Share2 className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>

              {/* Description */}
              {product.description && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-card border border-border/50 rounded-2xl p-6"
                >
                  <h2 className="text-lg font-semibold text-foreground mb-4">About</h2>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <p className="text-muted-foreground whitespace-pre-wrap">
                      {product.description}
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Screenshots */}
              {product.screenshots && product.screenshots.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-card border border-border/50 rounded-2xl p-6"
                >
                  <h2 className="text-lg font-semibold text-foreground mb-4">Screenshots</h2>
                  <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                    {product.screenshots.map((url, index) => (
                      <a
                        key={index}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0"
                      >
                        <img
                          src={url}
                          alt={`Screenshot ${index + 1}`}
                          className="h-48 rounded-lg border border-border/30 object-cover hover:scale-105 transition-transform"
                        />
                      </a>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Video */}
              {product.video_url && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="bg-card border border-border/50 rounded-2xl p-6"
                >
                  <h2 className="text-lg font-semibold text-foreground mb-4">Demo Video</h2>
                  <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                    <iframe
                      src={product.video_url}
                      className="w-full h-full"
                      allowFullScreen
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    />
                  </div>
                </motion.div>
              )}

              {/* Comments */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-card border border-border/50 rounded-2xl p-6"
              >
                <ProductComments
                  comments={comments}
                  productId={product.id}
                  makerId={product.maker_id}
                  onSubmit={submitComment}
                  isSubmitting={isSubmitting}
                />
              </motion.div>
            </div>

            {/* Right Sidebar - Desktop only */}
            <div className="hidden lg:block w-80 shrink-0">
              <div className="sticky top-20 space-y-6">
                {/* Upvote & Actions */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-card border border-border/50 rounded-xl p-5 space-y-4"
                >
                  <UpvoteButton
                    productId={product.id}
                    upvotesCount={product.upvotes_count}
                    isUpvoted={isUpvoted}
                    showVotes={showVotes}
                    onUpvote={handleUpvote}
                    variant="large"
                  />
                  <a
                    href={product.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button className="w-full gap-2">
                      <ExternalLink className="w-4 h-4" />
                      Visit Website
                    </Button>
                  </a>
                  <Button variant="outline" className="w-full gap-2" onClick={handleShare}>
                    <Share2 className="w-4 h-4" />
                    Share
                  </Button>
                </motion.div>

                {/* Maker Profile */}
                {product.maker && (
                  <MakerProfileCard maker={product.maker} />
                )}

                {/* Recommended Tool (Paid) */}
                <RecommendedToolSlot tool={recommendedTool as any} />
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    </>
  );
}
