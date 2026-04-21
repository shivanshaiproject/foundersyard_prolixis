import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { MessageSquare, Cpu, Rocket, TrendingUp, Users, HelpCircle, ArrowRight } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useForumCategories } from '@/hooks/useForums';

const iconMap: Record<string, React.ElementType> = {
  MessageSquare,
  Cpu,
  Rocket,
  TrendingUp,
  Users,
  HelpCircle,
};

const colorMap: Record<string, string> = {
  blue: 'from-blue-500/20 to-blue-600/10 border-blue-200/50 hover:border-blue-300',
  purple: 'from-purple-500/20 to-purple-600/10 border-purple-200/50 hover:border-purple-300',
  green: 'from-emerald-500/20 to-emerald-600/10 border-emerald-200/50 hover:border-emerald-300',
  orange: 'from-orange-500/20 to-orange-600/10 border-orange-200/50 hover:border-orange-300',
  pink: 'from-pink-500/20 to-pink-600/10 border-pink-200/50 hover:border-pink-300',
  cyan: 'from-cyan-500/20 to-cyan-600/10 border-cyan-200/50 hover:border-cyan-300',
};

const iconColorMap: Record<string, string> = {
  blue: 'text-blue-600',
  purple: 'text-purple-600',
  green: 'text-emerald-600',
  orange: 'text-orange-600',
  pink: 'text-pink-600',
  cyan: 'text-cyan-600',
};

export default function ForumsPage() {
  const { categories, loading } = useForumCategories();

  const pageTitle = 'Community Forums | FoundersYard';
  const pageDescription = 'Join discussions with fellow founders. Explore topics on startup growth, fundraising, product development, marketing, and more.';
  const canonicalUrl = 'https://foundersyard.in/forums';

  return (
    <AppLayout>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <link rel="canonical" href={canonicalUrl} />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:image" content="https://foundersyard.in/og-image.png" />
        <meta property="og:site_name" content="FoundersYard" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={canonicalUrl} />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <meta name="twitter:image" content="https://foundersyard.in/og-image.png" />
      </Helmet>
      
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Community Forums</h1>
          <p className="text-muted-foreground">Join discussions with fellow founders and share your insights</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="skeleton-shimmer h-32 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categories.map(category => {
              const Icon = iconMap[category.icon || 'MessageSquare'] || MessageSquare;
              const colorClass = colorMap[category.color || 'blue'] || colorMap.blue;
              const iconColor = iconColorMap[category.color || 'blue'] || iconColorMap.blue;

              return (
                <Link
                  key={category.id}
                  to={`/forums/${category.slug}`}
                  className={`group bg-gradient-to-br ${colorClass} border rounded-2xl p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-1`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl bg-background/80 ${iconColor}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                          {category.name}
                        </h3>
                        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {category.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {category.threads_count || 0} threads
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
