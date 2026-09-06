/**
 * Avatar Utilities & Helpers for PropertyLedge V4
 * Provides deterministic seed generation, color hashing, DiceBear URL construction,
 * initials extraction, and curated avatar palettes.
 */

export const DICEBEAR_STYLE = 'lorelei';

export const BACKGROUND_PALETTE = [
  'b6e3f4', // Soft Ice Blue
  'c0aede', // Soft Lavender
  'd1d4f9', // Soft Periwinkle
  'ffd5dc', // Soft Rose Pink
  'ffdfbf', // Soft Peach
  'e0f2fe', // Sky Blue
  'fef3c7', // Warm Amber
  'dcfce7', // Mint Green
];

export const CURATED_AVATAR_SEEDS = [
  'Felix',
  'Aneka',
  'Zack',
  'Sadie',
  'Oliver',
  'Maya',
  'Leo',
  'Elena',
  'Jasper',
  'Sophia',
  'Milo',
  'Chloe',
  'Liam',
  'Zoe',
  'Ethan',
  'Grace',
  'Nova',
  'Atlas',
  'Orion',
  'Luna',
  'Koa',
  'Aria',
  'Soren',
  'Iris',
  'Zephyr',
  'Freya',
  'Cassian',
  'Nora',
  'Silas',
  'Ivy',
  'Rowan',
  'Hazel',
];

/**
 * Gets Initials from a person's full name (up to 2 letters).
 */
export function getInitials(name?: string | null): string {
  if (!name || !name.trim()) return 'U';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * Deterministic numeric hash from a string seed.
 */
export function stringToHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Generates a deterministic tailwind/hex background color for initials fallbacks.
 */
export function getInitialsBgColor(seed?: string | null): { bg: string; text: string } {
  const colors = [
    { bg: 'bg-blue-600 dark:bg-blue-700', text: 'text-white' },
    { bg: 'bg-emerald-600 dark:bg-emerald-700', text: 'text-white' },
    { bg: 'bg-violet-600 dark:bg-violet-700', text: 'text-white' },
    { bg: 'bg-amber-600 dark:bg-amber-700', text: 'text-white' },
    { bg: 'bg-rose-600 dark:bg-rose-700', text: 'text-white' },
    { bg: 'bg-cyan-600 dark:bg-cyan-700', text: 'text-white' },
    { bg: 'bg-teal-600 dark:bg-teal-700', text: 'text-white' },
    { bg: 'bg-indigo-600 dark:bg-indigo-700', text: 'text-white' },
  ];
  if (!seed) return colors[0];
  const hash = stringToHash(seed);
  return colors[hash % colors.length];
}

/**
 * Generates a deterministic DiceBear SVG URL from a person's stable seed (e.g. tenant ID, user ID, or name).
 */
export function getDiceBearUrl(seed: string, style: string = DICEBEAR_STYLE): string {
  const safeSeed = encodeURIComponent((seed || 'propertyledge-person').trim());
  const bg = BACKGROUND_PALETTE.join(',');
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${safeSeed}&backgroundColor=${bg}`;
}

/**
 * Generates a random seed for the "Surprise me" avatar picker feature.
 */
export function generateRandomSeed(): string {
  const words = [
    'Nova', 'Atlas', 'Orion', 'Luna', 'Koa', 'Aria', 'Soren', 'Iris',
    'Zephyr', 'Freya', 'Cassian', 'Nora', 'Silas', 'Ivy', 'Rowan', 'Hazel'
  ];
  const randomWord = words[Math.floor(Math.random() * words.length)];
  const randomNum = Math.floor(100 + Math.random() * 900);
  return `${randomWord}${randomNum}`;
}
