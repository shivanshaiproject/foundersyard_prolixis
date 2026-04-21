import { useState, useEffect } from 'react';
import { AdsLayout } from '@/components/ads/AdsLayout';
import { MetricCard } from '@/components/ads/MetricCard';
import { ClicksChart } from '@/components/ads/ClicksChart';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '@/hooks/useWallet';
import { useAds } from '@/hooks/useAds';
import { Wallet, TrendingUp, BarChart3, Plus, Loader2, Eye, MousePointerClick } from 'lucide-react';

export default function AdsDashboard() {
  const navigate = useNavigate();
  const { wallet, getTotalSpend, loading: walletLoading } = useWallet();
  const { ads, loading: adsLoading, getTotalImpressions, getTotalClicks } = useAds();
  const [totalImpressions, setTotalImpressions] = useState(0);
  const [totalClicks, setTotalClicks] = useState(0);
  const [metricsLoading, setMetricsLoading] = useState(true);

  useEffect(() => {
    const loadMetrics = async () => {
      setMetricsLoading(true);
      const [impressions, clicks] = await Promise.all([
        getTotalImpressions(),
        getTotalClicks()
      ]);
      setTotalImpressions(impressions);
      setTotalClicks(clicks);
      setMetricsLoading(false);
    };
    
    if (!adsLoading) {
      loadMetrics();
    }
  }, [adsLoading, getTotalImpressions, getTotalClicks]);

  const activeAdsCount = ads.filter(ad => ad.status === 'active').length;
  const totalSpend = getTotalSpend();
  const balanceInRupees = wallet ? (wallet.balance / 100).toLocaleString('en-IN') : '0';
  const spendInRupees = (totalSpend / 100).toLocaleString('en-IN');
  const ctr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0.00';

  if (walletLoading || adsLoading) {
    return (
      <AdsLayout>
        <div className="flex items-center justify-center h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdsLayout>
    );
  }

  return (
    <AdsLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Monitor your ad performance</p>
          </div>
          <Button 
            onClick={() => navigate('/ads/create')}
            className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Campaign
          </Button>
        </div>

        {/* Metric Cards - Row 1 */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
          <MetricCard
            title="Wallet Balance"
            value={`₹${balanceInRupees}`}
            subtitle="Available funds"
            icon={Wallet}
            gradient="purple"
            action={
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => navigate('/ads/wallet')}
                className="w-full"
              >
                Add Funds
              </Button>
            }
          />
          
          <MetricCard
            title="Total Spend"
            value={`₹${spendInRupees}`}
            subtitle="All time"
            icon={TrendingUp}
            gradient="blue"
          />
          
          <MetricCard
            title="Active Campaigns"
            value={activeAdsCount.toString()}
            subtitle={ads.length > 0 ? `of ${ads.length} total` : 'No campaigns yet'}
            icon={BarChart3}
            gradient="green"
          />
        </div>

        {/* Metric Cards - Row 2: Performance Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
          <MetricCard
            title="Total Impressions"
            value={metricsLoading ? '...' : totalImpressions.toLocaleString('en-IN')}
            subtitle="Ad views"
            icon={Eye}
            gradient="purple"
          />
          
          <MetricCard
            title="Total Clicks"
            value={metricsLoading ? '...' : totalClicks.toLocaleString('en-IN')}
            subtitle="Ad clicks"
            icon={MousePointerClick}
            gradient="blue"
          />
          
          <MetricCard
            title="Click-Through Rate"
            value={metricsLoading ? '...' : `${ctr}%`}
            subtitle="CTR = Clicks ÷ Impressions"
            icon={TrendingUp}
            gradient="green"
          />
        </div>

        {/* Chart Section */}
        <div className="bg-card border border-border/50 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold">Performance Over Time</h2>
              <p className="text-sm text-muted-foreground">Clicks (bars) & Impressions (line) - Last 30 days</p>
            </div>
          </div>
          <ClicksChart />
        </div>

        {/* Quick Actions */}
        {ads.length === 0 && (
          <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/20 flex items-center justify-center mb-4">
              <BarChart3 className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Ready to reach founders?</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Create your first ad campaign and start reaching verified founders on FoundersYard.
            </p>
            <Button 
              onClick={() => navigate('/ads/create')}
              size="lg"
              className="bg-gradient-to-r from-primary to-primary/80"
            >
              Create Your First Ad
            </Button>
          </div>
        )}
      </div>
    </AdsLayout>
  );
}
