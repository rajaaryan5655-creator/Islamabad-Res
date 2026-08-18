/**
 * Applies the generated DDL to the configured database.
 *
 * Replaces `prisma migrate` in environments without access to Prisma's engine
 * CDN. The SQL it applies is the same reviewable artifact committed under
 * prisma/sql/, so dev, CI and production converge on one schema definition.
 *
 *   npm run db:push            apply (idempotent, CREATE TABLE IF NOT EXISTS)
 *   npm run db:push -- --reset drop everything first
 */
import { readFileSync, existsSync, unlinkSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { env, dbProvider } from '../src/lib/env.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const apiRoot = resolve(__dirname, '..');
const reset = process.argv.includes('--reset');

/**
 * Extracts the column definitions from each CREATE TABLE in the generated DDL.
 *
 * `CREATE TABLE IF NOT EXISTS` silently does nothing when the table already
 * exists, so a new column added to the schema would never reach an existing
 * database — the app would then fail at runtime with "column does not exist".
 * Parsing the DDL lets us diff it against the live table and emit the missing
 * ALTER TABLE ... ADD COLUMN statements.
 */
function parseTableColumns(sql: string): Map<string, { name: string; definition: string }[]> {
  const tables = new Map<string, { name: string; definition: string }[]>();
  const pattern = /CREATE TABLE IF NOT EXISTS "([^"]+)"\s*\(([\s\S]*?)\n\);/g;

  for (const match of sql.matchAll(pattern)) {
    const [, table, body] = match;
    const columns: { name: string; definition: string }[] = [];

    for (const rawLine of body!.split('\n')) {
      const line = rawLine.trim().replace(/,$/, '');
      // Skip table-level constraints; only real columns can be added later.
      if (!line.startsWith('"')) continue;
      const name = line.slice(1, line.indexOf('"', 1));
      columns.push({ name, definition: line });
    }
    tables.set(table!, columns);
  }
  return tables;
}

/**
 * SQLite refuses ADD COLUMN with a non-constant default, and cannot add a NOT
 * NULL column without one. Relax those cases rather than fail the migration.
 */
function addColumnClause(definition: string): string | null {
  if (/PRIMARY KEY/i.test(definition)) return null;
  const hasDefault = /DEFAULT/i.test(definition);
  if (/NOT NULL/i.test(definition) && !hasDefault) {
    return definition.replace(/\s*NOT NULL/i, '');
  }
  return definition;
}

function splitStatements(sql: string): string[] {
  return sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);
}

async function applySqlite() {
  const { DatabaseSync } = await import('node:sqlite');
  const filePath = env.DATABASE_URL.replace(/^file:/, '');
  const absolute = filePath.startsWith('/') ? filePath : join(apiRoot, filePath);

  if (reset && existsSync(absolute)) {
    unlinkSync(absolute);
    console.log(`[db] removed ${absolute}`);
  }

  const db = new DatabaseSync(absolute);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');

  const sql = readFileSync(join(apiRoot, 'prisma', 'sql', 'sqlite.sql'), 'utf8');
  let applied = 0;
  for (const statement of splitStatements(sql)) {
    db.exec(`${statement};`);
    applied += 1;
  }

  // Reconcile columns added to the schema since the tables were created.
  let added = 0;
  for (const [table, columns] of parseTableColumns(sql)) {
    const existing = new Set(
      (db.prepare(`PRAGMA table_info("${table}")`).all() as { name: string }[]).map((c) => c.name),
    );
    if (existing.size === 0) continue;

    for (const column of columns) {
      if (existing.has(column.name)) continue;
      const clause = addColumnClause(column.definition);
      if (!clause) continue;
      db.exec(`ALTER TABLE "${table}" ADD COLUMN ${clause};`);
      console.log(`[db] + ${table}.${column.name}`);
      added += 1;
    }
  }

  db.close();
  console.log(
    `[db] applied ${applied} statements${added ? ` and added ${added} column${added === 1 ? '' : 's'}` : ''} to SQLite at ${absolute}`,
  );
}

async function applyPostgres() {
  const { default: pg } = await import('pg');
  const client = new pg.Client({ connectionString: env.DATABASE_URL });
  await client.connect();

  if (reset) {
    await client.query('DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;');
    console.log('[db] dropped and recreated schema public');
  }

  const sql = readFileSync(join(apiRoot, 'prisma', 'sql', 'postgresql.sql'), 'utf8');
  let applied = 0;
  for (const statement of splitStatements(sql)) {
    await client.query(statement);
    applied += 1;
  }

  // Postgres supports IF NOT EXISTS on ADD COLUMN, so the diff is one pass.
  let added = 0;
  for (const [table, columns] of parseTableColumns(sql)) {
    const { rows } = await client.query<{ table_name: string }>(
      'SELECT table_name FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = $1',
      [table],
    );
    if (rows.length === 0) continue;

    for (const column of columns) {
      const clause = addColumnClause(column.definition);
      if (!clause) continue;
      const before = await client.query(
        'SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = $1 AND column_name = $2',
        [table, column.name],
      );
      if (before.rowCount) continue;
      await client.query(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS ${clause}`);
      console.log(`[db] + ${table}.${column.name}`);
      added += 1;
    }
  }

  await client.end();
  console.log(
    `[db] applied ${applied} statements${added ? ` and added ${added} column${added === 1 ? '' : 's'}` : ''} to PostgreSQL`,
  );
}

if (dbProvider === 'postgresql') {
  await applyPostgres();
} else {
  await applySqlite();
}
