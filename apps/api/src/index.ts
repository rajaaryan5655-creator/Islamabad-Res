import { createApp } from './app.js';
import { env, dbProvider } from './lib/env.js';
import { cache } from './lib/cache.js';
import { disconnectPrisma } from './lib/prisma.js';
import { ensureFloorPlan } from './lib/bootstrap.js';

const app = createApp();

// The dining room must exist in the database before the first reservation.
const seated = await ensureFloorPlan();
if (seated > 0) console.log(`[api] floor plan synced — ${seated} tables created`);

const server = app.listen(env.PORT, '0.0.0.0', () => {
  console.log(`
  Islamabad Restaurant API
  ────────────────────────────────────────────
  env       ${env.NODE_ENV}
  port      ${env.PORT}
  database  ${dbProvider}
  cache     ${cache.name}
  origin    ${env.WEB_ORIGIN}
  health    http://localhost:${env.PORT}/api/health
`);
});

async function shutdown(signal: string) {
  console.log(`\n[api] ${signal} received — shutting down gracefully`);
  server.close(async () => {
    await disconnectPrisma();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => console.error('[api] Unhandled rejection:', reason));
