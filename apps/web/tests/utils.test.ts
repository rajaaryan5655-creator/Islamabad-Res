import { describe, expect, it } from 'vitest';
import { cn, formatPKR, formatTime, initials, isRestaurantOpen, slugify } from '@/lib/utils';
import { OPENING_HOURS } from '@islamabad/shared';

describe('formatPKR', () => {
  it('formats whole rupees with thousands separators', () => {
    expect(formatPKR(450)).toBe('Rs. 450');
    expect(formatPKR(1750)).toBe('Rs. 1,750');
    expect(formatPKR(1234567)).toBe('Rs. 1,234,567');
  });

  it('rounds fractional amounts', () => {
    expect(formatPKR(449.6)).toBe('Rs. 450');
  });

  it('handles zero', () => {
    expect(formatPKR(0)).toBe('Rs. 0');
  });
});

describe('formatTime', () => {
  it.each([
    ['11:00', '11:00 AM'],
    ['13:30', '1:30 PM'],
    ['00:15', '12:15 AM'],
    ['12:00', '12:00 PM'],
    ['23:59', '11:59 PM'],
  ])('renders %s as %s', (input, expected) => {
    expect(formatTime(input)).toBe(expected);
  });
});

describe('slugify', () => {
  it('produces URL-safe slugs', () => {
    expect(slugify('Mix Grill Platter')).toBe('mix-grill-platter');
    expect(slugify('Karahi & Handi')).toBe('karahi-handi');
    expect(slugify('  Spaced  Out  ')).toBe('spaced-out');
  });
});

describe('initials', () => {
  it('takes at most two initials', () => {
    expect(initials('Ayesha Khan')).toBe('AK');
    expect(initials('Haji Abdul Rahman')).toBe('HA');
    expect(initials('Cher')).toBe('C');
  });
});

describe('cn', () => {
  it('merges conflicting Tailwind classes, last wins', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });

  it('drops falsy values', () => {
    expect(cn('a', false && 'b', undefined, 'c')).toBe('a c');
  });
});

describe('isRestaurantOpen', () => {
  it('returns a boolean for the live clock', () => {
    expect(typeof isRestaurantOpen(OPENING_HOURS)).toBe('boolean');
  });

  it('is closed when no hours are defined for today', () => {
    expect(isRestaurantOpen([])).toBe(false);
  });
});
