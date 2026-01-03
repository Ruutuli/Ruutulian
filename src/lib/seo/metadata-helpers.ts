import type { Metadata } from 'next';
import type { SiteConfig } from '@/lib/config/site-config';
import { convertGoogleDriveUrl, getGoogleDriveFileId, getAbsoluteIconUrl as getAbsoluteIconUrlFromUrl } from '@/lib/utils/googleDriveImage';

/**
 * Get absolute URL from a relative or absolute URL
 */
export function getAbsoluteUrl(url: string, baseUrl: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  // Remove leading slash if baseUrl already has trailing slash
  const cleanUrl = url.startsWith('/') ? url : `/${url}`;
  const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  return `${cleanBase}${cleanUrl}`;
}

/**
 * Get icon URL for a given context (admin or public)
 * Returns altIconUrl for admin pages if available, otherwise iconUrl
 */
export function getIconForContext(config: SiteConfig, isAdmin: boolean = false): string {
  if (isAdmin && config.altIconUrl) {
    return config.altIconUrl;
  }
  return config.iconUrl;
}

/**
 * Get absolute icon URL with proper Google Drive conversion
 * For metadata use, we need absolute URLs
 */
export function getAbsoluteIconUrl(
  config: SiteConfig,
  baseUrl: string,
  isAdmin: boolean = false,
  useProxy: boolean = false
): string {
  const iconUrl = getIconForContext(config, isAdmin);
  if (!iconUrl) return getAbsoluteUrl('/images/logo.png', baseUrl);

  // Convert Google Drive URLs
  const convertedUrl = convertGoogleDriveUrl(iconUrl);

  // For Google Drive URLs in metadata, use proxy API if requested
  if (useProxy && iconUrl.includes('drive.google.com')) {
    const fileId = getGoogleDriveFileId(iconUrl);
    if (fileId) {
      return `${baseUrl}/api/images/proxy?fileId=${encodeURIComponent(fileId)}&url=${encodeURIComponent(iconUrl)}`;
    }
  }

  // Return absolute URL
  return getAbsoluteUrl(convertedUrl, baseUrl);
}

/**
 * Generate base metadata with consistent icons and structure
 */
export function generateBaseMetadata(
  config: SiteConfig,
  options: {
    title?: string;
    description?: string;
    path?: string;
    isAdmin?: boolean;
    keywords?: string[];
    customIconUrl?: string | null;
  } = {}
): Metadata {
  const {
    title,
    description = config.websiteDescription,
    path = '/',
    isAdmin = false,
    keywords = [],
    customIconUrl,
  } = options;

  const baseUrl = config.siteUrl || process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';
  const fullTitle = title
    ? `${title} | ${config.websiteName}`
    : `${config.websiteName} - ${config.websiteDescription.split('.')[0]}`;
  // Use custom icon URL if provided, otherwise use default from config
  const iconUrl = customIconUrl 
    ? getAbsoluteIconUrlFromUrl(customIconUrl, baseUrl, true)
    : getAbsoluteIconUrl(config, baseUrl, isAdmin, true);

  const defaultKeywords = [
    'original characters',
    'OC wiki',
    'character wiki',
    'world building',
    'character development',
    'fictional characters',
    'OC database',
  ];

  return {
    metadataBase: new URL(baseUrl),
    title: title
      ? {
          template: `%s | ${config.websiteName}`,
          default: fullTitle,
        }
      : fullTitle,
    description,
    keywords: [...defaultKeywords, ...keywords].filter(Boolean),
    authors: [{ name: config.authorName }],
    creator: config.authorName,
    publisher: config.authorName,
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    icons: {
      icon: [
        { url: iconUrl, sizes: 'any' },
        { url: iconUrl, type: 'image/png' },
      ],
      apple: [
        { url: iconUrl, sizes: '180x180', type: 'image/png' },
      ],
    },
    manifest: '/manifest.json',
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };
}

/**
 * Generate OpenGraph image metadata
 */
export function generateOpenGraphImage(
  imageUrl: string | null | undefined,
  baseUrl: string,
  options: {
    width?: number;
    height?: number;
    alt?: string;
    fallbackToOgImage?: boolean;
    omitDimensions?: boolean; // For icons to prevent stretching
  } = {}
): Array<{ url: string; width?: number; height?: number; alt?: string }> {
  const { width = 1200, height = 630, alt = 'Image', fallbackToOgImage = true, omitDimensions = false } = options;

  if (imageUrl) {
    // Convert Google Drive URLs
    const convertedUrl = convertGoogleDriveUrl(imageUrl);
    const absoluteUrl = getAbsoluteUrl(convertedUrl, baseUrl);
    return [
      {
        url: absoluteUrl,
        // Omit dimensions for icons to prevent stretching - let platform use actual image dimensions
        ...(omitDimensions ? {} : { width, height }),
        alt,
      },
    ];
  }

  if (fallbackToOgImage) {
    return [
      {
        url: getAbsoluteUrl('/og-image', baseUrl),
        width,
        height,
        alt,
      },
    ];
  }

  return [];
}

/**
 * Generate Twitter card metadata
 */
export function generateTwitterCard(
  config: SiteConfig,
  options: {
    title?: string;
    description?: string;
    imageUrl?: string | null;
    baseUrl?: string;
  } = {}
): Metadata['twitter'] {
  const {
    title,
    description = config.websiteDescription,
    imageUrl,
    baseUrl = config.siteUrl || process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com',
  } = options;

  const fullTitle = title
    ? `${title} | ${config.websiteName}`
    : `${config.websiteName} - ${config.websiteDescription.split('.')[0]}`;

  let images: string[] = [];
  if (imageUrl) {
    const convertedUrl = convertGoogleDriveUrl(imageUrl);
    images = [getAbsoluteUrl(convertedUrl, baseUrl)];
  } else {
    const iconUrl = getAbsoluteIconUrl(config, baseUrl, false, true);
    images = [iconUrl];
  }

  return {
    card: 'summary_large_image',
    title: fullTitle,
    description,
    images,
  };
}

/**
 * Generate canonical URL
 */
export function generateCanonicalUrl(path: string, baseUrl: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  return `${cleanBase}${cleanPath}`;
}

