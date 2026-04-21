import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Users, Target, Rocket, Heart, Building2, Globe } from 'lucide-react';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>About FoundersYard – Empowering Startup Founders Across India</title>
        <meta name="description" content="FoundersYard is India's premier social platform for entrepreneurs, connecting 1,000+ founders across AI, SaaS, Fintech, and more." />
        <link rel="canonical" href="https://foundersyard.in/about" />
        <meta property="og:title" content="About FoundersYard" />
        <meta property="og:description" content="India's premier social platform for entrepreneurs and startup founders." />
        <meta property="og:url" content="https://foundersyard.in/about" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary" />
      </Helmet>
      <Navbar />
      
      <main className="pt-24 pb-20">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="max-w-4xl mx-auto text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-accent text-foreground font-medium text-sm mb-4 border border-border/50">
              About Us
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
              Empowering <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">Founders</span> Everywhere
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              FoundersYard is the premier social platform for entrepreneurs, startup founders, 
              and innovators building the future.
            </p>
          </div>

          {/* Mission Section */}
          <div className="max-w-6xl mx-auto mb-20">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 rounded-2xl bg-primary/10">
                    <Target className="w-6 h-6 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold">Our Mission</h2>
                </div>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  We believe that building a successful company shouldn't be a lonely journey. 
                  Our mission is to connect founders with each other, enabling them to share experiences, 
                  seek advice, find co-founders, and build lasting professional relationships.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  FoundersYard is where real conversations happen—no gatekeeping, no noise, 
                  just genuine support from people who understand the entrepreneurial journey.
                </p>
              </div>
              <div className="rounded-[32px] bg-gradient-to-br from-primary/10 via-accent to-primary/5 border border-border/50 p-8 lg:p-12">
                <div className="grid grid-cols-2 gap-6">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-foreground mb-2">1,247+</div>
                    <div className="text-sm text-muted-foreground">Verified Founders</div>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-foreground mb-2">48</div>
                    <div className="text-sm text-muted-foreground">Cities Connected</div>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-foreground mb-2">324</div>
                    <div className="text-sm text-muted-foreground">Startups Launched</div>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-foreground mb-2">11</div>
                    <div className="text-sm text-muted-foreground">Industries</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Community Section */}
          <div className="max-w-6xl mx-auto mb-20">
            <div className="rounded-[32px] bg-card border border-border/50 p-8 lg:p-12">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-2xl bg-emerald-500/10">
                  <Users className="w-6 h-6 text-emerald-600" />
                </div>
                <h2 className="text-2xl font-bold">Our Community</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed mb-8 max-w-3xl">
                We're home to thousands of founders from all stages—from those just starting with an idea 
                to serial entrepreneurs who've successfully scaled multiple companies. Our community spans 
                across industries including AI, SaaS, Fintech, E-commerce, HealthTech, and more.
              </p>
              <div className="flex flex-wrap gap-3">
                {['AI', 'SaaS', 'D2C', 'Fintech', 'EdTech', 'HealthTech', 'CleanTech', 'Robotics', 'Logistics'].map((sector) => (
                  <span key={sector} className="px-4 py-2 rounded-full bg-accent text-foreground text-sm font-medium border border-border/50">
                    #{sector}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* What We Offer */}
          <div className="max-w-6xl mx-auto mb-20">
            <div className="text-center mb-12">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="p-3 rounded-2xl bg-orange-500/10">
                  <Rocket className="w-6 h-6 text-orange-600" />
                </div>
              </div>
              <h2 className="text-3xl font-bold mb-4">What We Offer</h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { title: 'Networking', desc: 'Connect with fellow founders and industry experts' },
                { title: 'Forums', desc: 'Engage in deep discussions about startup challenges' },
                { title: 'Events', desc: 'Join virtual and in-person founder meetups' },
                { title: 'Resources', desc: 'Access curated content to help you grow' },
                { title: 'Opportunities', desc: 'Find co-founders, investors, and collaborators' },
                { title: 'Community', desc: 'Build lasting relationships with like-minded builders' },
              ].map((item) => (
                <div key={item.title} className="rounded-2xl bg-card border border-border/50 p-6 hover:border-primary/30 transition-colors">
                  <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Values */}
          <div className="max-w-6xl mx-auto mb-20">
            <div className="text-center mb-12">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="p-3 rounded-2xl bg-pink-500/10">
                  <Heart className="w-6 h-6 text-pink-600" />
                </div>
              </div>
              <h2 className="text-3xl font-bold mb-4">Our Values</h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { title: 'Authenticity', desc: 'Real conversations from real founders' },
                { title: 'Support', desc: 'We lift each other up' },
                { title: 'Growth', desc: 'Continuous learning and improvement' },
                { title: 'Privacy', desc: 'Your data stays protected' },
              ].map((value) => (
                <div key={value.title} className="rounded-2xl bg-accent/50 border border-border/50 p-6 text-center">
                  <h3 className="font-semibold text-foreground mb-2">{value.title}</h3>
                  <p className="text-sm text-muted-foreground">{value.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Made by Prolixis */}
          <div className="max-w-4xl mx-auto">
            <div className="rounded-[32px] bg-gradient-to-br from-foreground to-foreground/90 text-background p-8 lg:p-12 text-center">
              <div className="flex items-center justify-center gap-3 mb-6">
                <Building2 className="w-8 h-8" />
              </div>
              <h2 className="text-2xl lg:text-3xl font-bold mb-4">Made by Prolixis</h2>
              <p className="text-background/70 max-w-xl mx-auto mb-6">
                FoundersYard is proudly built and maintained by Prolixis, 
                dedicated to creating tools and platforms that empower entrepreneurs worldwide.
              </p>
              <div className="flex items-center justify-center gap-2 text-background/60">
                <Globe className="w-5 h-5" />
                <span>Building the future, one founder at a time</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
