import { Link } from 'react-router-dom';
import { AdsLayout } from '@/components/ads/AdsLayout';
import { MousePointer, Eye, Target, CheckCircle } from 'lucide-react';

const benefits = [
  'Reach founders and startup visitors',
  'No fake accounts or bots',
  'Premium, curated platform',
  'Simple and transparent pricing',
];

export default function CreateCampaign() {
  return (
    <AdsLayout>
      <div className="space-y-10 max-w-4xl mx-auto">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text">
            Promote Your Brand on
            <br />
            <span className="text-primary">FoundersYard</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Reach founders, startup enthusiasts, and visitors interested in the startup ecosystem.
          </p>
        </div>

        {/* Value Propositions */}
        <div className="bg-gradient-to-br from-primary/5 via-transparent to-primary/5 border border-primary/20 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Why Advertise Here?</h3>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {benefits.map((benefit) => (
              <div key={benefit} className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-primary shrink-0" />
                <span className="text-muted-foreground">{benefit}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Campaign Type Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* CPC Card */}
          <Link
            to="/ads/create/cpc"
            className="group relative bg-card border border-border hover:border-blue-500/50 rounded-2xl p-6 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10 overflow-hidden"
          >
            {/* Glow Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="relative flex flex-col">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <MousePointer className="w-6 h-6 text-white" />
                </div>
                <span className="px-2.5 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full text-xs font-medium">
                  Recommended
                </span>
              </div>
              
              <h2 className="text-xl font-bold mb-2">Pay Per Click</h2>
              <p className="text-muted-foreground text-sm mb-4">
                Only pay when someone clicks your ad. Great for driving traffic to your website.
              </p>

              <div className="p-3 bg-secondary/50 rounded-xl mb-4">
                <div className="text-xs text-muted-foreground mb-1">Starting from</div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">₹25</span>
                  <span className="text-sm text-muted-foreground">/click</span>
                </div>
              </div>

              <ul className="space-y-2 text-sm text-muted-foreground mb-4">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-blue-500" />
                  Performance-based billing
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-blue-500" />
                  Sidebar placement
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-blue-500" />
                  Set your own bid
                </li>
              </ul>
              
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-medium text-sm group-hover:gap-3 transition-all">
                Get Started
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </div>
          </Link>

          {/* CPM Card */}
          <Link
            to="/ads/create/cpm"
            className="group relative bg-card border border-border hover:border-amber-500/50 rounded-2xl p-6 transition-all duration-300 hover:shadow-xl hover:shadow-amber-500/10 overflow-hidden"
          >
            {/* Glow Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="relative flex flex-col">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                  <Eye className="w-6 h-6 text-white" />
                </div>
                <span className="px-2.5 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full text-xs font-medium">
                  Brand Awareness
                </span>
              </div>
              
              <h2 className="text-xl font-bold mb-2">Pay Per View</h2>
              <p className="text-muted-foreground text-sm mb-4">
                Get visibility in the main feed. Great for brand awareness and product launches.
              </p>

              <div className="p-3 bg-secondary/50 rounded-xl mb-4">
                <div className="text-xs text-muted-foreground mb-1">Rate</div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">₹300</span>
                  <span className="text-sm text-muted-foreground">/1,000 views</span>
                </div>
              </div>

              <ul className="space-y-2 text-sm text-muted-foreground mb-4">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-amber-500" />
                  Premium feed placement
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-amber-500" />
                  Set your impression budget
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-amber-500" />
                  Native ad format
                </li>
              </ul>
              
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-medium text-sm group-hover:gap-3 transition-all">
                Get Started
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </AdsLayout>
  );
}