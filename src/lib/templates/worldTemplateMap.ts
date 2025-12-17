// Map world slugs to template types
export function getTemplateTypeFromWorldSlug(slug: string): string {
  const templateMap: Record<string, string> = {
    'naruto': 'naruto',
    'final-fantasy-vii': 'ff7',
    'inuyasha': 'inuyasha',
    'shaman-king': 'shaman-king',
    'zelda': 'zelda',
    'dragon-ball-z': 'dragonball',
    'dragonball': 'dragonball', // Handle alternative slug format
    'dragon-ball': 'dragonball', // Handle alternative slug format
    'pokemon': 'pokemon',
    'nier': 'nier',
    'kismet': 'original',
    'moirai': 'original',
    'pluviophile': 'original',
    'tiderift': 'original',
    'vieulx': 'original',
    'infinite-nodus': 'original',
    'none': 'none',
    'not-accessible': 'none',
  };
  return templateMap[slug.toLowerCase()] || 'none';
}
