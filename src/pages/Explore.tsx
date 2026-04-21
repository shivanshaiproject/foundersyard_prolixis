import { useState, useEffect, useRef } from 'react';
import { Search, TrendingUp, Cpu, Rocket, BarChart3, Package, Megaphone, Sparkles, Hash, MessageSquare, User } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { Link, useSearchParams } from 'react-router-dom';
import { useTrending } from '@/hooks/useTrending';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { PostCard } from '@/components/feed/PostCard';

const topicCategories = [
  { id: 'tech', label: 'Tech', icon: Cpu, className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
  { id: 'funding', label: 'Funding', icon: Rocket, className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  { id: 'growth', label: 'Growth', icon: BarChart3, className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
  { id: 'product', label: 'Product', icon: Package, className: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300' },
  { id: 'marketing', label: 'Marketing', icon: Megaphone, className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  { id: 'ai', label: 'AI', icon: Sparkles, className: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300' },
];

interface ForumCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  threads_count: number | null;
  icon: string | null;
  color: string | null;
}

interface SearchedProfile {
  id: string;
  full_name: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
}

interface SearchedPost {
  id: string;
  content: string;
  slug: string;
  created_at: string;
  likes_count: number;
  comments_count: number;
  image_url: string | null;
  profiles: {
    id: string;
    full_name: string;
    username: string | null;
    avatar_url: string | null;
    is_verified: boolean | null;
    is_vip: boolean | null;
  };
}

export default function ExplorePage() {
  const [searchParams] = useSearchParams();
  const tagFromUrl = searchParams.get('tag');
  const [searchQuery, setSearchQuery] = useState(tagFromUrl ? `#${tagFromUrl}` : '');
  const [forumCategories, setForumCategories] = useState<ForumCategory[]>([]);
  const [loadingForums, setLoadingForums] = useState(true);
  const { trending, loading: trendingLoading } = useTrending();
  
  // Search state
  const [searchedProfiles, setSearchedProfiles] = useState<SearchedProfile[]>([]);
  const [searchedPosts, setSearchedPosts] = useState<SearchedPost[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const fetchForumCategories = async () => {
      const { data } = await supabase
        .from('forum_categories')
        .select('*')
        .limit(6);
      setForumCategories(data || []);
      setLoadingForums(false);
    };
    fetchForumCategories();
  }, []);

  // Debounced search - 100ms after user stops typing
  useEffect(() => {
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    const query = searchQuery.trim();

    // If empty or too short, clear results
    if (!query || query.length < 2) {
      setSearchedProfiles([]);
      setSearchedPosts([]);
      setSearchPerformed(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    // Debounce: only call API after 100ms of inactivity
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        // Search profiles by name or username
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, username, avatar_url, bio')
          .or(`full_name.ilike.%${query}%,username.ilike.%${query}%`)
          .limit(5);

        // Search posts by content
        const { data: posts } = await supabase
          .from('posts')
          .select(`
            id, content, slug, created_at, likes_count, comments_count, image_url,
            profiles!posts_user_id_fkey(id, full_name, username, avatar_url, is_verified, is_vip)
          `)
          .eq('is_held_for_review', false)
          .ilike('content', `%${query}%`)
          .order('created_at', { ascending: false })
          .limit(10);

        setSearchedProfiles(profiles || []);
        setSearchedPosts((posts as SearchedPost[]) || []);
        setSearchPerformed(true);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsSearching(false);
      }
    }, 100);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  const showSearchResults = searchQuery.trim().length >= 2;

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto p-4 space-y-4 overflow-x-hidden">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search founders, posts, topics..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-12 h-12 text-sm bg-card rounded-xl"
          />
        </div>

        {/* Search Results */}
        {showSearchResults && (
          <div className="space-y-4">
            {isSearching ? (
              <div className="bg-card rounded-2xl border border-border/60 p-4">
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-14 bg-muted/50 rounded-xl animate-pulse" />
                  ))}
                </div>
              </div>
            ) : searchPerformed ? (
              <>
                {/* Founders Results */}
                {searchedProfiles.length > 0 && (
                  <div className="bg-card rounded-2xl border border-border/60 p-4">
                    <div className="flex items-center gap-2 mb-3 px-1">
                      <User className="w-4 h-4 text-primary" />
                      <h2 className="font-semibold text-foreground text-sm">Founders</h2>
                    </div>
                    <div className="space-y-2">
                      {searchedProfiles.map(profile => (
                        <Link
                          key={profile.id}
                          to={`/profile/${profile.id}`}
                          className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 active:bg-secondary/70 transition-colors"
                        >
                          <UserAvatar src={profile.avatar_url} name={profile.full_name} size="md" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground text-sm truncate">{profile.full_name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              @{profile.username || profile.id.slice(0, 8)}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Posts Results */}
                {searchedPosts.length > 0 && (
                  <div className="bg-card rounded-2xl border border-border/60 p-4">
                    <div className="flex items-center gap-2 mb-3 px-1">
                      <Hash className="w-4 h-4 text-primary" />
                      <h2 className="font-semibold text-foreground text-sm">Posts</h2>
                    </div>
                    <div className="space-y-3">
                      {searchedPosts.map(post => (
                        <Link
                          key={post.id}
                          to={`/post/${post.slug}`}
                          className="block p-3 rounded-xl hover:bg-secondary/50 active:bg-secondary/70 transition-colors"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <UserAvatar src={post.profiles.avatar_url} name={post.profiles.full_name} size="sm" />
                            <span className="text-sm font-medium text-foreground">{post.profiles.full_name}</span>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">{post.content}</p>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* No Results */}
                {searchedProfiles.length === 0 && searchedPosts.length === 0 && (
                  <div className="bg-card rounded-2xl border border-border/60 p-8 text-center">
                    <Search className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">No results found for "{searchQuery}"</p>
                    <p className="text-xs text-muted-foreground mt-1">Try different keywords</p>
                  </div>
                )}
              </>
            ) : null}
          </div>
        )}

        {/* Normal Explore Content - Hidden when searching */}
        {!showSearchResults && (
          <>
            {/* Topics Grid */}
            <div className="bg-card rounded-2xl border border-border/60 p-4">
              <h2 className="font-semibold text-foreground mb-3 text-sm px-1">Topics</h2>
              <div className="grid grid-cols-3 gap-2">
                {topicCategories.map(cat => (
                  <Link
                    key={cat.id}
                    to={`/topic/${cat.id}`}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all active:scale-95 ${cat.className}`}
                  >
                    <cat.icon className="w-5 h-5 mb-1" />
                    <span className="text-xs font-medium">{cat.label}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Trending Topics */}
            <div className="bg-card rounded-2xl border border-border/60 p-4">
              <div className="flex items-center gap-2 mb-4 px-1">
                <TrendingUp className="w-4 h-4 text-primary" />
                <h2 className="font-semibold text-foreground text-sm">Trending Topics</h2>
              </div>
              {trendingLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-10 bg-muted/50 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : trending.length > 0 ? (
                <div className="space-y-1">
                  {trending.map((topic, i) => (
                    <Link
                      key={topic.topic}
                      to={`/topic/${encodeURIComponent(topic.topic.replace('#', ''))}`}
                      className="flex items-center justify-between p-2.5 rounded-xl hover:bg-secondary/50 active:bg-secondary/70 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-primary text-sm truncate">{topic.topic}</p>
                        <p className="text-xs text-muted-foreground">{topic.count} posts</p>
                      </div>
                      <span className="text-xs text-muted-foreground font-medium shrink-0 ml-2">#{i + 1}</span>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-muted-foreground text-sm text-center py-4">No trending topics yet</div>
              )}
            </div>

            {/* Forums Section - Mobile visible */}
            <div className="bg-card rounded-2xl border border-border/60 p-4">
              <div className="flex items-center justify-between mb-4 px-1">
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4 text-primary" />
                  <h2 className="font-semibold text-foreground text-sm">Forums</h2>
                </div>
                <Link to="/forums" className="text-xs text-primary font-medium hover:underline">
                  View all
                </Link>
              </div>
              
              {loadingForums ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-12 bg-muted/50 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : forumCategories.length > 0 ? (
                <div className="space-y-2">
                  {forumCategories.map((category) => (
                    <Link
                      key={category.id}
                      to={`/forums/${category.slug}`}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 active:bg-secondary/70 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <MessageSquare className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground text-sm truncate">{category.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {category.threads_count || 0} threads
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-muted-foreground text-sm text-center py-4">No forums available</div>
              )}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}