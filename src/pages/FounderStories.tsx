import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { BookOpen, ArrowRight, Clock, User, Quote } from 'lucide-react';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import { Button } from '@/components/ui/button';

const stories = [
  {
    title: 'From Idea to Series A in 18 Months',
    excerpt: 'How a conversation on FoundersYard led to finding my co-founder and raising our first round.',
    author: 'Anonymous Founder',
    sector: 'SaaS',
    readTime: '5 min read',
    featured: true,
  },
  {
    title: 'Building in Public: Lessons from 1 Year',
    excerpt: 'Why sharing my journey transparently on FoundersYard accelerated my growth.',
    author: 'Anonymous Founder',
    sector: 'D2C',
    readTime: '4 min read',
    featured: false,
  },
  {
    title: 'The Pivot That Saved My Startup',
    excerpt: 'Community feedback helped me realize my initial idea was flawed. Here is what I learned.',
    author: 'Anonymous Founder',
    sector: 'AI',
    readTime: '6 min read',
    featured: false,
  },
  {
    title: 'Finding My First 100 Customers',
    excerpt: 'Unconventional strategies that worked for my B2B startup, shared first on FoundersYard.',
    author: 'Anonymous Founder',
    sector: 'Fintech',
    readTime: '5 min read',
    featured: false,
  },
  {
    title: 'Remote Team, Global Impact',
    excerpt: 'How I built a 20-person team across 5 countries while bootstrapping.',
    author: 'Anonymous Founder',
    sector: 'EdTech',
    readTime: '7 min read',
    featured: false,
  },
  {
    title: 'The Mental Health Side of Founding',
    excerpt: 'Opening up about founder burnout and how community support helped me recover.',
    author: 'Anonymous Founder',
    sector: 'HealthTech',
    readTime: '6 min read',
    featured: false,
  },
];

export default function FounderStoriesPage() {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Founder Stories – Real Journeys from Indian Entrepreneurs | FoundersYard</title>
        <meta name="description" content="Inspiring stories from real Indian founders – from pivots to fundraising, building in public to scaling teams. Read their journeys on FoundersYard." />
        <link rel="canonical" href="https://foundersyard.in/stories" />
        <meta property="og:title" content="Founder Stories | FoundersYard" />
        <meta property="og:url" content="https://foundersyard.in/stories" />
        <meta name="twitter:card" content="summary" />
      </Helmet>
      <Navbar />
      
      <main className="pt-24 pb-20">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="max-w-4xl mx-auto text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-accent text-foreground font-medium text-sm mb-4 border border-border/50">
              Founder Stories
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
              Real stories from{' '}
              <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                real founders
              </span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Learn from the experiences of founders in our community. 
              The wins, the failures, and everything in between.
            </p>
          </div>

          {/* Featured Story */}
          {stories.filter(s => s.featured).map((story) => (
            <div key={story.title} className="max-w-6xl mx-auto mb-16">
              <div className="rounded-[32px] bg-gradient-to-br from-primary/10 via-card to-primary/5 border border-border/50 p-8 lg:p-12">
                <div className="grid lg:grid-cols-2 gap-8 items-center">
                  <div>
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
                      <BookOpen className="w-3 h-3" />
                      Featured Story
                    </span>
                    <h2 className="text-2xl lg:text-3xl font-bold mb-4">{story.title}</h2>
                    <p className="text-muted-foreground mb-6">{story.excerpt}</p>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-6">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span>{story.author}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>{story.readTime}</span>
                      </div>
                      <span className="px-2 py-1 rounded-full bg-accent text-foreground text-xs">
                        #{story.sector}
                      </span>
                    </div>
                    <Link to="/auth?mode=signup">
                      <Button className="rounded-full group">
                        Read Full Story
                        <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </Link>
                  </div>
                  <div className="relative">
                    <div className="aspect-square rounded-[24px] bg-gradient-to-br from-primary/20 to-primary/5 border border-border/30 flex items-center justify-center">
                      <Quote className="w-24 h-24 text-primary/20" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Stories Grid */}
          <div className="max-w-6xl mx-auto mb-20">
            <h2 className="text-2xl font-bold mb-8">More Stories</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {stories.filter(s => !s.featured).map((story) => (
                <div
                  key={story.title}
                  className="rounded-[24px] bg-card border border-border/50 p-6 hover:border-primary/30 transition-colors group cursor-pointer"
                >
                  <span className="inline-block px-2 py-1 rounded-full bg-accent text-foreground text-xs font-medium mb-4">
                    #{story.sector}
                  </span>
                  <h3 className="font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                    {story.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {story.excerpt}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{story.author}</span>
                    <span>{story.readTime}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Share Your Story CTA */}
          <div className="max-w-4xl mx-auto">
            <div className="rounded-[32px] bg-gradient-to-br from-foreground to-foreground/90 text-background p-8 lg:p-12 text-center">
              <BookOpen className="w-12 h-12 mx-auto mb-6" />
              <h2 className="text-2xl lg:text-3xl font-bold mb-4">Share Your Story</h2>
              <p className="text-background/70 max-w-xl mx-auto mb-8">
                Every founder has a story worth sharing. Join FoundersYard and 
                inspire others with your journey.
              </p>
              <Link to="/auth?mode=signup">
                <Button size="lg" variant="secondary" className="rounded-full px-8 group">
                  Join & Share
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
