import type { Metadata } from 'next';
import { getSiteConfig, type SiteConfig } from '@/lib/config/site-config';
import {
  generateBaseMetadata,
  generateOpenGraphImage,
  generateTwitterCard,
  generateCanonicalUrl,
  getAbsoluteIconUrl,
} from './metadata-helpers';

export interface PageMetadataOptions {
  title: string;
  description: string;
  path?: string;
  keywords?: string[];
  imageUrl?: string | null;
  imageAlt?: string;
  ogType?: 'website' | 'article' | 'profile';
  noIndex?: boolean;
  customIconUrl?: string | null;
  omitImageDimensions?: boolean; // For icons to prevent stretching in OG previews
}

/**
 * Enhanced page metadata generator with icon support and consistent structure
 */
export async function generatePageMetadata(
  options: PageMetadataOptions
): Promise<Metadata> {
  const config = await getSiteConfig();
  const baseUrl = config.siteUrl || process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';
  const {
    title,
    description,
    path = '/',
    keywords = [],
    imageUrl,
    imageAlt,
    ogType = 'website',
    noIndex = false,
    customIconUrl,
    omitImageDimensions = false,
  } = options;

  const fullTitle = `${title} | ${config.websiteName}`;
  const canonicalUrl = generateCanonicalUrl(path, baseUrl);

  // Generate base metadata
  const base = generateBaseMetadata(config, {
    title,
    description,
    path,
    keywords,
    customIconUrl,
  });

  // Generate OpenGraph image
  const ogImages = generateOpenGraphImage(imageUrl, baseUrl, {
    width: 1200,
    height: 630,
    alt: imageAlt || `${title} - ${config.websiteName}`,
    fallbackToOgImage: true,
    omitDimensions: omitImageDimensions,
  });

  // Generate Twitter card
  const twitter = generateTwitterCard(config, {
    title,
    description,
    imageUrl,
    baseUrl,
  });

  return {
    ...base,
    title: fullTitle,
    description,
    keywords: [...(base.keywords as string[]), ...keywords].filter(Boolean),
    openGraph: {
      ...base.openGraph,
      title: fullTitle,
      description,
      url: canonicalUrl,
      type: ogType,
      siteName: config.websiteName,
      images: ogImages,
    },
    twitter,
    alternates: {
      canonical: canonicalUrl,
    },
    robots: noIndex
      ? {
          index: false,
          follow: false,
        }
      : base.robots,
  };
}

/**
 * Generate metadata for detail pages (OC, World, Fanfic, etc.)
 */
export async function generateDetailPageMetadata(
  options: PageMetadataOptions & {
    entityName: string;
    entityImage?: string | null;
    entityIconUrl?: string | null;
    entityType?: 'profile' | 'article' | 'website';
  }
): Promise<Metadata> {
  const {
    entityName,
    entityImage,
    entityIconUrl,
    entityType = 'website',
    imageAlt,
    ...baseOptions
  } = options;

  // If using icon as the image, omit dimensions to prevent stretching
  const isUsingIcon = !!entityIconUrl && entityImage === entityIconUrl;

  return generatePageMetadata({
    ...baseOptions,
    imageUrl: entityImage || baseOptions.imageUrl,
    imageAlt: imageAlt || entityName,
    ogType: entityType,
    keywords: [entityName, ...(baseOptions.keywords || [])],
    customIconUrl: entityIconUrl || baseOptions.customIconUrl,
    omitImageDimensions: isUsingIcon,
  });
}

