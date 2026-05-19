export interface GalleryPublicItem {
  id: string;
  fileId: string;
  title: string;
  tags: string[];
  isNsfw: boolean;
  characterNames: { name: string; slug: string; href: string }[];
}

export type GalleryLayoutMode = 'grid' | 'masonry';
