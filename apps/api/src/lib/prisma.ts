import { PrismaClient } from '../generated/prisma/client.js';
import { env, dbProvider, isProd } from './env.js';

/**
 * Prisma 7 driver-adapter setup.
 *  - production  → PostgreSQL via @prisma/adapter-pg (pooled)
 *  - dev / test  → SQLite via @prisma/adapter-libsql (zero external services)
 * Both are loaded lazily so a deployment only needs the driver it actually uses.
 */
async function createAdapter() {
  if (dbProvider === 'postgresql') {
    const { PrismaPg } = await import('@prisma/adapter-pg');
    return new PrismaPg({
      connectionString: env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
  }
  const { PrismaLibSql } = await import('@prisma/adapter-libsql');
  return new PrismaLibSql({ url: env.DATABASE_URL });
}

const adapter = await createAdapter();

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: isProd ? ['error', 'warn'] : ['error', 'warn'],
  });

if (!isProd) globalForPrisma.prisma = prisma;

export async function disconnectPrisma() {
  await prisma.$disconnect();
}
