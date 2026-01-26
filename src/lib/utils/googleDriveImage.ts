/**
 * Extracts file ID from Google Drive URL
 */
export function getGoogleDriveFileId(url: string | null | undefined): string | null {
  if (!url) return null;
  
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    /[?&]id=([a-zA-Z0-9_-]+)/,
    /\/thumbnail\?id=([a-zA-Z0-9_-]+)/,
    /^https?:\/\/lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/,
    /^https?:\/\/drive\.usercontent\.google\.com\/download\?id=([a-zA-Z0-9_-]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * Converts a Google Drive sharing link to a direct image URL
 * 
 * Supports formats:
 * - https://drive.google.com/file/d/{FILE_ID}/view?usp=sharing
 * - https://drive.google.com/file/d/{FILE_ID}/view
 * - https://drive.google.com/open?id={FILE_ID}
 * 
 * @param url - The Google Drive sharing URL or any other image URL
 * @returns The direct image URL if it's a Google Drive link, otherwise returns the original URL
 */
export function convertGoogleDriveUrl(url: string | null | undefined): string {
  if (!url) return '';
  
  // Pattern 1: https://drive.google.com/file/d/{FILE_ID}/view?usp=sharing
  const pattern1 = /^https?:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)\/view/;
  const match1 = url.match(pattern1);
  if (match1) {
    return `https://drive.google.com/uc?export=view&id=${match1[1]}`;
  }
  
  // Pattern 2: https://drive.google.com/open?id={FILE_ID}
  const pattern2 = /^https?:\/\/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/;
  const match2 = url.match(pattern2);
  if (match2) {
    return `https://drive.google.com/uc?export=view&id=${match2[1]}`;
  }
  
  // Pattern 3: Already a direct Google Drive image URL (uc?export=view&id=...)
  if (url.includes('drive.google.com/uc?export=view&id=')) {
    return url;
  }
  
  // Not a Google Drive link, return as-is
  return url;
}

/**
 * Gets multiple URL formats for Google Drive images to try as fallbacks
 */
export function getGoogleDriveImageUrls(url: string | null | undefined): string[] {
  if (!url) return [];
  
  const fileId = getGoogleDriveFileId(url);
  if (!fileId) return [url];
  
  // Try multiple formats - thumbnail API is often more reliable
  return [
    `https://lh3.googleusercontent.com/d/${fileId}`, // Google CDN (most reliable)
    `https://drive.google.com/thumbnail?id=${fileId}&sz=w1920-h1080`, // Thumbnail API with size
    `https://drive.google.com/thumbnail?id=${fileId}`, // Thumbnail API
    `https://drive.google.com/uc?export=view&id=${fileId}`, // Direct view
    `https://drive.google.com/uc?export=download&id=${fileId}`, // Direct download (sometimes more reliable)
    `https://drive.usercontent.google.com/download?id=${fileId}&export=view`, // Newer direct download host
  ];
}

/**
 * Checks if a URL is from Google Sites (which blocks server-side image optimization)
 * @param url - The URL to check
 * @returns true if the URL is from Google Sites
 */
export function isGoogleSitesUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.includes('lh3.googleusercontent.com/sitesv');
}

/**
 * Converts a Google Drive URL to use our proxy API to bypass CORS
 * Returns the original URL if it's not a Google Drive URL
 * @param url - The Google Drive URL or any other URL
 * @returns The proxy URL for Google Drive images, or the original URL
 */
export function getProxyUrl(url: string | null | undefined): string {
  if (!url) return '';
  
  if (url.includes('drive.google.com')) {
    const fileId = getGoogleDriveFileId(url);
    if (fileId) {
      return `/api/images/proxy?fileId=${encodeURIComponent(fileId)}&url=${encodeURIComponent(url)}`;
    }
  }
  
  return url;
}

/**
 * Get absolute icon URL with proper Google Drive conversion
 * For metadata use, we need absolute URLs
 * @param url - The icon URL (can be relative, absolute, or Google Drive)
 * @param baseUrl - The base URL of the site
 * @param useProxy - Whether to use proxy API for Google Drive URLs (default: false)
 * @returns Absolute URL ready for metadata
 */
export function getAbsoluteIconUrl(
  url: string | null | undefined,
  baseUrl: string,
  useProxy: boolean = false
): string {
  if (!url) {
    return url?.startsWith('http') ? url : `${baseUrl}/images/logo.png`;
  }

  // Convert Google Drive URLs
  const convertedUrl = convertGoogleDriveUrl(url);

  // For Google Drive URLs in metadata, use proxy API if requested
  if (useProxy && url.includes('drive.google.com')) {
    const fileId = getGoogleDriveFileId(url);
    if (fileId) {
      return `${baseUrl}/api/images/proxy?fileId=${encodeURIComponent(fileId)}&url=${encodeURIComponent(url)}`;
    }
  }

  // Return absolute URL
  if (convertedUrl.startsWith('http://') || convertedUrl.startsWith('https://')) {
    return convertedUrl;
  }

  // Make relative URLs absolute
  const cleanUrl = convertedUrl.startsWith('/') ? convertedUrl : `/${convertedUrl}`;
  const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  return `${cleanBase}${cleanUrl}`;
}













