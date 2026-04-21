import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Users, MessageSquare, Hash, Bell, Shield, Sparkles, Calendar, TrendingUp, ArrowRight } from 'lucide-react';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import { Button } from '@/components/ui/button';

const features = [
  {
    icon: Users,
    title: 'Smart Networking',
    description: 'Connect with founders who match your industry, stage, and interests. Our intelligent matching helps you find the right people faster.',
    color: 'bg-primary/10 text-primary',
  },
  {
    icon: MessageSquare,
    title: 'Curated Feed',
    description: 'No noise, no spam. See posts from verified founders, filtered by topics you care about. Quality conversations only.',
    color: 'bg-emerald-500/10 text-emerald-600',
  },
  {
    icon: Hash,
    title: 'Topic Forums',
    description: 'Deep-dive into specific topics like funding, growth, tech, and more. Get answers from founders who have been there.',
    color: 'bg-blue-500/10 text-blue-600',
  },
  {
    icon: Calendar,
    title: 'Events & Meetups',
    description: 'Join virtual and in-person events. Network with founders, attend workshops, and learn from industry experts.',
    color: 'bg-orange-500/10 text-orange-600',
  },
  {
    icon: Shield,
    title: 'Verified Profiles',
    description: 'Trust matters. Our verification system ensures you are connecting with real founders building real companies.',
    color: 'bg-purple-500/10 text-purple-600',
  },
  {
    icon: TrendingUp,
    title: 'Trending Topics',
    description: 'Stay on top of what the founder community is discussing. Discover trending hashtags and join the conversation.',
    color: 'bg-pink-500/10 text-pink-600',
  },
  {
    icon: Bell,
    title: 'Smart Notifications',
    description: 'Stay updated without the overwhelm. Get notified about what matters—likes, comments, and connection requests.',
    color: 'bg-amber-500/10 text-amber-600',
  },
  {
    icon: Sparkles,
    title: 'VIP Access',
    description: 'Premium features for serious founders. Get early access to events, exclusive content, and priority support.',
    color: 'bg-cyan-500/10 text-cyan-600',
  },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Features – Networking, Forums, Events & More | FoundersYard</title>
        <meta name="description" content="Explore FoundersYard features: smart networking, curated feed, topic forums, founder events, verified profiles, and VIP access for startup founders." />
        <link rel="canonical" href="https://foundersyard.in/features" />
        <meta property="og:title" content="FoundersYard Features" />
        <meta property="og:description" content="Everything you need to grow as a founder – networking, forums, events, and more." />
        <meta property="og:url" content="https://foundersyard.in/features" />
        <meta name="twitter:card" content="summary" />
      </Helmet>
      <Navbar />
      
      <main className="pt-24 pb-20">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="max-w-4xl mx-auto text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-accent text-foreground font-medium text-sm mb-4 border border-border/50">
              Features
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
              Everything you need to{' '}
              <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">grow</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              FoundersYard is packed with features designed specifically for founders. 
              No fluff, just tools that help you build and connect.
            </p>
          </div>

          {/* Features Grid */}
          <div className="max-w-6xl mx-auto mb-20">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-[24px] bg-card border border-border/50 p-6 hover:border-primary/30 transition-all duration-300 hover:shadow-lg group"
                >
                  <div className={`p-3 rounded-2xl w-fit mb-4 ${feature.color}`}>
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA Section */}
          <div className="max-w-4xl mx-auto">
            <div className="rounded-[32px] bg-gradient-to-br from-foreground to-foreground/90 text-background p-8 lg:p-12 text-center">
              <h2 className="text-2xl lg:text-3xl font-bold mb-4">Ready to join?</h2>
              <p className="text-background/70 max-w-xl mx-auto mb-8">
                Start connecting with founders who understand your journey. 
                It's free to get started.
              </p>
              <Link to="/auth?mode=signup">
                <Button size="lg" variant="secondary" className="rounded-full px-8 group">
                  Get Started Free
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
