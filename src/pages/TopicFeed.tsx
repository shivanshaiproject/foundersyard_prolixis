import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Cpu, Rocket, BarChart3, Package, Megaphone, Sparkles } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PostCard } from '@/components/feed/PostCard';
import { usePosts } from '@/hooks/usePosts';

const categoryInfo: Record<string, { label: string; icon: React.ElementType; className: string; description: string }> = {
  tech: { label: 'Tech', icon: Cpu, className: 'from-purple-500/20 to-purple-600/10', description: 'Technical discussions, engineering, and development' },
  funding: { label: 'Funding', icon: Rocket, className: 'from-emerald-500/20 to-emerald-600/10', description: 'Fundraising, investment, and capital' },
  growth: { label: 'Growth', icon: BarChart3, className: 'from-orange-500/20 to-orange-600/10', description: 'User acquisition and growth strategies' },
  product: { label: 'Product', icon: Package, className: 'from-pink-500/20 to-pink-600/10', description: 'Product development and management' },
  marketing: { label: 'Marketing', icon: Megaphone, className: 'from-blue-500/20 to-blue-600/10', description: 'Marketing strategies and campaigns' },
  ai: { label: 'AI', icon: Sparkles, className: 'from-violet-500/20 to-violet-600/10', description: 'Artificial intelligence and machine learning' },
};

export default function TopicFeedPage() {
  const { category } = useParams<{ category: string }>();
  const { posts: allPosts, loading, toggleLike, toggleBookmark, deletePost } = usePosts(undefined, 'recent');
  
  // Filter posts by category client-side
  const posts = allPosts.filter(post => post.category === category);
  
  const info = categoryInfo[category || ''] || { label: category, icon: Cpu, className: 'from-gray-500/20 to-gray-600/10', description: '' };
  const Icon = info.icon;

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className={`bg-gradient-to-br ${info.className} rounded-2xl p-6 border border-border/30`}>
          <div className="flex items-center gap-4">
            <Link to="/feed" className="p-2 hover:bg-background/50 rounded-xl transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-background/80">
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{info.label}</h1>
                <p className="text-sm text-muted-foreground">{info.description}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Posts */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="skeleton-shimmer h-48 rounded-2xl" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-2xl border border-border/30">
            <Icon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-foreground mb-2">No posts in {info.label} yet</h3>
            <p className="text-sm text-muted-foreground">Be the first to post about this topic!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map(post => (
              <PostCard
                key={post.id}
                post={post}
                onLike={toggleLike}
                onBookmark={toggleBookmark}
                onDelete={deletePost}
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
