import { NextRequest, NextResponse } from 'next/server';
import { fetchDriveFileMediaBuffer } from '@/lib/google-drive/galleryDrive';
import { getGoogleDriveFileId, getGoogleDriveImageUrls, sanitizeGoogleDriveFileId } from '@/lib/utils/googleDriveImage';
import { logger } from '@/lib/logger';

/** Not `immutable` so clients can recover if an older proxy build cached a bad body as an image. */
const PROXY_CACHE_CONTROL = 'public, max-age=604800';

/** Node Buffer is not assignable to `BodyInit` under strict DOM typings. */
function bufferAsBody(buf: Buffer): BodyInit {
  return new Uint8Array(buf);
}

/**
 * API route to proxy Google Drive images
 * This bypasses CORS restrictions by fetching images server-side
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get('url');
  const rawFileId = searchParams.get('fileId');

  if (!url && !rawFileId) {
    // This route is occasionally hit by bots/health checks without query params.
    // Return a tiny transparent image to avoid broken-image icons + reduce log noise.
    logger.info('ImageProxy', 'Missing url or fileId parameter', { url, fileId: rawFileId });
    const transparentPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    return new NextResponse(bufferAsBody(transparentPng), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-cache',
        'X-Image-Error': 'true',
      },
    });
  }

  // Prefer file ID from URL to avoid mangled query params; sanitize if provided as fileId
  const fromUrl = url ? getGoogleDriveFileId(url) : null;
  const driveFileId = fromUrl ?? sanitizeGoogleDriveFileId(rawFileId);
  
  if (!driveFileId) {
    logger.warn('ImageProxy', 'Invalid Google Drive URL or file ID', { url, fileId: rawFileId });
    return NextResponse.json(
      { error: 'Invalid Google Drive URL or file ID' },
      { status: 400 }
    );
  }

  // Try multiple URL formats in parallel for faster response
  const urls = url 
    ? getGoogleDriveImageUrls(url)
    : [
        `https://lh3.googleusercontent.com/d/${driveFileId}`,
        `https://drive.google.com/thumbnail?id=${driveFileId}&sz=w1920-h1080`,
        `https://drive.google.com/thumbnail?id=${driveFileId}`,
        `https://drive.google.com/uc?export=view&id=${driveFileId}`,
        `https://drive.google.com/uc?export=download&id=${driveFileId}`,
        `https://drive.usercontent.google.com/download?id=${driveFileId}&export=view`,
      ];

  const errors: Array<{ url: string; error: string; status?: number; contentType?: string }> = [];

  // Cap buffer size to avoid memory spikes (8MB per image)
  const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

  const detectImageContentType = (data: ArrayBuffer | Uint8Array): string | null => {
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
    if (bytes.length < 12) return null;

    // PNG: 89 50 4E 47 0D 0A 1A 0A
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

    // JPEG: FF D8 FF
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
      return 'image/jpeg';
    }

    // GIF: "GIF8"
    if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
      return 'image/gif';
    }

    // WebP: "RIFF" .... "WEBP"
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

    // AVIF / HEIF: .... "ftyp" + brand (avif, avis, heic, heix, mif1)
    if (bytes.length >= 12) {
      const ftyp =
        bytes[4] === 0x66 &&
        bytes[5] === 0x74 &&
        bytes[6] === 0x79 &&
        bytes[7] === 0x70;
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
  };

  const driveApiMedia = await fetchDriveFileMediaBuffer(driveFileId, MAX_IMAGE_BYTES);
  if (driveApiMedia) {
    const { buffer, contentTypeHeader } = driveApiMedia;
    const detected = detectImageContentType(buffer);
    const headerBase = contentTypeHeader?.split(';')[0]?.trim() || '';

    let contentType: string | null = detected;
    if (!contentType && headerBase.startsWith('image/')) {
      contentType = headerBase;
    }

    if (!contentType) {
      const snippet = buffer.subarray(0, Math.min(buffer.length, 2048)).toString('utf-8');
      const looksLikeHtml =
        /^\s*</.test(snippet) && /<(html|head|body|!doctype)\b/i.test(snippet);
      if (!looksLikeHtml && buffer.length > 100) {
        contentType = null;
      }
    }

    if (contentType) {
      return new NextResponse(bufferAsBody(buffer), {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': PROXY_CACHE_CONTROL,
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET',
        },
      });
    }
  }

  // Helper function to fetch a single URL with timeout. Only one buffer in memory at a time.
  const fetchImageUrl = async (
    imageUrl: string,
    maxBytes: number
  ): Promise<{
    success: boolean;
    data?: ArrayBuffer;
    contentType?: string;
    status?: number;
    responseContentType?: string;
    error?: string;
  }> => {
    let timeoutId: NodeJS.Timeout | null = null;
    try {
      // Create abort controller for timeout (reduced to 5 seconds)
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch(imageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://drive.google.com/',
          'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: controller.signal,
        redirect: 'follow', // Follow redirects
      });
      
      if (timeoutId) clearTimeout(timeoutId);

      const responseContentType = response.headers.get('content-type') || '';
      const status = response.status;

      if (!response.ok) {
        let text = '';
        try {
          text = await response.text();
        } catch {
          // ignore
        }

        const isAccessPage = /accounts\.google\.com|servicelogin|sign in|request access|access denied/i.test(text);
        return {
          success: false,
          status,
          responseContentType,
          error: isAccessPage
            ? 'File not publicly accessible (login/access page)'
            : `HTTP ${status}${responseContentType ? ` (${responseContentType})` : ''}`,
        };
      }

      const contentLength = response.headers.get('content-length');
      if (contentLength) {
        const len = parseInt(contentLength, 10);
        if (!Number.isNaN(len) && len > maxBytes) {
          return {
            success: false,
            status,
            responseContentType,
            error: `Image too large (${Math.round(len / 1024 / 1024)}MB, max ${Math.round(maxBytes / 1024 / 1024)}MB)`,
          };
        }
      }

      const buffer = await response.arrayBuffer();
      if (buffer.byteLength > maxBytes) {
        return {
          success: false,
          status,
          responseContentType,
          error: `Image too large (${Math.round(buffer.byteLength / 1024 / 1024)}MB, max ${Math.round(maxBytes / 1024 / 1024)}MB)`,
        };
      }
      if (buffer.byteLength <= 100) {
        return {
          success: false,
          status,
          responseContentType,
          error: `Response too small (${buffer.byteLength} bytes) - likely not an image`,
        };
      }

      const detected = detectImageContentType(buffer);
      // Magic bytes must win: Drive/CDN often sends Content-Type: image/jpeg for PNG/WebP,
      // which makes browsers decode garbage (green/purple corrupt frames).
      if (detected) {
        return {
          success: true,
          status,
          responseContentType,
          data: buffer,
          contentType: detected,
        };
      }

      const baseResponseCt = responseContentType.split(';')[0]?.trim() || '';

      let snippet = '';
      try {
        const b = new Uint8Array(buffer);
        snippet = new TextDecoder('utf-8').decode(b.slice(0, 2048));
      } catch {
        // ignore
      }

      const isAccessPage = /accounts\.google\.com|servicelogin|sign in|request access|access denied/i.test(
        snippet
      );
      const looksLikeHtmlDoc =
        /^\s*</.test(snippet) && /<(html|head|body|!doctype)\b/i.test(snippet);

      if (baseResponseCt.startsWith('image/') && !isAccessPage && !looksLikeHtmlDoc) {
        return {
          success: true,
          status,
          responseContentType,
          data: buffer,
          contentType: baseResponseCt,
        };
      }

      // Likely HTML/error body with 200 OK
      return {
        success: false,
        status,
        responseContentType,
        error: isAccessPage
          ? 'File not publicly accessible (login/access page)'
          : `Non-image response received${responseContentType ? ` (${responseContentType})` : ''}`,
      };
    } catch (error) {
      // Clear timeout if still active
      if (timeoutId) clearTimeout(timeoutId);
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorName = error instanceof Error ? error.name : 'UnknownError';
      return { success: false, error: `${errorName}: ${errorMessage}` };
    }
  };

  // Try URLs sequentially. Only one buffer in memory at a time; return on first success.
  for (const imageUrl of urls) {
    const result = await fetchImageUrl(imageUrl, MAX_IMAGE_BYTES);
    if (result.success && result.data && result.contentType) {
      return new NextResponse(result.data, {
        status: 200,
        headers: {
          'Content-Type': result.contentType,
          'Cache-Control': PROXY_CACHE_CONTROL,
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET',
        },
      });
    }
    errors.push({
      url: imageUrl,
      error: result.error || 'Unknown error',
      status: result.status,
      contentType: result.responseContentType,
    });
  }

  // All URLs failed - log comprehensive error details
  const isPublicAccessIssue = errors.some(e => 
    e.error.includes('not publicly accessible') || 
    e.error.includes('login/access page') ||
    e.error.toLowerCase().includes('access denied') ||
    e.error.toLowerCase().includes('request access') ||
    e.status === 401 ||
    e.status === 403
  );

  const shouldLogAsError = errors.some(e => 
    (typeof e.status === 'number' && e.status >= 500) ||
    /AbortError|TypeError/i.test(e.error)
  );

  // For public access issues, use info level since it's a user configuration issue, not a code bug
  // For actual errors (500s, network issues), use error level
  // For other failures, use warn level
  if (isPublicAccessIssue) {
    logger.info('ImageProxy', 'Google Drive file not publicly accessible', {
      fileId: driveFileId,
      originalUrl: url,
      recommendation: 'File needs to be shared with "Anyone with the link" permission in Google Drive',
    });
  } else {
    const logFn = shouldLogAsError ? logger.error : logger.warn;
    logFn('ImageProxy', 'Failed to fetch Google Drive image after all attempts', {
      fileId: driveFileId,
      originalUrl: url,
      totalAttempts: urls.length,
      errors: errors.map(e => ({
        url: e.url,
        error: e.error,
        status: e.status,
        contentType: e.contentType,
      })),
      recommendation: 'Check if file exists and is accessible',
    });
  }

  // Return a 1x1 transparent PNG as fallback instead of JSON
  // This prevents the img tag from showing broken image icon
  const transparentPng = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );

  return new NextResponse(bufferAsBody(transparentPng), {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'no-cache',
      'X-Image-Error': 'true', // Custom header to indicate this is a fallback
      'X-Image-FileId': driveFileId, // Include file ID for debugging
      'X-Image-IsPublicAccessIssue': isPublicAccessIssue ? 'true' : 'false',
    },
  });
}

