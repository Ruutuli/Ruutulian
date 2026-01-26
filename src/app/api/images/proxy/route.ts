import { NextRequest, NextResponse } from 'next/server';
import { getGoogleDriveFileId, getGoogleDriveImageUrls } from '@/lib/utils/googleDriveImage';
import { logger } from '@/lib/logger';

/**
 * API route to proxy Google Drive images
 * This bypasses CORS restrictions by fetching images server-side
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get('url');
  const fileId = searchParams.get('fileId');

  if (!url && !fileId) {
    logger.warn('ImageProxy', 'Missing url or fileId parameter', { url, fileId });
    return NextResponse.json(
      { error: 'Missing url or fileId parameter' },
      { status: 400 }
    );
  }

  // Get file ID from URL or use provided fileId
  const driveFileId = fileId || (url ? getGoogleDriveFileId(url) : null);
  
  if (!driveFileId) {
    logger.warn('ImageProxy', 'Invalid Google Drive URL or file ID', { url, fileId });
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

  const detectImageContentType = (buffer: ArrayBuffer): string | null => {
    const bytes = new Uint8Array(buffer);
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

    return null;
  };

  // Helper function to fetch a single URL with timeout
  const fetchImageUrl = async (
    imageUrl: string
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

      const buffer = await response.arrayBuffer();
      if (buffer.byteLength <= 100) {
        return {
          success: false,
          status,
          responseContentType,
          error: `Response too small (${buffer.byteLength} bytes) - likely not an image`,
        };
      }

      const detected = detectImageContentType(buffer);
      if (detected) {
        return {
          success: true,
          status,
          responseContentType,
          data: buffer,
          contentType: responseContentType.startsWith('image/') ? responseContentType : detected,
        };
      }

      // Likely HTML/error body with 200 OK
      let snippet = '';
      try {
        const bytes = new Uint8Array(buffer);
        snippet = new TextDecoder('utf-8').decode(bytes.slice(0, 2048));
      } catch {
        // ignore
      }

      const isAccessPage = /accounts\.google\.com|servicelogin|sign in|request access|access denied/i.test(snippet);
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

  // Try all URLs in parallel - first successful response wins
  const fetchPromises = urls.map(async (imageUrl) => {
    const result = await fetchImageUrl(imageUrl);
    if (result.success && result.data && result.contentType) {
      return { success: true, url: imageUrl, data: result.data, contentType: result.contentType };
    } else {
      errors.push({ 
        url: imageUrl, 
        error: result.error || 'Unknown error',
        status: result.status,
        contentType: result.responseContentType,
      });
      return { success: false, url: imageUrl };
    }
  });

  // Wait for the first successful response or all to fail
  const results = await Promise.allSettled(fetchPromises);
  
  // Find the first successful result
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value.success) {
      const { data, contentType } = result.value;
      // Success - return image
      return new NextResponse(data, {
        status: 200,
        headers: {
          'Content-Type': contentType || 'image/png',
          'Cache-Control': 'public, max-age=31536000, immutable', // Cache for 1 year
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET',
        },
      });
    }
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

  const logFn = shouldLogAsError ? logger.error : logger.warn;

  logFn('ImageProxy', 'Failed to fetch Google Drive image after all attempts', {
    fileId: driveFileId,
    originalUrl: url,
    totalAttempts: urls.length,
    isPublicAccessIssue,
    errors: errors.map(e => ({
      url: e.url,
      error: e.error,
      status: e.status,
      contentType: e.contentType,
    })),
    recommendation: isPublicAccessIssue 
      ? 'File needs to be shared with "Anyone with the link" permission in Google Drive'
      : 'Check if file exists and is accessible',
  });

  // Return a 1x1 transparent PNG as fallback instead of JSON
  // This prevents the img tag from showing broken image icon
  const transparentPng = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );

  return new NextResponse(transparentPng, {
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

