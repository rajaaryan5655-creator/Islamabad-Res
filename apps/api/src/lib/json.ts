/**
 * Scalar lists are stored as JSON strings so the same schema compiles on both
 * PostgreSQL and SQLite. These helpers keep the (de)serialisation in one place.
 */
export function parseList(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function stringifyList(value: readonly string[] | undefined | null): string {
  return JSON.stringify(value ?? []);
}

export function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
