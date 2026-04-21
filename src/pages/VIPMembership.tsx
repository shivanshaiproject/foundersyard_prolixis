import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Crown, Check, Sparkles, Zap, Users, Calendar, Shield, Star, ArrowRight } from 'lucide-react';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import { Button } from '@/components/ui/button';

const vipBenefits = [
  {
    icon: Crown,
    title: 'VIP Badge',
    description: 'Stand out with an exclusive VIP badge on your profile',
  },
  {
    icon: Calendar,
    title: 'Priority Event Access',
    description: 'Get early access and reserved spots at all events',
  },
  {
    icon: Users,
    title: 'Exclusive Network',
    description: 'Connect with other VIP founders in a private circle',
  },
  {
    icon: Zap,
    title: 'Priority Support',
    description: 'Get faster responses from our support team',
  },
  {
    icon: Shield,
    title: 'Advanced Verification',
    description: 'Fast-track verification for your profile',
  },
  {
    icon: Star,
    title: 'Featured Profile',
    description: 'Get highlighted in search and discovery',
  },
];

const testimonials = [
  {
    name: 'Priya Sharma',
    role: 'Founder, TechStart',
    quote: 'VIP membership has been invaluable. The exclusive events alone are worth it.',
  },
  {
    name: 'Rahul Verma',
    role: 'CEO, GrowthLabs',
    quote: 'The priority support and networking opportunities have helped me close key partnerships.',
  },
];

export default function VIPMembershipPage() {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>VIP Membership – Premium Access for Founders | FoundersYard</title>
        <meta name="description" content="Upgrade to VIP membership on FoundersYard. Get a VIP badge, priority event access, exclusive networking, and premium support for serious founders." />
        <link rel="canonical" href="https://foundersyard.in/vip" />
        <meta property="og:title" content="VIP Membership | FoundersYard" />
        <meta property="og:url" content="https://foundersyard.in/vip" />
        <meta name="twitter:card" content="summary" />
      </Helmet>
      <Navbar />
      
      <main className="pt-24 pb-20">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="max-w-4xl mx-auto text-center mb-16">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 text-amber-600 font-medium text-sm mb-4 border border-amber-500/20">
              <Crown className="w-4 h-4" />
              VIP Membership
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
              Elevate your{' '}
              <span className="bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
                founder journey
              </span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Unlock premium features and exclusive access designed for serious founders 
              who want to maximize their network and growth.
            </p>
          </div>

          {/* Pricing Card */}
          <div className="max-w-lg mx-auto mb-20">
            <div className="rounded-[32px] bg-gradient-to-br from-amber-500/10 via-card to-orange-500/10 border-2 border-amber-500/30 p-8 lg:p-10 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-500/20 to-transparent rounded-bl-full" />
              
              <div className="relative">
                <div className="flex items-center gap-3 mb-6">
                  <Crown className="w-8 h-8 text-amber-500" />
                  <span className="text-xl font-bold">VIP Membership</span>
                </div>
                
                <div className="mb-8">
                  <span className="text-5xl font-bold">Coming Soon</span>
                </div>

                <ul className="space-y-4 mb-8">
                  {vipBenefits.map((benefit) => (
                    <li key={benefit.title} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-medium text-foreground">{benefit.title}</span>
                        <p className="text-sm text-muted-foreground">{benefit.description}</p>
                      </div>
                    </li>
                  ))}
                </ul>

                <Link to="/auth?mode=signup">
                  <Button size="lg" className="w-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white group">
                    Join Waitlist
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Benefits Grid */}
          <div className="max-w-6xl mx-auto mb-20">
            <h2 className="text-2xl font-bold mb-8 text-center">VIP Benefits</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {vipBenefits.map((benefit) => (
                <div
                  key={benefit.title}
                  className="rounded-[24px] bg-card border border-border/50 p-6 hover:border-amber-500/30 transition-colors"
                >
                  <div className="p-3 rounded-2xl bg-amber-500/10 w-fit mb-4">
                    <benefit.icon className="w-6 h-6 text-amber-600" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{benefit.title}</h3>
                  <p className="text-sm text-muted-foreground">{benefit.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Testimonials */}
          <div className="max-w-4xl mx-auto mb-20">
            <h2 className="text-2xl font-bold mb-8 text-center">What VIP Members Say</h2>
            <div className="grid sm:grid-cols-2 gap-6">
              {testimonials.map((testimonial) => (
                <div
                  key={testimonial.name}
                  className="rounded-[24px] bg-card border border-border/50 p-6"
                >
                  <Sparkles className="w-8 h-8 text-amber-500 mb-4" />
                  <p className="text-foreground mb-4 italic">"{testimonial.quote}"</p>
                  <div>
                    <p className="font-semibold text-foreground">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* FAQ */}
          <div className="max-w-4xl mx-auto">
            <div className="rounded-[32px] bg-gradient-to-br from-primary/10 via-accent to-primary/5 border border-border/50 p-8 lg:p-12 text-center">
              <h2 className="text-2xl lg:text-3xl font-bold mb-4">Questions about VIP?</h2>
              <p className="text-muted-foreground max-w-xl mx-auto mb-8">
                VIP membership is coming soon. Join FoundersYard now to be notified 
                when VIP access becomes available.
              </p>
              <Link to="/help">
                <Button variant="outline" size="lg" className="rounded-full px-8">
                  Visit Help Center
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
