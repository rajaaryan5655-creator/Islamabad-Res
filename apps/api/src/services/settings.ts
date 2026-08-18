import { prisma } from '../lib/prisma.js';
import { cache } from '../lib/cache.js';

/**
 * Operational settings the restaurant can change without a deploy.
 *
 * Stored as key/value rows and read through a short cache, so the hot paths
 * (checkout, booking) pay at most one query per minute. Defaults are defined
 * here, which means a missing row is never an error.
 */

export interface RestaurantSettings {
  /** Master switch for online ordering — flips the site to "kitchen closed". */
  acceptingOrders: boolean;
  acceptingReservations: boolean;
  /**
   * When false, bookings land as PENDING and wait for a manager decision.
   * The floor team asked for this: large parties and private rooms need a human.
   */
  autoApproveReservations: boolean;
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
  /** Baseline kitchen prep time, added to delivery ETAs. */
  prepTimeMinutes: number;
  /** Site-wide banner; empty string hides it. */
  announcement: string;
}

export const DEFAULT_SETTINGS: RestaurantSettings = {
  acceptingOrders: true,
  acceptingReservations: true,
  autoApproveReservations: false,
  deliveryEnabled: true,
  pickupEnabled: true,
  prepTimeMinutes: 25,
  announcement: '',
};

const CACHE_KEY = 'settings:restaurant';
const CACHE_TTL = 60;

function coerce(key: keyof RestaurantSettings, raw: string): unknown {
  const fallback = DEFAULT_SETTINGS[key];
  if (typeof fallback === 'boolean') return raw === 'true';
  if (typeof fallback === 'number') {
    const n = Number(raw);
    return Number.isFinite(n) ? n : fallback;
  }
  return raw;
}

export async function getSettings(): Promise<RestaurantSettings> {
  const cachedValue = await cache.get<RestaurantSettings>(CACHE_KEY);
  if (cachedValue) return cachedValue;

  const rows = await prisma.setting.findMany();
  const settings = { ...DEFAULT_SETTINGS };

  for (const row of rows) {
    if (row.key in settings) {
      const key = row.key as keyof RestaurantSettings;
      (settings as Record<string, unknown>)[key] = coerce(key, row.value);
    }
  }

  await cache.set(CACHE_KEY, settings, CACHE_TTL);
  return settings;
}

export async function updateSettings(patch: Partial<RestaurantSettings>): Promise<RestaurantSettings> {
  const entries = Object.entries(patch).filter(([key]) => key in DEFAULT_SETTINGS);

  await prisma.$transaction(
    entries.map(([key, value]) =>
      prisma.setting.upsert({
        where: { key },
        create: { key, value: String(value) },
        update: { value: String(value) },
      }),
    ),
  );

  await cache.del(CACHE_KEY);
  return getSettings();
}
