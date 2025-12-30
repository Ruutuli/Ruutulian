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
      ];

  const errors: Array<{ url: string; error: string; status?: number; contentType?: string }> = [];

  // Helper function to fetch a single URL with timeout
  const fetchImageUrl = async (imageUrl: string): Promise<{ success: boolean; data?: ArrayBuffer; contentType?: string; error?: string }> => {
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

      // Check if response is actually an image
      const contentType = response.headers.get('content-type') || '';
      const isImage = contentType.startsWith('image/');
      
      if (response.ok && isImage) {
        const imageBuffer = await response.arrayBuffer();
        
        // Verify it's actually image data (not HTML error page)
        if (imageBuffer.byteLength > 100) {
          // Success - return image data
          return { success: true, data: imageBuffer, contentType };
        } else {
          const errorMsg = `Response too small (${imageBuffer.byteLength} bytes) - likely not an image`;
          return { success: false, error: errorMsg };
        }
      } else {
        // Check if we got redirected to a login page or error page
        // Only read text for non-image responses to avoid consuming the body
        if (!isImage && response.status !== 200) {
          try {
            const text = await response.text();
            const isLoginPage = text.includes('accounts.google.com') || 
                               text.includes('Sign in') || 
                               text.includes('Access denied') ||
                               text.includes('Request Access');
            
            if (isLoginPage) {
              return { success: false, error: 'File not publicly accessible (redirected to login/access page)' };
            } else {
              return { success: false, error: 'Non-image response received' };
            }
          } catch (textError) {
            return { success: false, error: 'Failed to read response text' };
          }
        } else {
          return { success: false, error: 'Unexpected response' };
        }
      }
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
      errors.push({ url: imageUrl, error: result.error || 'Unknown error' });
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
    e.error.includes('redirected to login') ||
    e.error.includes('Access denied')
  );

  logger.error('ImageProxy', 'Failed to fetch Google Drive image after all attempts', {
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

