export type RelationshipType =
  | 'lovers'
  | 'crush'
  | 'close_friend'
  | 'friend'
  | 'acquaintance'
  | 'dislike'
  | 'hate'
  | 'neutral'
  | 'family'
  | 'rival'
  | 'admire'
  | 'other';

export interface RelationshipTypeConfig {
  value: RelationshipType;
  label: string;
  color: string;
  icon: string;
  bgColor: string;
  borderColor: string;
}

export const RELATIONSHIP_TYPES: RelationshipTypeConfig[] = [
  {
    value: 'lovers',
    label: 'Lovers',
    color: '#FF1744',
    icon: 'fas fa-heart',
    bgColor: 'rgba(255, 23, 68, 0.1)',
    borderColor: 'rgba(255, 23, 68, 0.3)',
  },
  {
    value: 'crush',
    label: 'Crush',
    color: '#F48FB1',
    icon: 'fas fa-heart',
    bgColor: 'rgba(244, 143, 177, 0.1)',
    borderColor: 'rgba(244, 143, 177, 0.3)',
  },
  {
    value: 'close_friend',
    label: 'Close Friend',
    color: '#2196F3',
    icon: 'fas fa-heart',
    bgColor: 'rgba(33, 150, 243, 0.1)',
    borderColor: 'rgba(33, 150, 243, 0.3)',
  },
  {
    value: 'friend',
    label: 'Friend',
    color: '#64B5F6',
    icon: 'fas fa-heart',
    bgColor: 'rgba(100, 181, 246, 0.1)',
    borderColor: 'rgba(100, 181, 246, 0.3)',
  },
  {
    value: 'acquaintance',
    label: 'Acquaintance',
    color: '#9E9E9E',
    icon: 'fas fa-heart',
    bgColor: 'rgba(158, 158, 158, 0.1)',
    borderColor: 'rgba(158, 158, 158, 0.3)',
  },
  {
    value: 'dislike',
    label: 'Dislike',
    color: '#FF9800',
    icon: 'fas fa-heart-broken',
    bgColor: 'rgba(255, 152, 0, 0.1)',
    borderColor: 'rgba(255, 152, 0, 0.3)',
  },
  {
    value: 'hate',
    label: 'Hate',
    color: '#C62828',
    icon: 'fas fa-heart-broken',
    bgColor: 'rgba(198, 40, 40, 0.1)',
    borderColor: 'rgba(198, 40, 40, 0.3)',
  },
  {
    value: 'neutral',
    label: 'Neutral',
    color: '#757575',
    icon: 'fas fa-heart',
    bgColor: 'rgba(117, 117, 117, 0.1)',
    borderColor: 'rgba(117, 117, 117, 0.3)',
  },
  {
    value: 'family',
    label: 'Family',
    color: '#9C27B0',
    icon: 'fas fa-heart',
    bgColor: 'rgba(156, 39, 176, 0.1)',
    borderColor: 'rgba(156, 39, 176, 0.3)',
  },
  {
    value: 'rival',
    label: 'Rival',
    color: '#FFC107',
    icon: 'fas fa-heart',
    bgColor: 'rgba(255, 193, 7, 0.1)',
    borderColor: 'rgba(255, 193, 7, 0.3)',
  },
  {
    value: 'admire',
    label: 'Admire',
    color: '#4CAF50',
    icon: 'fas fa-heart',
    bgColor: 'rgba(76, 175, 80, 0.1)',
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  {
    value: 'other',
    label: 'Other',
    color: '#9E9E9E',
    icon: 'fas fa-heart',
    bgColor: 'rgba(158, 158, 158, 0.1)',
    borderColor: 'rgba(158, 158, 158, 0.3)',
  },
];

export function getRelationshipTypeConfig(
  type: RelationshipType | string | null | undefined
): RelationshipTypeConfig {
  const normalizedType = type?.toLowerCase() as RelationshipType;
  const config = RELATIONSHIP_TYPES.find((rt) => rt.value === normalizedType);
  return config || RELATIONSHIP_TYPES.find((rt) => rt.value === 'other')!;
}

export function getRelationshipTypeColor(
  type: RelationshipType | string | null | undefined
): string {
  return getRelationshipTypeConfig(type).color;
}

export function getRelationshipTypeIcon(
  type: RelationshipType | string | null | undefined
): string {
  return getRelationshipTypeConfig(type).icon;
}

