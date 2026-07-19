import { supabase } from '../lib/supabaseClient';
import { GeneralAlbum, GeneralGalleryItem, AlbumCategory } from '../types';
import { isValidVideoUrl } from './videoUtils';

/**
 * Service layer for managing General Non-Sports Albums & Media/Video Link Pipeline.
 * Integrates directly with Supabase tables: public.cmo_general_albums and public.cmo_general_gallery
 * and storage bucket: cmo-gallery
 */

export const generalGalleryService = {
  /**
   * Fetch all general albums with item counts
   */
  async fetchAlbums(): Promise<GeneralAlbum[]> {
    try {
      const { data: albumsData, error: albumsError } = await supabase
        .from('cmo_general_albums')
        .select('*')
        .order('created_at', { ascending: false });

      if (albumsError) {
        console.error('Error fetching general albums:', albumsError.message);
        return [];
      }

      if (!albumsData || albumsData.length === 0) {
        return [];
      }

      // Fetch count of gallery items per album
      const { data: itemsData, error: itemsError } = await supabase
        .from('cmo_general_gallery')
        .select('album_id');

      const countMap: Record<string, number> = {};
      if (!itemsError && itemsData) {
        itemsData.forEach((item) => {
          if (item.album_id) {
            countMap[item.album_id] = (countMap[item.album_id] || 0) + 1;
          }
        });
      }

      return albumsData.map((album) => ({
        id: album.id,
        name: album.name || album.title || 'Untitled Album',
        title: album.title || album.name || 'Untitled Album',
        category: (album.category as AlbumCategory) || 'General',
        description: album.description || '',
        created_at: album.created_at,
        created_by: album.created_by,
        item_count: countMap[album.id] || 0,
      }));
    } catch (err) {
      console.error('Failed to load general albums:', err);
      return [];
    }
  },

  /**
   * Create a new General Album
   */
  async createAlbum(
    name: string,
    category: AlbumCategory,
    description?: string,
    createdBy?: string
  ): Promise<GeneralAlbum | null> {
    try {
      const payload = {
        name: name.trim(),
        title: name.trim(),
        category,
        description: description?.trim() || '',
        created_by: createdBy || 'Administrator',
      };

      const { data, error } = await supabase
        .from('cmo_general_albums')
        .insert([payload])
        .select()
        .single();

      if (error) {
        console.error('Error creating general album:', error.message);
        throw new Error(error.message);
      }

      return {
        id: data.id,
        name: data.name || data.title || name,
        title: data.title || data.name || name,
        category: data.category as AlbumCategory,
        description: data.description,
        created_at: data.created_at,
        created_by: data.created_by,
        item_count: 0,
      };
    } catch (err: any) {
      console.error('Create album exception:', err);
      throw err;
    }
  },

  /**
   * Delete an album and its associated media
   */
  async deleteAlbum(albumId: string): Promise<boolean> {
    try {
      // 1. Delete items in cmo_general_gallery first
      await supabase
        .from('cmo_general_gallery')
        .delete()
        .eq('album_id', albumId);

      // 2. Delete the album entry
      const { error } = await supabase
        .from('cmo_general_albums')
        .delete()
        .eq('id', albumId);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Failed to delete album:', err);
      return false;
    }
  },

  /**
   * Fetch gallery items (images or video links) for a specific album or all
   */
  async fetchGalleryItems(albumId?: string): Promise<GeneralGalleryItem[]> {
    try {
      let query = supabase
        .from('cmo_general_gallery')
        .select('*')
        .order('created_at', { ascending: false });

      if (albumId) {
        query = query.eq('album_id', albumId);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Error fetching gallery items:', error.message);
        return [];
      }

      return (data || []).map((item) => ({
        id: item.id,
        album_id: item.album_id,
        media_url: item.media_url,
        video_url: item.video_url,
        title: item.title || '',
        uploaded_by: item.uploaded_by,
        created_at: item.created_at,
      }));
    } catch (err) {
      console.error('Failed to load gallery items:', err);
      return [];
    }
  },

  /**
   * Upload image/media file to Supabase storage bucket `cmo-gallery` and insert into database
   */
  async uploadMediaFile(
    albumId: string,
    file: File | Blob,
    title?: string,
    uploadedBy?: string
  ): Promise<GeneralGalleryItem | null> {
    try {
      const fileName = file instanceof File ? file.name : 'upload.jpg';
      const fileExt = fileName.split('.').pop() || 'jpg';
      const storagePath = `general/${albumId}/${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;

      // 1. Upload file to cmo-gallery bucket
      const { error: uploadError } = await supabase.storage
        .from('cmo-gallery')
        .upload(storagePath, file, { upsert: true });

      if (uploadError) {
        console.error('Storage upload error (cmo-gallery):', uploadError.message);
        throw new Error(`Storage error: ${uploadError.message}`);
      }

      // 2. Obtain Public URL
      const { data: publicUrlData } = supabase.storage
        .from('cmo-gallery')
        .getPublicUrl(storagePath);

      const mediaUrl = publicUrlData.publicUrl;

      // 3. Save database record in cmo_general_gallery
      const { data, error: dbError } = await supabase
        .from('cmo_general_gallery')
        .insert([
          {
            album_id: albumId,
            media_url: mediaUrl,
            video_url: null,
            title: title?.trim() || fileName,
            uploaded_by: uploadedBy || null,
          },
        ])
        .select()
        .single();

      if (dbError) {
        console.error('Database insert error for media item:', dbError.message);
        throw new Error(dbError.message);
      }

      return {
        id: data.id,
        album_id: data.album_id,
        media_url: data.media_url,
        video_url: data.video_url,
        title: data.title,
        uploaded_by: data.uploaded_by,
        created_at: data.created_at,
      };
    } catch (err: any) {
      console.error('Upload media file catch error:', err);
      throw err;
    }
  },

  /**
   * Save external YouTube / Vimeo Video URL hyperlink directly to database
   */
  async addVideoLink(
    albumId: string,
    videoUrl: string,
    title?: string,
    uploadedBy?: string
  ): Promise<GeneralGalleryItem | null> {
    try {
      const cleanUrl = videoUrl.trim();
      if (!isValidVideoUrl(cleanUrl)) {
        throw new Error('Invalid video URL. Please provide a valid YouTube or Vimeo link.');
      }

      const { data, error } = await supabase
        .from('cmo_general_gallery')
        .insert([
          {
            album_id: albumId,
            media_url: null,
            video_url: cleanUrl,
            title: title?.trim() || 'External Video Link',
            uploaded_by: uploadedBy || null,
          },
        ])
        .select()
        .single();

      if (error) {
        console.error('Database insert error for video link:', error.message);
        throw new Error(error.message);
      }

      return {
        id: data.id,
        album_id: data.album_id,
        media_url: data.media_url,
        video_url: data.video_url,
        title: data.title,
        uploaded_by: data.uploaded_by,
        created_at: data.created_at,
      };
    } catch (err: any) {
      console.error('Add video link catch error:', err);
      throw err;
    }
  },

  /**
   * Delete a single gallery media item
   */
  async deleteGalleryItem(itemId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('cmo_general_gallery')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Failed to delete gallery item:', err);
      return false;
    }
  },
};
