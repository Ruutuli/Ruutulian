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

  // Try multiple URL formats in order of reliability
  const urls = url 
    ? getGoogleDriveImageUrls(url)
    : [
        `https://lh3.googleusercontent.com/d/${driveFileId}`,
        `https://drive.google.com/thumbnail?id=${driveFileId}&sz=w1920-h1080`,
        `https://drive.google.com/thumbnail?id=${driveFileId}`,
        `https://drive.google.com/uc?export=view&id=${driveFileId}`,
      ];

  const errors: Array<{ url: string; error: string; status?: number; contentType?: string }> = [];
  let attemptCount = 0;

  // Try each URL format until one works
  for (const imageUrl of urls) {
    attemptCount++;
    let timeoutId: NodeJS.Timeout | null = null;
    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      const fetchStartTime = Date.now();
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
      const finalUrl = response.url; // Get final URL after redirects
      
      if (response.ok && isImage) {
        const imageBuffer = await response.arrayBuffer();
        
        // Verify it's actually image data (not HTML error page)
        if (imageBuffer.byteLength > 100) {
          // Success - return image
          // Return the image with appropriate headers
          return new NextResponse(imageBuffer, {
            status: 200,
            headers: {
              'Content-Type': contentType,
              'Cache-Control': 'public, max-age=31536000, immutable', // Cache for 1 year
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET',
            },
          });
        } else {
          const errorMsg = `Response too small (${imageBuffer.byteLength} bytes) - likely not an image`;
          console.warn('[ImageProxy] Response too small:', {
            url: imageUrl,
            size: imageBuffer.byteLength,
            contentType,
          });
          errors.push({ url: imageUrl, error: errorMsg, status: response.status, contentType });
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
              const errorMsg = 'File not publicly accessible (redirected to login/access page)';
              errors.push({ url: imageUrl, error: errorMsg, status: response.status, contentType });
            } else {
              const errorMsg = `Non-image response received`;
              errors.push({ url: imageUrl, error: errorMsg, status: response.status, contentType });
            }
          } catch (textError) {
            const errorMsg = `Failed to read response text`;
            errors.push({ url: imageUrl, error: errorMsg, status: response.status, contentType });
          }
        } else {
          const errorMsg = `Unexpected response`;
          errors.push({ url: imageUrl, error: errorMsg, status: response.status, contentType });
        }
      }
    } catch (error) {
      // Clear timeout if still active
      if (timeoutId) clearTimeout(timeoutId);
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorName = error instanceof Error ? error.name : 'UnknownError';
      errors.push({ url: imageUrl, error: `${errorName}: ${errorMessage}` });
      continue;
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
    totalAttempts: attemptCount,
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

