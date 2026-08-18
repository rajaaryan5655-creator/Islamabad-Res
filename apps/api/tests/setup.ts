/**
 * Test bootstrap.
 *
 * Every run gets an isolated SQLite database so tests never touch dev data and
 * can be executed in CI without any external service.
 */
import { execSync } from 'node:child_process';
import { existsSync, unlinkSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const apiRoot = resolve(__dirname, '..');
const dbFile = join(apiRoot, 'test.db');

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = `file:${dbFile}`;
process.env.JWT_ACCESS_SECRET = 'test-access-secret-value';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-value';
process.env.REDIS_URL = '';

for (const suffix of ['', '-journal', '-wal', '-shm']) {
  const path = `${dbFile}${suffix}`;
  if (existsSync(path)) unlinkSync(path);
}

execSync('npx tsx scripts/apply-sql.ts', {
  cwd: apiRoot,
  env: { ...process.env },
  stdio: 'pipe',
});

// The floor plan is a code-owned constant; reservations FK to it.
const { ensureFloorPlan } = await import('../src/lib/bootstrap.js');
await ensureFloorPlan();
