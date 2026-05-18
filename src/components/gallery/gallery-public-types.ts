export interface GalleryPublicItem {
  id: string;
  fileId: string;
  title: string;
  tags: string[];
  characterNames: { name: string; slug: string; href: string }[];
}

export type GalleryLayoutMode = 'grid' | 'masonry';
