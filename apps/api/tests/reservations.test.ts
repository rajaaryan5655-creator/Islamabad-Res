import { describe, expect, it } from 'vitest';
import {
  FLOOR_PLAN,
  TOTAL_COVERS,
  allocateTable,
  availabilityForDate,
  durationForGuests,
  isPeakSlot,
  slotsForDate,
  toMinutes,
  type BookedRange,
} from '@islamabad/shared';

// 2026-08-20 is a Thursday; 2026-08-21 a Friday.
const THURSDAY = '2026-08-20';
const FRIDAY = '2026-08-21';

describe('floor plan', () => {
  it('totals the advertised capacity', () => {
    expect(TOTAL_COVERS).toBeGreaterThanOrEqual(200);
    expect(FLOOR_PLAN.length).toBeGreaterThan(30);
  });

  it('has private rooms seating 14 and 20', () => {
    const privates = FLOOR_PLAN.filter((t) => t.zone === 'PRIVATE').map((t) => t.seats);
    expect(privates).toContain(14);
    expect(privates).toContain(20);
  });
});

describe('slots', () => {
  it('generates 30-minute slots within opening hours', () => {
    const slots = slotsForDate(THURSDAY);
    expect(slots[0]).toBe('11:00');
    expect(slots[1]).toBe('11:30');
    // Last seating is 90 minutes before an 23:00 close.
    expect(slots.at(-1)).toBe('21:30');
  });

  it('starts Friday service after Jummah', () => {
    expect(slotsForDate(FRIDAY)[0]).toBe('14:00');
  });

  it('flags peak evening slots', () => {
    expect(isPeakSlot('20:00')).toBe(true);
    expect(isPeakSlot('12:00')).toBe(false);
  });
});

describe('durationForGuests', () => {
  it('scales the dining window with party size', () => {
    expect(durationForGuests(2)).toBe(75);
    expect(durationForGuests(4)).toBe(90);
    expect(durationForGuests(8)).toBe(120);
    expect(durationForGuests(14)).toBe(150);
  });
});

describe('allocateTable', () => {
  it('assigns the smallest table that fits the party', () => {
    const table = allocateTable(2, '19:00', []);
    expect(table).not.toBeNull();
    expect(table!.seats).toBe(2);
  });

  it('never seats a party at a table that is too small', () => {
    const table = allocateTable(6, '19:00', []);
    expect(table!.seats).toBeGreaterThanOrEqual(6);
  });

  it('honours a seating-zone preference', () => {
    expect(allocateTable(4, '19:00', [], 'OUTDOOR')!.zone).toBe('OUTDOOR');
    expect(allocateTable(4, '19:00', [], 'INDOOR')!.zone).toBe('INDOOR');
  });

  it('does not double-book a table within its dining window', () => {
    const first = allocateTable(2, '19:00', [])!;
    const booked: BookedRange[] = [
      { tableId: first.id, startMinutes: toMinutes('19:00'), endMinutes: toMinutes('19:00') + 75 },
    ];
    const second = allocateTable(2, '19:30', booked)!;
    expect(second.id).not.toBe(first.id);
  });

  it('reuses a table once its window has passed', () => {
    const first = allocateTable(2, '12:00', [])!;
    const booked: BookedRange[] = [
      { tableId: first.id, startMinutes: toMinutes('12:00'), endMinutes: toMinutes('12:00') + 75 },
    ];
    // 13:30 is after 12:00 + 75 minutes.
    const later = allocateTable(2, '13:30', booked)!;
    expect(later.id).toBe(first.id);
  });

  it('returns null when every suitable table is taken', () => {
    const twenty = FLOOR_PLAN.filter((t) => t.seats >= 20);
    const booked: BookedRange[] = twenty.map((t) => ({
      tableId: t.id,
      startMinutes: toMinutes('20:00'),
      endMinutes: toMinutes('20:00') + 240,
    }));
    expect(allocateTable(20, '20:00', booked)).toBeNull();
  });
});

describe('availabilityForDate', () => {
  it('returns a slot entry for every opening slot', () => {
    const availability = availabilityForDate(THURSDAY, 4, []);
    expect(availability).toHaveLength(slotsForDate(THURSDAY).length);
    expect(availability.every((s) => s.available)).toBe(true);
  });

  it('marks slots unavailable once the floor is full', () => {
    const booked: BookedRange[] = FLOOR_PLAN.map((t) => ({
      tableId: t.id,
      startMinutes: 0,
      endMinutes: 24 * 60,
    }));
    expect(availabilityForDate(THURSDAY, 4, booked).every((s) => !s.available)).toBe(true);
  });
});
