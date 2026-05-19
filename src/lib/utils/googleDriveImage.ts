/** Google Drive file IDs are alphanumeric, hyphen, underscore; typically 20–44 chars (legacy can be shorter) */
const VALID_FILE_ID_REGEX = /^[a-zA-Z0-9_-]{15,50}$/;

/** Hosts that should be loaded via `/api/images/proxy` (avoids wrong Content-Type → green corrupt decode). */
export function isGoogleHostedImageUrl(url: string | null | undefined): boolean {
  if (!url?.trim()) return false;
  return (
    /drive\.google\.com/i.test(url) ||
    /googleusercontent\.com/i.test(url) ||
    /drive\.usercontent\.google/i.test(url)
  );
}

/**
 * Sniffs image format from magic bytes. Never trust CDN Content-Type alone — Drive often
 * labels WebP/PNG bodies as image/jpeg, which browsers decode as green/purple garbage.
 */
export function detectImageContentType(data: ArrayBuffer | Uint8Array): string | null {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  if (bytes.length < 12) return null;

  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'image/png';
  }

  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }

  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
    return 'image/gif';
  }

  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'image/webp';
  }

  if (bytes.length >= 12) {
    const ftyp =
      bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70;
    if (ftyp) {
      const b = (i: number) => bytes[i] ?? 0;
      const brand = String.fromCharCode(b(8), b(9), b(10), b(11));
      if (brand === 'avif' || brand === 'avis') return 'image/avif';
      if (brand === 'heic' || brand === 'heix' || brand === 'mif1' || brand === 'msf1') {
        return 'image/heic';
      }
    }
  }

  return null;
}

/**
 * Sanitizes a possibly malformed fileId (e.g. "id&url=..." from mangled query strings).
 * Returns only the first valid Google Drive file ID segment.
 */
export function sanitizeGoogleDriveFileId(fileId: string | null | undefined): string | null {
  if (!fileId || typeof fileId !== 'string') return null;
  let trimmed = fileId.trim();

  // Normalize common "escaped ampersand" variants that can appear when a URL
  // was serialized through JSON/HTML and then partially stripped/decoded.
  // Examples we’ve seen in logs:
  // - "...\u0026url=..." (literal backslash-u sequence)
  // - "...u0026url=..." (backslash stripped, leaving "u0026")
  trimmed = trimmed.replace(/\\u0026/gi, '&');
  trimmed = trimmed.replace(/u0026/gi, '&');

  // If the value contains & it may be a mangled "id&url=..." query string
  const firstSegment = trimmed.includes('&') ? trimmed.split('&')[0]!.trim() : trimmed;
  if (VALID_FILE_ID_REGEX.test(firstSegment)) return firstSegment;
  // Extract first substring that looks like a Drive file ID
  const match = trimmed.match(/[a-zA-Z0-9_-]{15,50}/);
  return match ? match[0]! : null;
}

/**
 * Extracts file ID from Google Drive URL
 */
export function getGoogleDriveFileId(url: string | null | undefined): string | null {
  if (!url) return null;

  const decoded = decodeUrlEntities(url.trim());

  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    /[?&]id=([a-zA-Z0-9_-]+)/,
    /\/thumbnail\?id=([a-zA-Z0-9_-]+)/,
    /^https?:\/\/lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/,
    /^https?:\/\/drive\.usercontent\.google\.com\/download\?id=([a-zA-Z0-9_-]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = decoded.match(pattern);
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

  const trimmed = decodeUrlEntities(url.trim());
  const fileId = getGoogleDriveFileId(trimmed);
  if (fileId && /drive\.google\.com/i.test(trimmed)) {
    return `https://drive.google.com/uc?export=view&id=${fileId}`;
  }

  if (trimmed.includes('drive.google.com/uc') && /[?&]id=/.test(trimmed)) {
    return trimmed;
  }

  return trimmed;
}

/** Decode common HTML/JSON entity encodings in pasted image URLs. */
export function decodeUrlEntities(url: string): string {
  return url
    .replace(/&amp;/gi, '&')
    .replace(/&#0*38;/gi, '&')
    .replace(/\\u0026/gi, '&')
    .replace(/u0026/gi, '&');
}

/**
 * Gets multiple URL formats for Google Drive images to try as fallbacks
 */
export function getGoogleDriveImageUrls(url: string | null | undefined): string[] {
  if (!url) return [];
  
  const fileId = getGoogleDriveFileId(url);
  if (!fileId) return [url];
  
  // Thumbnail + lh3 with size suffix are most reliable for link-shared files from servers
  return [
    `https://drive.google.com/thumbnail?id=${fileId}&sz=w1920`,
    `https://lh3.googleusercontent.com/d/${fileId}=w1920-rw`,
    `https://lh3.googleusercontent.com/d/${fileId}`,
    `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`,
    `https://drive.google.com/uc?export=download&id=${fileId}`,
    `https://drive.usercontent.google.com/download?id=${fileId}&export=download`,
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
 * Checks if a URL is likely an animated image (GIF) that should use unoptimized
 * @param url - The URL to check
 * @returns true if the URL appears to be an animated GIF
 */
export function isAnimatedImage(url: string | null | undefined): boolean {
  if (!url) return false;
  // Check if URL ends with .gif or contains .gif (case-insensitive)
  const lowerUrl = url.toLowerCase();
  return lowerUrl.includes('.gif') || lowerUrl.endsWith('.gif');
}

/** Default placeholder when no image URL is set (Wikimedia, public domain). */
export const IMAGE_PLACEHOLDER_URL =
  'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Placeholder_view_vector.svg/960px-Placeholder_view_vector.svg.png';

const IMAGE_EXTENSION = /\.(jpe?g|png|gif|webp|svg|avif|bmp|ico)(\?|#|$)/i;

/**
 * Returns true when a URL likely points at an image (direct file, Google Drive file link, etc.).
 */
export function isImageUrl(url: string | null | undefined): boolean {
  if (!url?.trim()) return false;
  const trimmed = url.trim();

  if (/drive\.google\.com\/(document|spreadsheets|presentation|drive\/folders)/i.test(trimmed)) {
    return false;
  }
  if (/drive\.google\.com\/(file\/d\/|open\?id=|uc\?)/i.test(trimmed)) return true;
  if (/lh3\.googleusercontent\.com\//i.test(trimmed)) return true;
  if (/drive\.usercontent\.google\.com\//i.test(trimmed)) return true;
  if (/i\.pinimg\.com\//i.test(trimmed)) return true;
  if (/i\.imgur\.com\//i.test(trimmed)) return true;
  if (/cdn\.discordapp\.com\/|media\.discordapp\.net\//i.test(trimmed)) return true;
  if (/i\.ibb\.co\/|i\.postimg\.cc\/|postimg\.cc\//i.test(trimmed)) return true;
  if (/files\.catbox\.moe\//i.test(trimmed)) return true;
  if (/static\.wikia\.nocookie\.net\//i.test(trimmed)) return true;
  if (/supabase\.co\/storage\/v1\/object\//i.test(trimmed)) return true;
  if (trimmed.startsWith('/api/images/proxy')) return true;
  if (IMAGE_EXTENSION.test(trimmed)) return true;

  try {
    const { pathname, search, hostname } = new URL(trimmed);
    if (IMAGE_EXTENSION.test(pathname)) return true;
    if (/[?&]id=[a-zA-Z0-9_-]+/i.test(search) && /thumbnail|export=view/i.test(trimmed)) {
      return true;
    }
    // Hosts that serve images without file extensions in the path
    if (
      /^(i\.imgur\.com|cdn\.discordapp\.com|media\.discordapp\.net|i\.ibb\.co|i\.postimg\.cc)$/i.test(
        hostname
      )
    ) {
      return true;
    }
  } catch {
    // not a valid absolute URL
  }

  return false;
}

/**
 * When true, bypasses `/_next/image` so the browser loads `src` directly.
 * User-provided images come from many CDNs (Wikimedia, Pinterest, Fandom, etc.);
 * only same-origin static assets use the Next.js image optimizer.
 */
export function shouldUseUnoptimizedImage(src: string | null | undefined): boolean {
  if (!src || !src.trim()) return true;
  if (isGoogleSitesUrl(src) || isAnimatedImage(src)) return true;
  if (src.startsWith('/api/images/proxy')) return true;

  // Same-origin paths (e.g. /images/logo.png) — allow optimization
  if (src.startsWith('/') && !src.startsWith('//')) {
    return false;
  }

  // All external URLs — load directly to avoid remotePatterns / optimizer 400s
  if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('//')) {
    return true;
  }

  return true;
}

/**
 * Converts a Google Drive URL to use our proxy API to bypass CORS
 * Returns the original URL if it's not a Google Drive URL
 * @param url - The Google Drive URL or any other URL
 * @returns The proxy URL for Google Drive images, or the original URL
 */
export function getProxyUrl(url: string | null | undefined): string {
  if (!url) return '';

  const trimmed = decodeUrlEntities(url.trim());
  const fileId = getGoogleDriveFileId(trimmed);
  if (fileId && isGoogleHostedImageUrl(trimmed)) {
    return `/api/images/proxy?fileId=${encodeURIComponent(fileId)}&url=${encodeURIComponent(trimmed)}`;
  }

  return trimmed;
}

/** True when the browser decoded a 1×1 image (our proxy error fallback is a transparent PNG). */
export function isTinyPlaceholderImage(naturalWidth: number, naturalHeight: number): boolean {
  return naturalWidth <= 1 && naturalHeight <= 1;
}

/**
 * Ordered URLs to try in the browser when the proxy returns a 1×1 fallback or fails.
 * Skips duplicates and the proxy path itself.
 */
export function getBrowserImageFallbackUrls(url: string | null | undefined): string[] {
  if (!url?.trim()) return [];
  const trimmed = decodeUrlEntities(url.trim());
  const fileId = getGoogleDriveFileId(trimmed);
  if (!fileId) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const candidate of getGoogleDriveImageUrls(trimmed)) {
    if (seen.has(candidate) || candidate.startsWith('/api/images/proxy')) continue;
    seen.add(candidate);
    out.push(candidate);
  }
  return out;
}

/**
 * Resolves a user image URL for display: Google-hosted → proxy, Drive share links → direct view, else as-is.
 */
export function resolveImageSrc(url: string | null | undefined): string {
  if (!url?.trim()) return IMAGE_PLACEHOLDER_URL;
  const trimmed = decodeUrlEntities(url.trim());
  if (isGoogleHostedImageUrl(trimmed)) {
    const proxied = getProxyUrl(trimmed);
    if (proxied.startsWith('/api/images/proxy')) return proxied;
    // Never load Drive/googleusercontent URLs directly — wrong Content-Type → green corrupt decode
    return IMAGE_PLACEHOLDER_URL;
  }
  const converted = convertGoogleDriveUrl(trimmed);
  return converted || IMAGE_PLACEHOLDER_URL;
}

/**
 * Prepare markdown from textareas for rendering: bare image URL lines, HTML img tags,
 * and entity-encoded URLs become proper `![](url)` images.
 */
export function preprocessMarkdownContent(content: string): string {
  if (!content) return '';

  let text = content.replace(/\r\n/g, '\n');

  text = text.replace(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*\/?>/gi, (_, src: string) => {
    const url = decodeUrlEntities(src.trim());
    return isImageUrl(url) ? `\n\n![](${url})\n\n` : `\n\n${src}\n\n`;
  });

  text = text
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('![')) return line;

      const angleUrl = trimmed.match(/^<(https?:\/\/[^>]+)>$/);
      const plainUrl = trimmed.match(/^(https?:\/\/\S+)$/);
      const mdLink = trimmed.match(/^\[[^\]]*\]\((https?:\/\/[^)\s]+)\)$/);

      const raw = (angleUrl?.[1] ?? plainUrl?.[1] ?? mdLink?.[1])?.replace(/[),.;\]]+$/, '');
      if (!raw) return line;

      const url = decodeUrlEntities(raw);
      if (isImageUrl(url)) {
        return `![](${url})`;
      }
      return line;
    })
    .join('\n');

  return text;
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













