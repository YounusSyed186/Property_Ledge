import { test, expect } from '@playwright/test';
import {
  getInitials,
  stringToHash,
  getInitialsBgColor,
  getDiceBearUrl,
  CURATED_AVATAR_SEEDS,
} from '@/components/ui/avatar/avatar-utils';

test.describe('DiceBear Avatar Utilities', () => {
  test('extracts initials correctly from full names', () => {
    expect(getInitials('Sarah Khan')).toBe('SK');
    expect(getInitials('John')).toBe('J');
    expect(getInitials('Mary Jane Watson')).toBe('MW');
    expect(getInitials('')).toBe('U');
    expect(getInitials(null)).toBe('U');
  });

  test('generates deterministic string hashes', () => {
    const hash1 = stringToHash('tenant-123');
    const hash2 = stringToHash('tenant-123');
    const hash3 = stringToHash('tenant-456');

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hash3);
  });

  test('returns consistent background colors for initials fallback', () => {
    const color1 = getInitialsBgColor('sarah@example.com');
    const color2 = getInitialsBgColor('sarah@example.com');

    expect(color1.bg).toBe(color2.bg);
    expect(color1.text).toBe(color2.text);
  });

  test('builds valid DiceBear SVG URLs with stable seeds', () => {
    const url = getDiceBearUrl('tenant-uuid-abc');
    expect(url).toContain('api.dicebear.com/9.x/lorelei/svg');
    expect(url).toContain('seed=tenant-uuid-abc');
    expect(url).toContain('backgroundColor=');
  });

  test('provides a non-empty curated seed list for avatar picker', () => {
    expect(CURATED_AVATAR_SEEDS.length).toBeGreaterThan(5);
    expect(CURATED_AVATAR_SEEDS).toContain('Felix');
  });
});
