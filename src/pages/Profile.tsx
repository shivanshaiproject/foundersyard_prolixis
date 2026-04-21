import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { PostCard } from '@/components/feed/PostCard';
import { ProfileSkeleton, FeedSkeleton } from '@/components/shared/LoadingSkeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { RankTab } from '@/components/profile/RankTab';
import { ShipLog } from '@/components/ships/ShipLog';
import { useProfile } from '@/hooks/useProfile';
import { usePosts, PostWithAuthor } from '@/hooks/usePosts';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { FileText, User, Image, Heart, MessageCircle, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

const profileTabs = [
  { id: 'posts', label: 'Posts', icon: FileText },
  { id: 'replies', label: 'Replies', icon: MessageCircle },
  { id: 'media', label: 'Media', icon: Image },
  { id: 'likes', label: 'Likes', icon: Heart },
  { id: 'rank', label: 'Rank', icon: Trophy },
];

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState('posts');
  const { profile, loading: profileLoading, handleNetworkAction } = useProfile(id);
  const { posts, loading: postsLoading, toggleLike, toggleBookmark } = usePosts(id);
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [tabPosts, setTabPosts] = useState<PostWithAuthor[]>([]);
  const [tabLoading, setTabLoading] = useState(false);

  // Fetch posts based on active tab
  useEffect(() => {
    const fetchTabData = async () => {
      if (!id || activeTab === 'posts') {
        setTabPosts(posts);
        return;
      }

      setTabLoading(true);
      try {
        if (activeTab === 'media') {
          // Posts with images
          const { data } = await supabase
            .from('posts')
            .select(`*, author:profiles!posts_user_id_fkey(*)`)
            .eq('user_id', id)
            .not('image_url', 'is', null)
            .order('created_at', { ascending: false });
          
          setTabPosts((data || []).map(p => ({ ...p, author: p.author as any })));
        } else if (activeTab === 'likes') {
          // Posts the user has liked
          const { data: likes } = await supabase
            .from('likes')
            .select('post_id')
            .eq('user_id', id);

          if (likes && likes.length > 0) {
            const postIds = likes.map(l => l.post_id);
            const { data } = await supabase
              .from('posts')
              .select(`*, author:profiles!posts_user_id_fkey(*)`)
              .in('id', postIds)
              .order('created_at', { ascending: false });
            
            setTabPosts((data || []).map(p => ({ ...p, author: p.author as any })));
          } else {
            setTabPosts([]);
          }
        } else if (activeTab === 'replies') {
          // Posts the user has commented on
          const { data: comments } = await supabase
            .from('comments')
            .select('post_id')
            .eq('user_id', id);

          if (comments && comments.length > 0) {
            const uniquePostIds = [...new Set(comments.map(c => c.post_id))];
            const { data } = await supabase
              .from('posts')
              .select(`*, author:profiles!posts_user_id_fkey(*)`)
              .in('id', uniquePostIds)
              .order('created_at', { ascending: false });
            
            setTabPosts((data || []).map(p => ({ ...p, author: p.author as any })));
          } else {
            setTabPosts([]);
          }
        }
      } catch (err) {
        console.error('Error fetching tab data:', err);
      } finally {
        setTabLoading(false);
      }
    };

    fetchTabData();
  }, [id, activeTab, posts]);

  const displayedPosts = activeTab === 'posts' ? posts : tabPosts;
  const isLoading = activeTab === 'posts' ? postsLoading : tabLoading;

  if (profileLoading) {
    return (
      <AppLayout>
        <ProfileSkeleton />
      </AppLayout>
    );
  }

  if (!profile) {
    return (
      <AppLayout>
        <div className="p-6">
          <EmptyState
            icon={User}
            title="Profile not found"
            description="This user does not exist or has been removed."
          />
        </div>
      </AppLayout>
    );
  }

  const getEmptyMessage = () => {
    switch (activeTab) {
      case 'replies':
        return { title: 'No replies yet', desc: 'Comments on posts will appear here.' };
      case 'media':
        return { title: 'No media posts', desc: 'Posts with images will appear here.' };
      case 'likes':
        return { title: 'No liked posts', desc: 'Posts this user has liked will appear here.' };
      default:
        return { title: 'No posts yet', desc: 'This user has not posted anything yet.' };
    }
  };

  const emptyMsg = getEmptyMessage();

  return (
    <AppLayout>
      <div className="pb-20 lg:pb-4 overflow-x-hidden">
        <ProfileHeader
          profile={profile}
          onNetworkAction={handleNetworkAction}
          onEditProfile={() => navigate('/settings')}
        />

        {/* Ship Log */}
        <ShipLog userId={id} />

        {/* Profile Tabs */}
        <div className="flex items-center border-b border-border/50 overflow-x-auto scrollbar-hide">
          <div className="flex items-center px-4 min-w-max">
            {profileTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 sm:px-5 py-3.5 text-sm font-medium text-muted-foreground transition-colors border-b-2 border-transparent -mb-[1px] whitespace-nowrap',
                  activeTab === tab.id && 'text-foreground border-primary'
                )}
              >
                <tab.icon className="w-4 h-4" />
                <span className="hidden xs:inline sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {activeTab === 'rank' ? (
            <RankTab userId={id} />
          ) : isLoading ? (
            <FeedSkeleton />
          ) : displayedPosts.length === 0 ? (
            <EmptyState
              icon={FileText}
              title={emptyMsg.title}
              description={emptyMsg.desc}
            />
          ) : (
            <div className="space-y-4">
              {displayedPosts.map(post => (
                <PostCard
                  key={post.id}
                  post={post}
                  onLike={toggleLike}
                  onBookmark={toggleBookmark}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
