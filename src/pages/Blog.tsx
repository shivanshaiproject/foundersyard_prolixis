import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Newspaper, ArrowRight, Clock, Tag, TrendingUp } from 'lucide-react';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import { Button } from '@/components/ui/button';

const blogPosts = [
  {
    title: 'The State of Indian Startups in 2025',
    excerpt: 'A deep dive into funding trends, emerging sectors, and what founders need to know.',
    category: 'Industry Insights',
    date: 'Coming Soon',
    readTime: '8 min read',
    featured: true,
  },
  {
    title: '10 Mistakes First-Time Founders Make',
    excerpt: 'Lessons from our community on what to avoid when starting your first company.',
    category: 'Founder Tips',
    date: 'Coming Soon',
    readTime: '6 min read',
    featured: false,
  },
  {
    title: 'Building a Remote-First Culture',
    excerpt: 'How to create strong team culture when everyone works from different locations.',
    category: 'Team Building',
    date: 'Coming Soon',
    readTime: '5 min read',
    featured: false,
  },
  {
    title: 'The Art of the Cold Email',
    excerpt: 'Templates and strategies that actually work for reaching investors and partners.',
    category: 'Growth',
    date: 'Coming Soon',
    readTime: '7 min read',
    featured: false,
  },
  {
    title: 'When to Bootstrap vs Raise VC',
    excerpt: 'A framework for deciding the right funding path for your startup.',
    category: 'Fundraising',
    date: 'Coming Soon',
    readTime: '6 min read',
    featured: false,
  },
  {
    title: 'Product-Market Fit: Real Stories',
    excerpt: 'How founders in our community found their product-market fit.',
    category: 'Product',
    date: 'Coming Soon',
    readTime: '9 min read',
    featured: false,
  },
];

const categories = ['All', 'Industry Insights', 'Founder Tips', 'Growth', 'Fundraising', 'Product', 'Team Building'];

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Blog – Startup Insights & Founder Tips | FoundersYard</title>
        <meta name="description" content="Read startup insights, founder tips, fundraising strategies, and growth tactics from the FoundersYard community." />
        <link rel="canonical" href="https://foundersyard.in/blog" />
        <meta property="og:title" content="FoundersYard Blog" />
        <meta property="og:url" content="https://foundersyard.in/blog" />
        <meta name="twitter:card" content="summary" />
      </Helmet>
      <Navbar />
      
      <main className="pt-24 pb-20">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="max-w-4xl mx-auto text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-accent text-foreground font-medium text-sm mb-4 border border-border/50">
              Blog
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
              Insights for{' '}
              <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                founders
              </span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Articles, guides, and insights to help you build and grow your startup.
            </p>
          </div>

          {/* Categories */}
          <div className="max-w-6xl mx-auto mb-12">
            <div className="flex flex-wrap gap-2 justify-center">
              {categories.map((category) => (
                <button
                  key={category}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    category === 'All'
                      ? 'bg-foreground text-background'
                      : 'bg-accent text-foreground hover:bg-accent/80'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Featured Post */}
          {blogPosts.filter(p => p.featured).map((post) => (
            <div key={post.title} className="max-w-6xl mx-auto mb-16">
              <div className="rounded-[32px] bg-gradient-to-br from-primary/10 via-card to-primary/5 border border-border/50 p-8 lg:p-12">
                <div className="grid lg:grid-cols-2 gap-8 items-center">
                  <div>
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
                      <TrendingUp className="w-3 h-3" />
                      Featured
                    </span>
                    <h2 className="text-2xl lg:text-3xl font-bold mb-4">{post.title}</h2>
                    <p className="text-muted-foreground mb-6">{post.excerpt}</p>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-6">
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4" />
                        <span>{post.category}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>{post.readTime}</span>
                      </div>
                    </div>
                    <Button className="rounded-full" disabled>
                      Coming Soon
                    </Button>
                  </div>
                  <div className="relative">
                    <div className="aspect-video rounded-[24px] bg-gradient-to-br from-primary/20 to-primary/5 border border-border/30 flex items-center justify-center">
                      <Newspaper className="w-16 h-16 text-primary/20" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Blog Grid */}
          <div className="max-w-6xl mx-auto mb-20">
            <h2 className="text-2xl font-bold mb-8">Latest Articles</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {blogPosts.filter(p => !p.featured).map((post) => (
                <div
                  key={post.title}
                  className="rounded-[24px] bg-card border border-border/50 p-6 hover:border-primary/30 transition-colors group"
                >
                  <div className="aspect-video rounded-xl bg-gradient-to-br from-accent to-background border border-border/30 mb-4 flex items-center justify-center">
                    <Newspaper className="w-8 h-8 text-muted-foreground/30" />
                  </div>
                  <span className="inline-block px-2 py-1 rounded-full bg-accent text-foreground text-xs font-medium mb-3">
                    {post.category}
                  </span>
                  <h3 className="font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                    {post.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {post.excerpt}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{post.date}</span>
                    <span>{post.readTime}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Newsletter CTA */}
          <div className="max-w-4xl mx-auto">
            <div className="rounded-[32px] bg-gradient-to-br from-foreground to-foreground/90 text-background p-8 lg:p-12 text-center">
              <Newspaper className="w-12 h-12 mx-auto mb-6" />
              <h2 className="text-2xl lg:text-3xl font-bold mb-4">Stay Updated</h2>
              <p className="text-background/70 max-w-xl mx-auto mb-8">
                Get the latest founder insights delivered to your inbox. 
                Join FoundersYard to access our full content library.
              </p>
              <Link to="/auth?mode=signup">
                <Button size="lg" variant="secondary" className="rounded-full px-8 group">
                  Join FoundersYard
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
