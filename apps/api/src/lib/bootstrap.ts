import { FLOOR_PLAN } from '@islamabad/shared';
import { prisma } from './prisma.js';

/**
 * Reconciles the database with the canonical floor plan defined in
 * @islamabad/shared.
 *
 * Reservations carry a foreign key to RestaurantTable, so these rows must exist
 * before the first booking. Running this at startup means a freshly migrated
 * database is immediately bookable without depending on the seed script, and
 * changing the floor plan in code is enough to roll it out.
 */
export async function ensureFloorPlan(): Promise<number> {
  const existing = await prisma.restaurantTable.findMany({ select: { id: true } });
  const known = new Set(existing.map((t) => t.id));

  const missing = FLOOR_PLAN.filter((t) => !known.has(t.id));
  if (missing.length > 0) {
    await prisma.restaurantTable.createMany({
      data: missing.map((t) => ({ id: t.id, name: t.name, seats: t.seats, zone: t.zone })),
    });
  }

  // Keep seat counts and names in step when the floor plan changes.
  for (const table of FLOOR_PLAN) {
    if (known.has(table.id)) {
      await prisma.restaurantTable.updateMany({
        where: { id: table.id, OR: [{ seats: { not: table.seats } }, { name: { not: table.name } }] },
        data: { name: table.name, seats: table.seats, zone: table.zone },
      });
    }
  }

  return missing.length;
}
