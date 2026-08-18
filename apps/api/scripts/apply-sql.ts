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
  db.close();
  console.log(`[db] applied ${applied} statements to SQLite at ${absolute}`);
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
  await client.end();
  console.log(`[db] applied ${applied} statements to PostgreSQL`);
}

if (dbProvider === 'postgresql') {
  await applyPostgres();
} else {
  await applySqlite();
}
