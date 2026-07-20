import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../app/components/ui/card';
import { Button } from '../../app/components/ui/button';
import { Input } from '../../app/components/ui/input';
import { 
  Image as ImageIcon, 
  Play, 
  ArrowLeft, 
  Search, 
  X, 
  Sparkles, 
  Calendar, 
  Film, 
  Tag, 
  Layers,
  ExternalLink
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { generalGalleryService } from '../../utils/generalGalleryService';
import { GeneralAlbum, GeneralGalleryItem } from '../../types';
import { parseVideoUrl } from '../../utils/videoUtils';

const CATEGORY_PILLS = [
  { id: 'All', label: 'All Media' },
  { id: 'Meeting', label: 'Meetings' },
  { id: 'Harvest', label: 'Harvest & Thanksgiving' },
  { id: 'FathersDay', label: "Father's Day" },
  { id: 'Welfare', label: 'Welfare & General' },
  { id: 'Sports', label: 'Sports Department' },
];

// High-quality demonstration fallback media for parish activities
const DEMO_GALLERY_ITEMS: Array<{
  id: string;
  title: string;
  category: string;
  media_url?: string;
  video_url?: string;
  created_at: string;
  album_name: string;
}> = [
  {
    id: 'demo-1',
    title: 'Holy Cross CMO Annual General Assembly 2026',
    category: 'Meeting',
    media_url: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1200&q=80',
    created_at: '2026-06-15',
    album_name: 'Monthly General Assembly'
  },
  {
    id: 'demo-2',
    title: 'CMO Grand Harvest & Thanksgiving Celebration Mass',
    category: 'Harvest',
    media_url: 'https://images.unsplash.com/photo-1544427920-c49ccfb85579?auto=format&fit=crop&w=1200&q=80',
    created_at: '2026-05-10',
    album_name: 'Parish Harvest 2026'
  },
  {
    id: 'demo-3',
    title: "National Father's Day Honors & Excellence Awards",
    category: 'FathersDay',
    media_url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1200&q=80',
    created_at: '2026-06-21',
    album_name: "Father's Day 2026"
  },
  {
    id: 'demo-4',
    title: 'CMO Welfare Community Care & Outreach Program',
    category: 'Welfare',
    media_url: 'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?auto=format&fit=crop&w=1200&q=80',
    created_at: '2026-04-18',
    album_name: 'Welfare & Charity Outreach'
  },
  {
    id: 'demo-5',
    title: 'Holy Cross CMO Inter-Family Football Championship Final',
    category: 'Sports',
    media_url: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1200&q=80',
    created_at: '2026-07-04',
    album_name: 'Annual Sports Tournament'
  },
  {
    id: 'demo-6',
    title: 'Executive Council Inauguration & Pastoral Blessing',
    category: 'Meeting',
    media_url: 'https://images.unsplash.com/photo-1529070538774-1843cb3265df?auto=format&fit=crop&w=1200&q=80',
    created_at: '2026-01-12',
    album_name: 'Executive Council'
  }
];

export const PublicGallery: React.FC = () => {
  const { setCurrentPage } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Data state
  const [albums, setAlbums] = useState<GeneralAlbum[]>([]);
  const [realItems, setRealItems] = useState<GeneralGalleryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Lightbox Modal state
  const [activeMedia, setActiveMedia] = useState<{
    title: string;
    media_url?: string | null;
    video_url?: string | null;
    category?: string;
    created_at?: string;
    album_name?: string;
  } | null>(null);

  const loadGalleryData = useCallback(async () => {
    setLoading(true);
    try {
      const [albumData, itemData] = await Promise.all([
        generalGalleryService.fetchAlbums(),
        generalGalleryService.fetchGalleryItems()
      ]);
      setAlbums(albumData);
      setRealItems(itemData);
    } catch (err) {
      console.error('Failed to load public gallery:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGalleryData();
  }, [loadGalleryData]);

  // Combine real database gallery items with fallback demo media
  const combinedItems = realItems.length > 0
    ? realItems.map(item => {
        const matchingAlbum = albums.find(a => a.id === item.album_id);
        return {
          id: item.id,
          title: item.title || matchingAlbum?.name || 'Parish Activity Media',
          category: matchingAlbum?.category || 'General',
          media_url: item.media_url || undefined,
          video_url: item.video_url || undefined,
          created_at: item.created_at || new Date().toISOString(),
          album_name: matchingAlbum?.name || 'Parish Gallery'
        };
      })
    : DEMO_GALLERY_ITEMS;

  // Filter items by active pill category and search query
  const filteredItems = combinedItems.filter(item => {
    const matchesCategory = 
      selectedCategory === 'All' || 
      item.category.toLowerCase() === selectedCategory.toLowerCase() ||
      (selectedCategory === 'Harvest' && (item.category === 'Harvest' || item.category === 'Thanksgiving')) ||
      (selectedCategory === 'Welfare' && (item.category === 'Welfare' || item.category === 'General'));
    
    const query = searchQuery.toLowerCase().trim();
    const matchesQuery = !query || 
      item.title.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query) ||
      item.album_name.toLowerCase().includes(query);

    return matchesCategory && matchesQuery;
  });

  return (
    <div className="min-h-screen bg-[#001a16] text-white p-4 md:p-8 max-w-7xl mx-auto">
      {/* Top Bar Navigation & Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <button onClick={() => setCurrentPage('home')} className="flex items-center gap-2 text-yellow-400 hover:text-yellow-300 font-semibold mb-6 transition-colors cursor-pointer">
            <ArrowLeft className="w-5 h-5"/>
            Return to Main Portal
          </button>
          <h1 className="text-3xl md:text-4xl font-extrabold text-[#ffd700] flex items-center gap-3 tracking-wide">
            <ImageIcon className="w-8 h-8 text-[#ffd700]" />
            Public CMO Media Gallery
          </h1>
          <p className="text-gray-300 text-sm md:text-base mt-1">
            Open-access archive for Holy Cross CMO parish events, Harvest, Father&apos;s Day, and community activities.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search albums & media..."
            className="pl-9 bg-[#002520] border-[#ffd700]/30 text-white placeholder-gray-400 text-sm rounded-lg focus:border-[#ffd700]"
          />
        </div>
      </div>

      {/* Pill-Styled Category Filter Bar */}
      <div className="flex flex-wrap items-center gap-2 mb-8 pb-4 border-b border-[#ffd700]/20">
        {CATEGORY_PILLS.map((pill) => {
          const isActive = selectedCategory.toLowerCase() === pill.id.toLowerCase();
          return (
            <button
              key={pill.id}
              onClick={() => setSelectedCategory(pill.id)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-[#ffd700] text-[#001a16] shadow-lg shadow-[#ffd700]/20 scale-105'
                  : 'bg-[#002520] text-gray-300 border border-[#ffd700]/20 hover:border-[#ffd700]/60 hover:text-[#ffd700]'
              }`}
            >
              {pill.label}
            </button>
          );
        })}
      </div>

      {/* Gallery Grid */}
      {loading ? (
        <div className="py-20 text-center text-gray-400 text-sm">
          <Sparkles className="w-8 h-8 text-[#ffd700] animate-spin mx-auto mb-3" />
          Loading public gallery media...
        </div>
      ) : filteredItems.length === 0 ? (
        <Card className="bg-[#002520] border border-[#ffd700]/20 p-12 text-center rounded-xl">
          <Layers className="w-12 h-12 text-gray-500 mx-auto mb-3 opacity-60" />
          <h3 className="text-lg font-bold text-[#ffd700]">No Media Found</h3>
          <p className="text-gray-400 text-xs mt-1">
            No public photos or videos match the selected category &quot;{selectedCategory}&quot;.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => {
            const isVideo = !!item.video_url;
            const videoMeta = isVideo && item.video_url ? parseVideoUrl(item.video_url) : null;
            const displayImage = item.media_url || videoMeta?.thumbnailUrl || 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=800&q=80';

            return (
              <Card
                key={item.id}
                onClick={() => setActiveMedia(item)}
                className="bg-[#002520] border border-[#ffd700]/20 overflow-hidden rounded-xl group hover:border-[#ffd700] transition-all duration-300 hover:shadow-xl hover:shadow-[#ffd700]/10 cursor-pointer flex flex-col"
              >
                {/* Media Image Thumbnail Container */}
                <div className="relative aspect-video overflow-hidden bg-black/40">
                  <img
                    src={displayImage}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

                  {/* Video Play Button Badge */}
                  {isVideo && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-[#ffd700] text-[#001a16] flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                        <Play className="w-6 h-6 fill-current ml-0.5" />
                      </div>
                    </div>
                  )}

                  {/* Category Pill Tag */}
                  <span className="absolute top-3 left-3 bg-[#001a16]/80 backdrop-blur text-[#ffd700] border border-[#ffd700]/40 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
                    {item.category}
                  </span>
                </div>

                {/* Media Details Footer */}
                <div className="p-4 flex-grow flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-white text-sm line-clamp-2 group-hover:text-[#ffd700] transition-colors mb-2">
                      {item.title}
                    </h3>
                    <p className="text-xs text-gray-400 flex items-center gap-1.5 mb-2">
                      <Tag className="w-3.5 h-3.5 text-[#ffd700]" />
                      {item.album_name}
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-[#ffd700]/10 text-[11px] text-gray-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      {new Date(item.created_at).toLocaleDateString()}
                    </span>
                    <span className="text-[#ffd700] font-semibold text-xs flex items-center gap-1 group-hover:underline">
                      View {isVideo ? 'Video' : 'Photo'} ➔
                    </span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Interactive Lightbox Modal */}
      {activeMedia && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <Card className="bg-[#002520] border-2 border-[#ffd700] max-w-4xl w-full rounded-2xl overflow-hidden shadow-2xl relative">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#ffd700]/20 bg-[#001a16]">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-[#ffd700]/10 text-[#ffd700] border border-[#ffd700]/30 text-xs font-bold uppercase">
                  {activeMedia.category || 'Gallery'}
                </span>
                <h3 className="font-bold text-white text-base truncate max-w-md">{activeMedia.title}</h3>
              </div>
              <button
                onClick={() => setActiveMedia(null)}
                className="text-gray-400 hover:text-[#ffd700] p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body: Media Viewer */}
            <div className="p-4 bg-black/60 flex items-center justify-center min-h-[300px] max-h-[70vh]">
              {activeMedia.video_url ? (
                (() => {
                  const meta = parseVideoUrl(activeMedia.video_url!);
                  if (meta?.embedUrl) {
                    return (
                      <div className="w-full aspect-video rounded-xl overflow-hidden border border-[#ffd700]/20">
                        <iframe
                          src={meta.embedUrl}
                          title={activeMedia.title}
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    );
                  }
                  return (
                    <div className="text-center py-12">
                      <Film className="w-12 h-12 text-[#ffd700] mx-auto mb-3" />
                      <p className="text-white text-sm font-semibold mb-3">External Video Content</p>
                      <a
                        href={activeMedia.video_url!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-[#ffd700] text-[#001a16] font-bold px-4 py-2 rounded-lg text-xs hover:bg-[#ffc700] transition-all"
                      >
                        Watch Video Stream <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  );
                })()
              ) : (
                <img
                  src={activeMedia.media_url || 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1200&q=80'}
                  alt={activeMedia.title}
                  className="max-h-[65vh] w-auto object-contain rounded-lg shadow-lg border border-[#ffd700]/20"
                />
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-[#001a16] border-t border-[#ffd700]/20 flex justify-between items-center text-xs text-gray-300">
              <span className="font-semibold text-[#ffd700]">Album: {activeMedia.album_name || 'Holy Cross CMO'}</span>
              <Button
                onClick={() => setActiveMedia(null)}
                className="bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700] font-bold text-xs px-4 py-1.5 rounded-lg"
              >
                Close Preview
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
