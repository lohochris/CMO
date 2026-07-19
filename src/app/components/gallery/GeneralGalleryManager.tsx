import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  FolderPlus,
  Image as ImageIcon,
  Video,
  Play,
  Upload,
  Link as LinkIcon,
  Trash2,
  Tag,
  X,
  Plus,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Film,
  Layers,
  Sparkles,
} from 'lucide-react';
import { GeneralAlbum, GeneralGalleryItem, AlbumCategory } from '../../../types';
import { generalGalleryService } from '../../../utils/generalGalleryService';
import { parseVideoUrl } from '../../../utils/videoUtils';


const CATEGORIES: AlbumCategory[] = ['Meeting', 'Harvest', 'FathersDay', 'Welfare', 'General'];

interface GeneralGalleryManagerProps {
  currentUserName?: string;
  isExecutive?: boolean;
}

export const GeneralGalleryManager: React.FC<GeneralGalleryManagerProps> = ({
  currentUserName = 'Executive Admin',
  isExecutive = true,
}) => {
  // State: Albums and Active Selections
  const [albums, setAlbums] = useState<GeneralAlbum[]>([]);
  const [activeAlbumId, setActiveAlbumId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [galleryItems, setGalleryItems] = useState<GeneralGalleryItem[]>([]);

  // State: Loading & Error Triggers
  const [loadingAlbums, setLoadingAlbums] = useState<boolean>(false);
  const [loadingItems, setLoadingItems] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // State: New Album Form
  const [showAlbumModal, setShowAlbumModal] = useState<boolean>(false);
  const [newAlbumName, setNewAlbumName] = useState<string>('');
  const [newAlbumCategory, setNewAlbumCategory] = useState<AlbumCategory>('General');
  const [newAlbumDescription, setNewAlbumDescription] = useState<string>('');

  // State: Media Intake Panel
  const [intakeTab, setIntakeTab] = useState<'upload' | 'video'>('upload');
  const [mediaTitle, setMediaTitle] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoUrlInput, setVideoUrlInput] = useState<string>('');

  // State: Active Video Modal Player
  const [activeVideoItem, setActiveVideoItem] = useState<GeneralGalleryItem | null>(null);
  const [previewImageItem, setPreviewImageItem] = useState<GeneralGalleryItem | null>(null);

  // Stable Reference Guard to prevent infinite fetch loop
  const isFetchingAlbums = useRef<boolean>(false);
  const isFetchingItems = useRef<boolean>(false);

  // Helper notice state
  const notify = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => {
      setStatusMessage(null);
    }, 4000);
  };

  // 1. Reference-Stable Fetch Albums Trigger
  const loadAlbums = useCallback(async () => {
    if (isFetchingAlbums.current) return;
    isFetchingAlbums.current = true;
    setLoadingAlbums(true);

    try {
      const data = await generalGalleryService.fetchAlbums();
      setAlbums(data);
      // Automatically select first album if none active
      if (data.length > 0 && !activeAlbumId) {
        setActiveAlbumId(data[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load albums:', err);
    } finally {
      setLoadingAlbums(false);
      isFetchingAlbums.current = false;
    }
  }, [activeAlbumId]);

  // 2. Reference-Stable Fetch Media Trigger for active album
  const loadGalleryMedia = useCallback(async (albumId: string | null) => {
    if (!albumId) {
      setGalleryItems([]);
      return;
    }
    if (isFetchingItems.current) return;
    isFetchingItems.current = true;
    setLoadingItems(true);

    try {
      const items = await generalGalleryService.fetchGalleryItems(albumId);
      setGalleryItems(items);
    } catch (err: any) {
      console.error('Failed to load gallery items:', err);
    } finally {
      setLoadingItems(false);
      isFetchingItems.current = false;
    }
  }, []);

  // Initial Load Trigger
  useEffect(() => {
    loadAlbums();
  }, [loadAlbums]);

  // Active Album Change Trigger
  useEffect(() => {
    if (activeAlbumId) {
      loadGalleryMedia(activeAlbumId);
    }
  }, [activeAlbumId, loadGalleryMedia]);

  // 3. Album Creator Action
  const handleCreateAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAlbumName.trim()) {
      notify('error', 'Please provide an album title.');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await generalGalleryService.createAlbum(
        newAlbumName,
        newAlbumCategory,
        newAlbumDescription,
        currentUserName
      );

      if (created) {
        notify('success', `Album "${created.name}" created successfully!`);
        setNewAlbumName('');
        setNewAlbumDescription('');
        setShowAlbumModal(false);
        await loadAlbums();
        setActiveAlbumId(created.id);
      }
    } catch (err: any) {
      notify('error', err.message || 'Failed to create album.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. File Upload Intake Action
  const handleUploadFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAlbumId) {
      notify('error', 'Please select an active album first.');
      return;
    }
    if (!selectedFile) {
      notify('error', 'Please select a photo or media file to upload.');
      return;
    }

    setIsSubmitting(true);
    try {
      const uploaded = await generalGalleryService.uploadMediaFile(
        activeAlbumId,
        selectedFile,
        mediaTitle
      );

      if (uploaded) {
        notify('success', 'Media file uploaded successfully!');
        setSelectedFile(null);
        setMediaTitle('');
        await loadGalleryMedia(activeAlbumId);
        await loadAlbums();
      }
    } catch (err: any) {
      notify('error', err.message || 'Failed to upload media file.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 5. Video URL Link Intake Action
  const handleSaveVideoLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAlbumId) {
      notify('error', 'Please select an active album first.');
      return;
    }

    const videoInfo = parseVideoUrl(videoUrlInput);
    if (!videoInfo.isValid) {
      notify('error', 'Invalid video link. Please enter a valid YouTube or Vimeo URL.');
      return;
    }

    setIsSubmitting(true);
    try {
      const savedLink = await generalGalleryService.addVideoLink(
        activeAlbumId,
        videoUrlInput,
        mediaTitle || `${videoInfo.platform.toUpperCase()} Video Link`
      );

      if (savedLink) {
        notify('success', `External ${videoInfo.platform.toUpperCase()} video link added to album!`);
        setVideoUrlInput('');
        setMediaTitle('');
        await loadGalleryMedia(activeAlbumId);
        await loadAlbums();
      }
    } catch (err: any) {
      notify('error', err.message || 'Failed to add video hyperlink.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 6. Delete Single Media Item
  const handleDeleteItem = async (itemId: string) => {
    if (!window.confirm('Are you sure you want to remove this item from the album?')) return;
    try {
      const success = await generalGalleryService.deleteGalleryItem(itemId);
      if (success) {
        notify('success', 'Item removed.');
        if (activeAlbumId) {
          await loadGalleryMedia(activeAlbumId);
          await loadAlbums();
        }
      }
    } catch (err) {
      notify('error', 'Failed to delete item.');
    }
  };

  // 7. Delete Entire Album
  const handleDeleteAlbum = async (albumId: string, albumName: string) => {
    if (!window.confirm(`Are you sure you want to delete the album "${albumName}" and all its contents?`)) return;
    try {
      const success = await generalGalleryService.deleteAlbum(albumId);
      if (success) {
        notify('success', `Album "${albumName}" deleted.`);
        if (activeAlbumId === albumId) {
          setActiveAlbumId(null);
        }
        await loadAlbums();
      }
    } catch (err) {
      notify('error', 'Failed to delete album.');
    }
  };

  // Filtered Albums by category
  const filteredAlbums = albums.filter((a) =>
    selectedCategory === 'All' ? true : a.category === selectedCategory
  );

  const activeAlbum = albums.find((a) => a.id === activeAlbumId);
  const parsedCurrentVideo = parseVideoUrl(videoUrlInput);

  return (
    <div className="space-y-6 text-white font-sans">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#002520] via-[#003830] to-[#001f1a] p-6 rounded-2xl border border-[#ffd700]/30 shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#ffd700]/10 rounded-xl border border-[#ffd700]/30 text-[#ffd700]">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-[#ffd700] tracking-wide flex items-center gap-2">
                General Albums & Media Pipeline
              </h2>
              <p className="text-xs md:text-sm text-emerald-100/70 mt-0.5">
                Centralized Non-Sports Activities, Event Archives & External Video Hyperlinks
              </p>
            </div>
          </div>
        </div>

        {isExecutive && (
          <Button
            onClick={() => setShowAlbumModal(true)}
            className="bg-[#ffd700] hover:bg-[#ffe44d] text-[#002520] font-bold px-4 py-2.5 rounded-xl shadow-lg transition-all flex items-center gap-2 text-sm shrink-0 cursor-pointer"
          >
            <FolderPlus className="w-4 h-4" />
            Create New Album
          </Button>
        )}
      </div>

      {/* Status Notification Toast */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 transition-all ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
              : 'bg-rose-950/80 border-rose-500/50 text-rose-200'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span className="text-sm font-medium">{statusMessage.text}</span>
        </div>
      )}

      {/* Category Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-[#ffd700]/20">
        <span className="text-xs font-semibold text-emerald-200/60 uppercase tracking-wider flex items-center gap-1.5 mr-1 shrink-0">
          <Tag className="w-3.5 h-3.5 text-[#ffd700]" />
          Categories:
        </span>
        {['All', ...CATEGORIES].map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              selectedCategory === cat
                ? 'bg-[#ffd700] text-[#002520] shadow-md shadow-[#ffd700]/20'
                : 'bg-[#002520] text-emerald-100/80 hover:bg-[#003830] border border-[#ffd700]/20'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Main Grid: Albums Carousel / List & Active Album View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Album Cards List */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-sm font-bold text-[#ffd700] uppercase tracking-wider flex items-center gap-2">
              <FolderPlus className="w-4 h-4 text-[#ffd700]" />
              Albums Directory ({filteredAlbums.length})
            </h3>
            {loadingAlbums && <span className="text-xs text-emerald-400 animate-pulse">Refreshing...</span>}
          </div>

          {filteredAlbums.length === 0 ? (
            <Card className="bg-[#002520]/70 border border-[#ffd700]/20 p-8 text-center rounded-2xl">
              <FolderPlus className="w-10 h-10 text-emerald-500/40 mx-auto mb-3" />
              <p className="text-sm font-medium text-emerald-200/70">No albums found in this category.</p>
              {isExecutive && (
                <Button
                  onClick={() => setShowAlbumModal(true)}
                  className="mt-4 bg-[#ffd700]/20 hover:bg-[#ffd700]/30 text-[#ffd700] border border-[#ffd700]/40 text-xs px-3 py-1.5 rounded-lg"
                >
                  Create First Album
                </Button>
              )}
            </Card>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-[#ffd700]/20">
              {filteredAlbums.map((album) => {
                const isActive = album.id === activeAlbumId;
                return (
                  <div
                    key={album.id}
                    onClick={() => setActiveAlbumId(album.id)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer relative group ${
                      isActive
                        ? 'bg-gradient-to-r from-[#003830] to-[#002b25] border-[#ffd700] shadow-lg shadow-[#ffd700]/10'
                        : 'bg-[#002520]/80 border-[#ffd700]/20 hover:bg-[#003029] hover:border-[#ffd700]/40'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-[#ffd700]/20 text-[#ffd700] border border-[#ffd700]/30">
                            {album.category}
                          </span>
                          <span className="text-xs text-emerald-300/60 font-medium">
                            {album.item_count || 0} {album.item_count === 1 ? 'item' : 'items'}
                          </span>
                        </div>
                        <h4 className="text-base font-bold text-white group-hover:text-[#ffd700] transition-colors">
                          {album.name}
                        </h4>
                        {album.description && (
                          <p className="text-xs text-emerald-100/70 line-clamp-2">{album.description}</p>
                        )}
                      </div>

                      {isExecutive && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteAlbum(album.id, album.name);
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg bg-rose-950/60 text-rose-400 hover:bg-rose-900 border border-rose-500/30"
                          title="Delete Album"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Media Intake Panel & Active Album Display */}
        <div className="lg:col-span-7 space-y-6">
          {activeAlbum ? (
            <>
              {/* Media Intake Segment (Upload or Video Link) */}
              {isExecutive && (
                <Card className="bg-[#002b25] border border-[#ffd700]/30 p-5 rounded-2xl shadow-xl space-y-4">
                  <div className="flex justify-between items-center border-b border-[#ffd700]/15 pb-3">
                    <h3 className="text-sm font-bold text-[#ffd700] uppercase tracking-wider flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#ffd700]" />
                      Media Intake Panel: <span className="text-white normal-case font-semibold">{activeAlbum.name}</span>
                    </h3>

                    {/* Mode Toggle */}
                    <div className="flex items-center gap-1 bg-[#001f1a] p-1 rounded-xl border border-[#ffd700]/20">
                      <button
                        onClick={() => setIntakeTab('upload')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                          intakeTab === 'upload'
                            ? 'bg-[#ffd700] text-[#002520]'
                            : 'text-emerald-100/70 hover:text-white'
                        }`}
                      >
                        <Upload className="w-3.5 h-3.5" />
                        File Upload
                      </button>
                      <button
                        onClick={() => setIntakeTab('video')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                          intakeTab === 'video'
                            ? 'bg-[#ffd700] text-[#002520]'
                            : 'text-emerald-100/70 hover:text-white'
                        }`}
                      >
                        <LinkIcon className="w-3.5 h-3.5" />
                        Paste Video Link
                      </button>
                    </div>
                  </div>

                  {/* 1. File Upload Form */}
                  {intakeTab === 'upload' && (
                    <form onSubmit={handleUploadFile} className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-emerald-200/80 mb-1 block">
                            Title / Caption (Optional)
                          </label>
                          <Input
                            value={mediaTitle}
                            onChange={(e) => setMediaTitle(e.target.value)}
                            placeholder="e.g. Annual General Meeting Photo"
                            className="bg-[#001f1a] border-[#ffd700]/25 text-white placeholder:text-gray-500 text-xs"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-emerald-200/80 mb-1 block">
                            Select Image File (Target: cmo-gallery bucket)
                          </label>
                          <input
                            type="file"
                            accept="image/*,video/*"
                            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                            className="w-full text-xs text-emerald-100 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#ffd700]/20 file:text-[#ffd700] hover:file:bg-[#ffd700]/30 cursor-pointer bg-[#001f1a] p-1 rounded-lg border border-[#ffd700]/25"
                          />
                        </div>
                      </div>

                      <Button
                        type="submit"
                        disabled={isSubmitting || !selectedFile}
                        className="w-full bg-[#ffd700] hover:bg-[#ffe44d] text-[#002520] font-bold text-xs py-2 rounded-xl shadow cursor-pointer transition-all flex items-center justify-center gap-2"
                      >
                        {isSubmitting ? (
                          'Uploading File to storage...'
                        ) : (
                          <>
                            <Upload className="w-3.5 h-3.5" />
                            Upload & Record Media
                          </>
                        )}
                      </Button>
                    </form>
                  )}

                  {/* 2. Video URL Link Intake Form */}
                  {intakeTab === 'video' && (
                    <form onSubmit={handleSaveVideoLink} className="space-y-3">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-xs font-semibold text-emerald-200/80">
                            Paste YouTube / Vimeo URL
                          </label>
                          {videoUrlInput && (
                            <span
                              className={`text-[10px] font-extrabold px-2 py-0.5 rounded border ${
                                parsedCurrentVideo.isValid
                                  ? 'bg-emerald-950 text-emerald-400 border-emerald-500/40'
                                  : 'bg-rose-950 text-rose-400 border-rose-500/40'
                              }`}
                            >
                              {parsedCurrentVideo.isValid
                                ? `Valid ${parsedCurrentVideo.platform.toUpperCase()} Link`
                                : 'Invalid Video Link'}
                            </span>
                          )}
                        </div>
                        <Input
                          value={videoUrlInput}
                          onChange={(e) => setVideoUrlInput(e.target.value)}
                          placeholder="e.g. https://www.youtube.com/watch?v=... or https://vimeo.com/..."
                          className="bg-[#001f1a] border-[#ffd700]/25 text-white placeholder:text-gray-500 text-xs"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-emerald-200/80 mb-1 block">
                          Video Title / Descriptor (Optional)
                        </label>
                        <Input
                          value={mediaTitle}
                          onChange={(e) => setMediaTitle(e.target.value)}
                          placeholder="e.g. Harvest Celebration Speech Highlights"
                          className="bg-[#001f1a] border-[#ffd700]/25 text-white placeholder:text-gray-500 text-xs"
                        />
                      </div>

                      <Button
                        type="submit"
                        disabled={isSubmitting || !parsedCurrentVideo.isValid}
                        className="w-full bg-[#ffd700] hover:bg-[#ffe44d] text-[#002520] font-bold text-xs py-2 rounded-xl shadow cursor-pointer transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {isSubmitting ? (
                          'Saving Video Hyperlink...'
                        ) : (
                          <>
                            <LinkIcon className="w-3.5 h-3.5" />
                            Save Video Hyperlink to Album
                          </>
                        )}
                      </Button>
                    </form>
                  )}
                </Card>
              )}

              {/* Active Album Media Render Grid */}
              <div className="space-y-4">
                <div className="flex justify-between items-center px-1">
                  <h4 className="text-sm font-bold text-[#ffd700] uppercase tracking-wider flex items-center gap-2">
                    <Film className="w-4 h-4 text-[#ffd700]" />
                    Media Gallery ({galleryItems.length})
                  </h4>
                  {loadingItems && <span className="text-xs text-emerald-400 animate-pulse">Loading gallery...</span>}
                </div>

                {galleryItems.length === 0 ? (
                  <Card className="bg-[#002520]/60 border border-[#ffd700]/15 p-8 text-center rounded-2xl">
                    <ImageIcon className="w-10 h-10 text-emerald-500/30 mx-auto mb-2" />
                    <p className="text-xs text-emerald-100/60 font-medium">
                      This album is currently empty. Use the Intake Panel above to add photos or YouTube/Vimeo links.
                    </p>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {galleryItems.map((item) => {
                      const isVideo = Boolean(item.video_url);
                      const videoDetails = isVideo ? parseVideoUrl(item.video_url) : null;

                      return (
                        <div
                          key={item.id}
                          className="group bg-[#00231d] border border-[#ffd700]/20 rounded-xl overflow-hidden shadow-lg transition-all hover:border-[#ffd700]/60 relative flex flex-col"
                        >
                          {/* Item Thumbnail / Overlay Box */}
                          <div className="relative h-48 md:h-56 w-full bg-slate-950 overflow-hidden flex items-center justify-center p-1">
                            {isVideo && videoDetails ? (
                              /* Video Player Card Overlay */
                              <div
                                onClick={() => setActiveVideoItem(item)}
                                className="w-full h-full relative cursor-pointer group/vid flex items-center justify-center"
                              >
                                {videoDetails.thumbnailUrl ? (
                                  <img
                                    src={videoDetails.thumbnailUrl}
                                    alt={item.title || 'Video'}
                                    className="w-full h-full object-contain transition-transform duration-300 group-hover/vid:scale-105"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gradient-to-br from-[#003830] to-[#001713] flex flex-col items-center justify-center p-4 text-center">
                                    <Video className="w-10 h-10 text-[#ffd700] mb-1 opacity-80" />
                                    <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-widest">
                                      {videoDetails.platform} Stream
                                    </span>
                                  </div>
                                )}

                                {/* Play Overlay Badge */}
                                <div className="absolute inset-0 bg-black/40 group-hover/vid:bg-black/20 transition-colors flex items-center justify-center">
                                  <div className="w-12 h-12 rounded-full bg-[#ffd700] text-[#002520] flex items-center justify-center shadow-2xl transition-transform group-hover/vid:scale-110">
                                    <Play className="w-6 h-6 fill-current ml-0.5" />
                                  </div>
                                </div>

                                {/* Video Platform Badge */}
                                <div className="absolute top-2 left-2 px-2 py-0.5 rounded text-[9px] font-extrabold uppercase bg-black/70 text-[#ffd700] border border-[#ffd700]/30 backdrop-blur-sm">
                                  {videoDetails.platform}
                                </div>
                              </div>
                            ) : item.media_url ? (
                              /* Image Box */
                              <div
                                onClick={() => setPreviewImageItem(item)}
                                className="w-full h-full relative cursor-pointer group/img flex items-center justify-center"
                              >
                                <img
                                  src={item.media_url}
                                  alt={item.title || 'Gallery Media'}
                                  className="w-full h-full object-contain transition-transform duration-300 group-hover/img:scale-105"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/30 transition-colors flex items-center justify-center">
                                  <ExternalLink className="w-6 h-6 text-white opacity-0 group-hover/img:opacity-100 transition-opacity" />
                                </div>
                              </div>
                            ) : (
                              <div className="text-gray-500 text-xs">No preview available</div>
                            )}

                            {/* Delete Item Overlay Button */}
                            {isExecutive && (
                              <button
                                onClick={() => handleDeleteItem(item.id)}
                                className="absolute top-2 right-2 p-1.5 rounded-lg bg-rose-950/80 text-rose-300 hover:bg-rose-900 border border-rose-500/40 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Remove Item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          {/* Footer Info */}
                          <div className="p-3 bg-[#002520] border-t border-[#ffd700]/10 flex-grow flex flex-col justify-between">
                            <h5 className="text-xs font-bold text-white line-clamp-1">
                              {item.title || (isVideo ? 'External Video' : 'Gallery Asset')}
                            </h5>
                            <span className="text-[10px] text-emerald-200/50 mt-1">
                              {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Recent'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            <Card className="bg-[#002520]/70 border border-[#ffd700]/20 p-12 text-center rounded-2xl flex flex-col items-center justify-center min-h-[300px]">
              <Layers className="w-12 h-12 text-[#ffd700]/40 mb-3" />
              <h4 className="text-base font-bold text-[#ffd700]">Select an Album to View Media</h4>
              <p className="text-xs text-emerald-200/60 max-w-sm mt-1">
                Choose an album from the Directory on the left to manage media files and video hyperlinks.
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* Modal 1: Create New Album Modal */}
      {showAlbumModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#002b25] border border-[#ffd700]/40 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-[#ffd700]/20 pb-3">
              <h3 className="text-base font-bold text-[#ffd700] flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-[#ffd700]" />
                Create General Album
              </h3>
              <button
                onClick={() => setShowAlbumModal(false)}
                className="text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAlbum} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-emerald-200/80 mb-1 block">
                  Album Name / Title *
                </label>
                <Input
                  required
                  value={newAlbumName}
                  onChange={(e) => setNewAlbumName(e.target.value)}
                  placeholder="e.g. 2026 Harvest Committee Meeting"
                  className="bg-[#001f1a] border-[#ffd700]/30 text-white text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-emerald-200/80 mb-1 block">
                  Category Tag *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      type="button"
                      key={cat}
                      onClick={() => setNewAlbumCategory(cat)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                        newAlbumCategory === cat
                          ? 'bg-[#ffd700] text-[#002520] border-[#ffd700]'
                          : 'bg-[#001f1a] text-emerald-200/70 border-[#ffd700]/20 hover:border-[#ffd700]/50'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-emerald-200/80 mb-1 block">
                  Description / Purpose (Optional)
                </label>
                <textarea
                  rows={3}
                  value={newAlbumDescription}
                  onChange={(e) => setNewAlbumDescription(e.target.value)}
                  placeholder="Brief context regarding this event or non-sports activity..."
                  className="w-full bg-[#001f1a] border border-[#ffd700]/30 rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-[#ffd700]"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  onClick={() => setShowAlbumModal(false)}
                  className="w-1/2 bg-transparent hover:bg-white/10 text-gray-300 border border-white/20 text-xs py-2 rounded-xl cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-1/2 bg-[#ffd700] hover:bg-[#ffe44d] text-[#002520] font-bold text-xs py-2 rounded-xl shadow cursor-pointer"
                >
                  {isSubmitting ? 'Creating...' : 'Create Album'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Video Player Embed Modal */}
      {activeVideoItem && activeVideoItem.video_url && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#002520] border border-[#ffd700]/50 rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl space-y-0">
            <div className="p-4 bg-[#001f1a] border-b border-[#ffd700]/20 flex justify-between items-center">
              <div>
                <h4 className="text-sm font-bold text-[#ffd700]">
                  {activeVideoItem.title || 'Video Stream Playback'}
                </h4>
                <p className="text-[10px] text-emerald-200/60">{activeVideoItem.video_url}</p>
              </div>
              <button
                onClick={() => setActiveVideoItem(null)}
                className="text-gray-400 hover:text-white p-1 rounded-lg bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative aspect-video bg-black">
              {(() => {
                const info = parseVideoUrl(activeVideoItem.video_url);
                if (info.embedUrl) {
                  return (
                    <iframe
                      src={info.embedUrl}
                      title={activeVideoItem.title || 'Video Player'}
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  );
                }
                return (
                  <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
                    <p className="text-rose-400 text-sm mb-2">Unable to embed video stream directly.</p>
                    <a
                      href={activeVideoItem.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-[#ffd700] text-[#002520] font-bold text-xs rounded-xl flex items-center gap-2"
                    >
                      Open Video Link Directly <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Full-Size Image Preview Modal */}
      {previewImageItem && previewImageItem.media_url && (
        <div
          onClick={() => setPreviewImageItem(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-5xl max-h-[90vh] bg-slate-950/95 overflow-hidden rounded-2xl border border-[#ffd700]/40 flex flex-col items-center justify-center p-2 shadow-2xl">
            <img
              src={previewImageItem.media_url}
              alt={previewImageItem.title || 'Full Image'}
              className="max-w-full max-h-[85vh] object-contain mx-auto"
            />
            {previewImageItem.title && (
              <div className="absolute bottom-0 inset-x-0 bg-black/80 p-3 text-center text-xs text-[#ffd700] font-semibold">
                {previewImageItem.title}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
