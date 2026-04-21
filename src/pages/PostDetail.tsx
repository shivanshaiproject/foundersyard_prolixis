import { useParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { ArrowLeft } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PostCard } from '@/components/feed/PostCard';
import { CommentSection } from '@/components/feed/CommentSection';
import { PostDetailAd } from '@/components/ads/PostDetailAd';
import { PostSkeleton } from '@/components/shared/LoadingSkeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import type { PostWithAuthor } from '@/hooks/usePosts';
import type { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;

// Helper to generate SEO-friendly title from post content
const generatePostTitle = (content: string): string => {
  // Get first line or first 60 chars as title
  const firstLine = content.split('\n')[0].trim();
  if (firstLine.length <= 60) return firstLine;
  return firstLine.substring(0, 57) + '...';
};

// Helper to generate meta description from post content
const generateMetaDescription = (content: string): string => {
  const cleanContent = content.replace(/\n+/g, ' ').trim();
  if (cleanContent.length <= 160) return cleanContent;
  return cleanContent.substring(0, 157) + '...';
};

export default function PostDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<PostWithAuthor | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPost = async () => {
      if (!slug) return;

      setLoading(true);

      // Fetch post by slug
      const { data: postData, error } = await supabase
        .from('posts')
        .select(`*, author:profiles!posts_user_id_fkey(*)`)
        .eq('slug', slug)
        .single();

      if (error || !postData) {
        setPost(null);
        setLoading(false);
        return;
      }

      // Check if user has liked/bookmarked this post
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      let isLiked = false;
      let isBookmarked = false;

      if (currentUser) {
        const [{ data: likes }, { data: bookmarks }] = await Promise.all([
          supabase.from('likes').select('id').eq('post_id', postData.id).eq('user_id', currentUser.id).maybeSingle(),
          supabase.from('bookmarks').select('id').eq('post_id', postData.id).eq('user_id', currentUser.id).maybeSingle(),
        ]);
        isLiked = !!likes;
        isBookmarked = !!bookmarks;
      }

      setPost({
        ...postData,
        author: postData.author as Profile,
        isLiked,
        isBookmarked,
      });
      setLoading(false);
    };

    fetchPost();
  }, [slug]);

  const handleLike = async (postId: string) => {
    if (!post) return;
    
    if (!user) {
      toast({ title: 'Please log in to like posts', description: 'Join FoundersYard to interact with content' });
      navigate('/auth');
      return;
    }

    if (post.isLiked) {
      await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', user.id);
      setPost({ ...post, isLiked: false, likes_count: (post.likes_count || 0) - 1 });
    } else {
      await supabase.from('likes').insert({ post_id: postId, user_id: user.id });
      setPost({ ...post, isLiked: true, likes_count: (post.likes_count || 0) + 1 });
    }
  };

  const handleBookmark = async (postId: string) => {
    if (!post) return;
    
    if (!user) {
      toast({ title: 'Please log in to save posts', description: 'Join FoundersYard to bookmark content' });
      navigate('/auth');
      return;
    }

    if (post.isBookmarked) {
      await supabase.from('bookmarks').delete().eq('post_id', postId).eq('user_id', user.id);
      setPost({ ...post, isBookmarked: false });
    } else {
      await supabase.from('bookmarks').insert({ post_id: postId, user_id: user.id });
      setPost({ ...post, isBookmarked: true });
    }
  };

  // Generate SEO values
  const pageTitle = post ? `${generatePostTitle(post.content)} | FoundersYard` : 'Post | FoundersYard';
  const pageDescription = post ? generateMetaDescription(post.content) : 'View this post on FoundersYard';
  const canonicalUrl = `https://foundersyard.in/post/${slug}`;
  const ogImage = post?.image_url || 'https://foundersyard.in/og-image.png';

  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto p-4">
          <PostSkeleton />
        </div>
      </AppLayout>
    );
  }

  if (!post) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto p-4">
          <EmptyState
            icon={FileText}
            title="Post not found"
            description="This post doesn't exist or has been removed."
          />
        </div>
      </AppLayout>
    );
  }

  // Derive a real heading from post content
  const postHeading = post ? generatePostTitle(post.content) : 'Post';

  return (
    <AppLayout>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <link rel="canonical" href={canonicalUrl} />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="article" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:site_name" content="FoundersYard" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={canonicalUrl} />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <meta name="twitter:image" content={ogImage} />
        
        {/* Article specific */}
        {post && <meta property="article:author" content={post.author.full_name} />}
        {post && <meta property="article:published_time" content={post.created_at || ''} />}
        
        {/* Structured Data - Article */}
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": postHeading,
          "description": pageDescription,
          "url": canonicalUrl,
          "image": ogImage,
          "datePublished": post.created_at,
          "dateModified": post.updated_at || post.created_at,
          "author": {
            "@type": "Person",
            "name": post.author.full_name
          },
          "publisher": {
            "@type": "Organization",
            "name": "FoundersYard",
            "url": "https://foundersyard.in"
          }
        })}</script>
      </Helmet>
      
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <div className="flex items-center gap-3">
          <Link to="/feed">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-semibold line-clamp-1">{postHeading}</h1>
        </div>

        <PostCard
          post={post}
          onLike={handleLike}
          onBookmark={handleBookmark}
        />

        {/* Promoted Ad - Between Post and Comments */}
        <PostDetailAd />

        <div className="bg-card rounded-2xl border border-border/60 p-4">
          <h2 className="font-semibold mb-4">Comments</h2>
          <CommentSection postId={post.id} postAuthorId={post.author.id} />
        </div>
      </div>
    </AppLayout>
  );
}
