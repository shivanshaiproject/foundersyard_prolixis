import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Navigate } from 'react-router-dom';
import { StreamHeader } from '@/components/stream/StreamHeader';
import { StreamSidebar } from '@/components/stream/StreamSidebar';
import { VideoGrid } from '@/components/stream/VideoGrid';
import { PromoBanner } from '@/components/stream/PromoBanner';
import { CreateVideoModal } from '@/components/stream/CreateVideoModal';
import { useVideos } from '@/hooks/useVideos';

// FounderStream is Coming Soon - Redirect all access to main feed
const FOUNDERSTREAM_ENABLED = false;

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'd2c', label: 'D2C' },
  { id: 'saas', label: 'SaaS' },
  { id: 'ai', label: 'AI / ML' },
  { id: 'fintech', label: 'Fintech' },
  { id: 'ecommerce', label: 'E-commerce' },
  { id: 'marketing', label: 'Marketing' },
];

export default function StreamFeed() {
  const { videos, loading, searchQuery, setSearchQuery, fetchVideos } = useVideos();
  const [activeCategory, setActiveCategory] = useState('all');
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Redirect to main feed if FounderStream is not enabled
  if (!FOUNDERSTREAM_ENABLED) {
    return <Navigate to="/feed" replace />;
  }

  // Filter videos by category - simplified for now
  const filteredVideos = activeCategory === 'all' 
    ? videos 
    : videos.filter(v => 
        v.title.toLowerCase().includes(activeCategory.toLowerCase()) ||
        v.description?.toLowerCase().includes(activeCategory.toLowerCase())
      );

  return (
    <>
      <Helmet>
        <title>FY Streams | Build Logs from Real Founders</title>
        <meta name="description" content="Watch long-form build logs from founders building in public. Learn from their journey, mistakes, and wins." />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <StreamHeader 
          onSearch={setSearchQuery}
          searchQuery={searchQuery}
          onCreateClick={() => setCreateModalOpen(true)}
        />

        {/* Main Layout */}
        <div className="flex">
          {/* Left Sidebar */}
          <StreamSidebar />

          {/* Main Content */}
          <main className="flex-1 px-4 lg:px-6 py-4">
            {/* Promo Banner */}
            <PromoBanner className="mb-6" />

            {/* Category Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-hide mb-4">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`
                    px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all
                    ${activeCategory === cat.id 
                      ? 'bg-foreground text-background' 
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/50'
                    }
                  `}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Video Grid */}
            <VideoGrid videos={filteredVideos} loading={loading} />
          </main>
        </div>

        {/* Create Modal */}
        <CreateVideoModal 
          open={createModalOpen} 
          onOpenChange={setCreateModalOpen}
          onSuccess={fetchVideos}
        />
      </div>
    </>
  );
}
