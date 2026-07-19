export interface VideoDetails {
  platform: 'youtube' | 'vimeo' | 'unknown';
  videoId: string | null;
  embedUrl: string | null;
  thumbnailUrl: string | null;
  isValid: boolean;
}

/**
 * Parses external video links for YouTube and Vimeo platforms.
 */
export function parseVideoUrl(url: string | null | undefined): VideoDetails {
  if (!url || typeof url !== 'string') {
    return {
      platform: 'unknown',
      videoId: null,
      embedUrl: null,
      thumbnailUrl: null,
      isValid: false,
    };
  }

  const trimmed = url.trim();

  // 1. YouTube Matcher
  // Matches: youtube.com/watch?v=ID, youtube.com/embed/ID, youtube.com/v/ID, youtube.com/shorts/ID, youtu.be/ID
  const ytRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const ytMatch = trimmed.match(ytRegex);

  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1];
    return {
      platform: 'youtube',
      videoId,
      embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      isValid: true,
    };
  }

  // 2. Vimeo Matcher
  // Matches: vimeo.com/ID, player.vimeo.com/video/ID, vimeo.com/channels/*/ID, vimeo.com/groups/*/videos/ID
  const vimeoRegex = /(?:vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/[^\/]*\/videos\/|album\/\d+\/video\/|video\/|)|player\.vimeo\.com\/video\/)(\d+)/i;
  const vimeoMatch = trimmed.match(vimeoRegex);

  if (vimeoMatch && vimeoMatch[1]) {
    const videoId = vimeoMatch[1];
    return {
      platform: 'vimeo',
      videoId,
      embedUrl: `https://player.vimeo.com/video/${videoId}?autoplay=1&title=0&byline=0`,
      thumbnailUrl: null, // Will use styled Vimeo card overlay or fallback poster
      isValid: true,
    };
  }

  return {
    platform: 'unknown',
    videoId: null,
    embedUrl: null,
    thumbnailUrl: null,
    isValid: false,
  };
}

/**
 * Quick boolean checker for YouTube / Vimeo URL validation.
 */
export function isValidVideoUrl(url: string | null | undefined): boolean {
  return parseVideoUrl(url).isValid;
}
