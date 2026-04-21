import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AdsLayout } from '@/components/ads/AdsLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAds, Ad } from '@/hooks/useAds';
import { 
  ArrowLeft, 
  Loader2, 
  Eye, 
  MousePointer2, 
  TrendingUp,
  IndianRupee,
  ExternalLink,
  BarChart3,
  Target
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

export default function AdAnalytics() {
  const { adId } = useParams<{ adId: string }>();
  const navigate = useNavigate();
  const { getAdStats, getAdImpressionsOverTime, getAdClicksOverTime } = useAds();
  
  const [loading, setLoading] = useState(true);
  const [ad, setAd] = useState<Ad | null>(null);
  const [stats, setStats] = useState<{ clicks: number; impressions: number; ctr: number; spend: number } | null>(null);
  const [impressionsData, setImpressionsData] = useState<{ date: string; impressions: number }[]>([]);
  const [clicksData, setClicksData] = useState<{ date: string; clicks: number; spend: number }[]>([]);

  useEffect(() => {
    if (!adId) return;
    
    const loadData = async () => {
      setLoading(true);
      try {
        const [statsResult, impressions, clicks] = await Promise.all([
          getAdStats(adId),
          getAdImpressionsOverTime(adId, 30),
          getAdClicksOverTime(adId, 30)
        ]);
        
        if (statsResult) {
          setAd(statsResult.ad);
          setStats({
            clicks: statsResult.clicks,
            impressions: statsResult.impressions,
            ctr: statsResult.ctr,
            spend: statsResult.spend
          });
        }
        setImpressionsData(impressions);
        setClicksData(clicks);
      } catch (error) {
        console.error('Error loading ad analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [adId, getAdStats, getAdImpressionsOverTime, getAdClicksOverTime]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Active</Badge>;
      case 'paused':
        return <Badge className="bg-gray-500/10 text-gray-500 border-gray-500/20">Paused</Badge>;
      case 'exhausted':
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Exhausted</Badge>;
      case 'pending_approval':
        return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">Pending</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <AdsLayout>
        <div className="flex items-center justify-center h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdsLayout>
    );
  }

  if (!ad || !stats) {
    return (
      <AdsLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Ad not found</p>
          <Button onClick={() => navigate('/ads/campaigns')} className="mt-4">
            Back to Campaigns
          </Button>
        </div>
      </AdsLayout>
    );
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  };

  return (
    <AdsLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/ads/campaigns')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight">Campaign Analytics</h1>
            <p className="text-muted-foreground text-sm">Performance data for the last 30 days</p>
          </div>
        </div>

        {/* Ad Info Card */}
        <Card className="border-border/50">
          <CardContent className="p-6">
            <div className="flex gap-4">
              {ad.image_url && (
                <img 
                  src={ad.image_url} 
                  alt="" 
                  className="w-24 h-24 rounded-xl object-cover shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  {getStatusBadge(ad.status)}
                  <Badge variant="outline" className="gap-1">
                    {ad.billing_type === 'cpm' ? <Eye className="w-3 h-3" /> : <MousePointer2 className="w-3 h-3" />}
                    {ad.billing_type?.toUpperCase() || 'CPC'}
                  </Badge>
                </div>
                <h2 className="font-semibold text-lg line-clamp-2 mb-2">{ad.headline}</h2>
                <a 
                  href={ad.destination_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  {new URL(ad.destination_url).hostname}
                </a>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Eye className="w-4 h-4" />
                <span className="text-xs font-medium">Impressions</span>
              </div>
              <p className="text-2xl font-bold">{stats.impressions.toLocaleString('en-IN')}</p>
            </CardContent>
          </Card>
          
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <MousePointer2 className="w-4 h-4" />
                <span className="text-xs font-medium">Clicks</span>
              </div>
              <p className="text-2xl font-bold">{stats.clicks.toLocaleString('en-IN')}</p>
            </CardContent>
          </Card>
          
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs font-medium">CTR</span>
              </div>
              <p className="text-2xl font-bold">{stats.ctr.toFixed(2)}%</p>
            </CardContent>
          </Card>
          
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <IndianRupee className="w-4 h-4" />
                <span className="text-xs font-medium">Total Spend</span>
              </div>
              <p className="text-2xl font-bold">₹{(stats.spend / 100).toLocaleString('en-IN')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Additional Stats for specific billing types */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ad.billing_type === 'cpm' && (
            <Card className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Target className="w-4 h-4" />
                  <span className="text-xs font-medium">Impression Progress</span>
                </div>
                <p className="text-lg font-bold">
                  {ad.impressions_count.toLocaleString('en-IN')} / {(ad.impressions_limit || 0).toLocaleString('en-IN')}
                </p>
                <div className="w-full bg-muted rounded-full h-2 mt-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(((ad.impressions_count || 0) / (ad.impressions_limit || 1)) * 100, 100)}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          )}
          
          {ad.billing_type === 'cpc' && stats.clicks > 0 && (
            <Card className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <BarChart3 className="w-4 h-4" />
                  <span className="text-xs font-medium">Average CPC</span>
                </div>
                <p className="text-2xl font-bold">
                  ₹{((stats.spend / 100) / stats.clicks).toFixed(2)}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Impressions Chart */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" />
              Impressions Over Time
            </CardTitle>
            <CardDescription>Daily impressions for the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={impressionsData}>
                  <defs>
                    <linearGradient id="impressionGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={formatDate}
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    labelFormatter={formatDate}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="impressions" 
                    stroke="hsl(var(--primary))" 
                    fill="url(#impressionGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Clicks Chart */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MousePointer2 className="w-5 h-5 text-emerald-500" />
              Clicks Over Time
            </CardTitle>
            <CardDescription>Daily clicks for the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={clicksData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={formatDate}
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    labelFormatter={formatDate}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="clicks" 
                    stroke="hsl(142, 76%, 36%)" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(142, 76%, 36%)', strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdsLayout>
  );
}
