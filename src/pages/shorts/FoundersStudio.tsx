import { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Plus, 
  ArrowLeft, 
  Eye, 
  Heart, 
  Share2, 
  Film,
  MoreVertical,
  Trash2,
  EyeOff,
  Check,
  TrendingUp,
  BarChart3,
  Users,
  Clock,
  Calendar,
  Play,
  Settings,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CreateShortModal } from '@/components/shorts/CreateShortModal';
import { useShortsStudio } from '@/hooks/useShorts';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow, format, subDays } from 'date-fns';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

export default function FoundersStudio() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { shorts, analytics, loading, deleteShort, togglePublish } = useShortsStudio();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [shortToDelete, setShortToDelete] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Redirect if not logged in
  if (!authLoading && !user) {
    navigate('/auth');
    return null;
  }

  const handleDeleteClick = (shortId: string) => {
    setShortToDelete(shortId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (shortToDelete) {
      await deleteShort(shortToDelete);
      setShortToDelete(null);
    }
    setDeleteDialogOpen(false);
  };

  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  // Generate mock chart data based on actual shorts
  const viewsChartData = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      return {
        date: format(date, 'EEE'),
        views: Math.floor(Math.random() * (analytics.total_views / 7 || 100)),
        likes: Math.floor(Math.random() * (analytics.total_likes / 7 || 50)),
      };
    });
  }, [analytics]);

  const engagementData = useMemo(() => [
    { name: 'Views', value: analytics.total_views, color: 'hsl(var(--primary))' },
    { name: 'Likes', value: analytics.total_likes, color: 'hsl(220, 90%, 56%)' },
    { name: 'Shares', value: analytics.total_shares, color: 'hsl(142, 76%, 36%)' },
  ], [analytics]);

  const performanceData = useMemo(() => {
    return shorts.slice(0, 5).map(short => ({
      name: short.title.slice(0, 15) + (short.title.length > 15 ? '...' : ''),
      views: short.views_count,
      likes: short.likes_count,
    }));
  }, [shorts]);

  const engagementRate = analytics.total_views > 0 
    ? ((analytics.total_likes + analytics.total_shares) / analytics.total_views * 100).toFixed(1)
    : '0.0';

  const avgViewsPerShort = analytics.shorts_count > 0
    ? Math.round(analytics.total_views / analytics.shorts_count)
    : 0;

  return (
    <>
      <Helmet>
        <title>Founders Studio | FoundersYard</title>
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/feed" className="p-2 hover:bg-muted rounded-full transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5">
                  <Zap className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">Founders Studio</h1>
                  <p className="text-xs text-muted-foreground">Manage your content & analytics</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate('/shorts')}>
                <Play className="w-4 h-4 mr-2" />
                View Shorts
              </Button>
              <Button onClick={() => setCreateModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Upload Short
              </Button>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-6 space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <Card className="col-span-1">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
                    <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xl font-bold">{formatCount(analytics.total_views)}</p>
                    <p className="text-xs text-muted-foreground">Views</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="col-span-1">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30">
                    <Heart className="w-4 h-4 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="text-xl font-bold">{formatCount(analytics.total_likes)}</p>
                    <p className="text-xs text-muted-foreground">Likes</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="col-span-1">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
                    <Share2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-xl font-bold">{formatCount(analytics.total_shares)}</p>
                    <p className="text-xs text-muted-foreground">Shares</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="col-span-1">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/30">
                    <Film className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-xl font-bold">{analytics.shorts_count}</p>
                    <p className="text-xs text-muted-foreground">Shorts</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="col-span-1">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-orange-100 dark:bg-orange-900/30">
                    <TrendingUp className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <p className="text-xl font-bold">{engagementRate}%</p>
                    <p className="text-xs text-muted-foreground">Engagement</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="col-span-1">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-cyan-100 dark:bg-cyan-900/30">
                    <BarChart3 className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-xl font-bold">{formatCount(avgViewsPerShort)}</p>
                    <p className="text-xs text-muted-foreground">Avg Views</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-flex">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Views Over Time Chart */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Views & Likes (7 Days)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={viewsChartData}>
                          <defs>
                            <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorLikes" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(220, 90%, 56%)" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="hsl(220, 90%, 56%)" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="date" className="text-xs" />
                          <YAxis className="text-xs" />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="views" 
                            stroke="hsl(var(--primary))" 
                            fillOpacity={1} 
                            fill="url(#colorViews)" 
                          />
                          <Area 
                            type="monotone" 
                            dataKey="likes" 
                            stroke="hsl(220, 90%, 56%)" 
                            fillOpacity={1} 
                            fill="url(#colorLikes)" 
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Engagement Distribution */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Engagement Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[250px] flex items-center justify-center">
                      {analytics.total_views > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={engagementData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={100}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {engagementData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px'
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="text-center text-muted-foreground">
                          <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p>No data yet</p>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-center gap-4 mt-2">
                      {engagementData.map((item) => (
                        <div key={item.name} className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-xs text-muted-foreground">{item.name}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Top Performing Shorts */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Top Performing Shorts</CardTitle>
                  <CardDescription>Your best performing content</CardDescription>
                </CardHeader>
                <CardContent>
                  {performanceData.length > 0 ? (
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={performanceData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis type="number" className="text-xs" />
                          <YAxis dataKey="name" type="category" width={100} className="text-xs" />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }}
                          />
                          <Bar dataKey="views" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Film className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>Upload your first short to see performance data</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Content Tab */}
            <TabsContent value="content" className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Your Shorts</CardTitle>
                    <CardDescription>Manage and organize your content</CardDescription>
                  </div>
                  <Button onClick={() => setCreateModalOpen(true)} size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    New Short
                  </Button>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="space-y-2">
                          <Skeleton className="aspect-[9/16] rounded-lg" />
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                      ))}
                    </div>
                  ) : shorts.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                        <Film className="w-10 h-10 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-medium mb-2">No shorts yet</h3>
                      <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                        Share your founder journey with short, engaging videos
                      </p>
                      <Button onClick={() => setCreateModalOpen(true)} size="lg">
                        <Plus className="w-4 h-4 mr-2" />
                        Create Your First Short
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                      {shorts.map((short) => (
                        <div key={short.id} className="group relative">
                          {/* Thumbnail */}
                          <div className="aspect-[9/16] rounded-lg overflow-hidden bg-muted relative">
                            {short.thumbnail_url ? (
                              <img
                                src={short.thumbnail_url}
                                alt={short.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <video
                                src={short.video_url}
                                className="w-full h-full object-cover"
                                muted
                                preload="metadata"
                              />
                            )}

                            {/* Overlay */}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors" />

                            {/* Status badge */}
                            <Badge
                              variant={short.is_published ? 'default' : 'secondary'}
                              className="absolute top-2 left-2 text-[10px]"
                            >
                              {short.is_published ? 'Live' : 'Draft'}
                            </Badge>

                            {/* Actions */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 text-white hover:bg-black/70 h-7 w-7"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => togglePublish(short.id, !short.is_published)}
                                >
                                  {short.is_published ? (
                                    <>
                                      <EyeOff className="w-4 h-4 mr-2" />
                                      Unpublish
                                    </>
                                  ) : (
                                    <>
                                      <Check className="w-4 h-4 mr-2" />
                                      Publish
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDeleteClick(short.id)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>

                            {/* Stats overlay */}
                            <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2 text-white text-[10px]">
                              <span className="flex items-center gap-1 bg-black/50 px-1.5 py-0.5 rounded">
                                <Eye className="w-3 h-3" />
                                {formatCount(short.views_count)}
                              </span>
                              <span className="flex items-center gap-1 bg-black/50 px-1.5 py-0.5 rounded">
                                <Heart className="w-3 h-3" />
                                {formatCount(short.likes_count)}
                              </span>
                            </div>
                          </div>

                          {/* Info */}
                          <div className="mt-2">
                            <h3 className="font-medium text-sm line-clamp-2">{short.title}</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {formatDistanceToNow(new Date(short.created_at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Detailed Views Chart */}
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-base">Performance Over Time</CardTitle>
                    <CardDescription>Track your growth and engagement trends</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={viewsChartData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="date" className="text-xs" />
                          <YAxis className="text-xs" />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="views" 
                            stroke="hsl(var(--primary))" 
                            strokeWidth={2}
                            dot={{ fill: 'hsl(var(--primary))' }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="likes" 
                            stroke="hsl(220, 90%, 56%)" 
                            strokeWidth={2}
                            dot={{ fill: 'hsl(220, 90%, 56%)' }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Key Metrics */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Key Metrics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Engagement Rate</span>
                        <span className="font-medium">{engagementRate}%</span>
                      </div>
                      <Progress value={parseFloat(engagementRate)} className="h-2" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Average Views</span>
                        <span className="font-medium">{formatCount(avgViewsPerShort)}</span>
                      </div>
                      <Progress value={Math.min((avgViewsPerShort / 1000) * 100, 100)} className="h-2" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Content Volume</span>
                        <span className="font-medium">{analytics.shorts_count} shorts</span>
                      </div>
                      <Progress value={Math.min(analytics.shorts_count * 10, 100)} className="h-2" />
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Tips */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Growth Tips</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <Clock className="w-5 h-5 text-primary mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">Post Consistently</p>
                        <p className="text-xs text-muted-foreground">Regular uploads boost visibility</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <Users className="w-5 h-5 text-primary mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">Engage with Community</p>
                        <p className="text-xs text-muted-foreground">Reply to comments and connect</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <TrendingUp className="w-5 h-5 text-primary mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">Use Trending Topics</p>
                        <p className="text-xs text-muted-foreground">Join conversations that matter</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </main>

        {/* Modals */}
        <CreateShortModal
          open={createModalOpen}
          onOpenChange={setCreateModalOpen}
        />

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this short?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. The video will be permanently removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
}
