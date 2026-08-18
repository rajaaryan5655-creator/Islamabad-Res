import { OPENING_HOURS } from './brand.ts';

export interface TableDef {
  id: string;
  name: string;
  seats: number;
  zone: 'INDOOR' | 'OUTDOOR' | 'PRIVATE';
}

/** Physical floor plan — 260 covers across 3 halls + 2 private rooms. */
export const FLOOR_PLAN: TableDef[] = [
  ...Array.from({ length: 10 }, (_, i) => ({ id: `T${i + 1}`, name: `Table ${i + 1}`, seats: 2, zone: 'INDOOR' as const })),
  ...Array.from({ length: 12 }, (_, i) => ({ id: `T${i + 11}`, name: `Table ${i + 11}`, seats: 4, zone: 'INDOOR' as const })),
  ...Array.from({ length: 6 }, (_, i) => ({ id: `T${i + 23}`, name: `Table ${i + 23}`, seats: 6, zone: 'INDOOR' as const })),
  ...Array.from({ length: 8 }, (_, i) => ({ id: `C${i + 1}`, name: `Courtyard ${i + 1}`, seats: 4, zone: 'OUTDOOR' as const })),
  ...Array.from({ length: 4 }, (_, i) => ({ id: `C${i + 9}`, name: `Courtyard ${i + 9}`, seats: 8, zone: 'OUTDOOR' as const })),
  { id: 'P1', name: 'Margalla Room', seats: 14, zone: 'PRIVATE' },
  { id: 'P2', name: 'Faisal Room', seats: 20, zone: 'PRIVATE' },
];

export const TOTAL_COVERS = FLOOR_PLAN.reduce((s, t) => s + t.seats, 0);

export const SLOT_MINUTES = 30;
/** Default dining duration used for table-turn allocation. */
export function durationForGuests(guests: number): number {
  if (guests <= 2) return 75;
  if (guests <= 4) return 90;
  if (guests <= 8) return 120;
  return 150;
}

export function slotsForDate(dateISO: string): string[] {
  const date = new Date(`${dateISO}T00:00:00`);
  const hours = OPENING_HOURS.find((h) => h.dayIndex === date.getDay());
  if (!hours) return [];
  const [oh, om] = hours.open.split(':').map(Number);
  const [ch, cm] = hours.close.split(':').map(Number);
  const start = oh * 60 + om;
  // Last seating 90 minutes before close.
  const end = ch * 60 + cm - 90;
  const out: string[] = [];
  for (let t = start; t <= end; t += SLOT_MINUTES) {
    out.push(`${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`);
  }
  return out;
}

export function isPeakSlot(time: string): boolean {
  const [h] = time.split(':').map(Number);
  return h >= 19 && h <= 21;
}

export interface BookedRange {
  tableId: string;
  startMinutes: number;
  endMinutes: number;
}

export function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Greedy best-fit table allocation: smallest table that seats the party and is
 * free for the whole dining window. Returns null when the party cannot be
 * seated (caller then offers the waiting list).
 */
export function allocateTable(
  guests: number,
  time: string,
  booked: BookedRange[],
  seating: 'ANY' | 'INDOOR' | 'OUTDOOR' | 'PRIVATE' = 'ANY',
  floor: TableDef[] = FLOOR_PLAN,
): TableDef | null {
  const start = toMinutes(time);
  const end = start + durationForGuests(guests);
  // Best fit: smallest adequate table first; for an unspecified preference,
  // fill the indoor halls before opening the courtyard.
  const zoneRank = { INDOOR: 0, OUTDOOR: 1, PRIVATE: 2 } as const;
  const candidates = floor
    .filter((t) => t.seats >= guests && (seating === 'ANY' ? true : t.zone === seating))
    .sort(
      (a, b) =>
        a.seats - b.seats ||
        (seating === 'ANY' ? zoneRank[a.zone] - zoneRank[b.zone] : 0) ||
        a.id.localeCompare(b.id, 'en', { numeric: true }),
    );

  for (const table of candidates) {
    const clash = booked.some(
      (b) => b.tableId === table.id && start < b.endMinutes && end > b.startMinutes,
    );
    if (!clash) return table;
  }
  return null;
}

export function availabilityForDate(
  dateISO: string,
  guests: number,
  booked: BookedRange[],
  seating: 'ANY' | 'INDOOR' | 'OUTDOOR' | 'PRIVATE' = 'ANY',
) {
  return slotsForDate(dateISO).map((time) => {
    const table = allocateTable(guests, time, booked, seating);
    return {
      time,
      available: Boolean(table),
      peak: isPeakSlot(time),
      tableId: table?.id ?? null,
      tableName: table?.name ?? null,
    };
  });
}
