#!/usr/bin/env node
/**
 * Runs `prisma generate` for the API.
 *
 * Prisma 7 generates the client and runs queries entirely through its WASM
 * query compiler + driver adapters — no native engine required. The CLI still
 * probes for the *schema* engine binary (used only by `prisma migrate`), which
 * fails on hosts without egress to binaries.prisma.sh. We point that lookup at
 * a stub so generation stays fully offline; schema changes are applied with
 * `npm run db:push`, which executes the reviewable SQL in prisma/sql/.
 *
 * Set PRISMA_ALLOW_ENGINE_DOWNLOAD=1 to opt back into the CLI's own binary.
 */
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const apiDir = resolve(__dirname, '..', 'apps', 'api');

const env = { ...process.env };
if (!process.env.PRISMA_ALLOW_ENGINE_DOWNLOAD) {
  env.PRISMA_SCHEMA_ENGINE_BINARY = process.platform === 'win32' ? 'cmd.exe' : '/bin/true';
}

const result = spawnSync('npx', ['prisma', 'generate'], {
  cwd: apiDir,
  env,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

process.exit(result.status ?? 1);
