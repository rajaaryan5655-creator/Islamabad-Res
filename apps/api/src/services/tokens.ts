import crypto from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import { env } from '../lib/env.js';

/**
 * Single-use, expiring tokens for email verification and password reset.
 *
 * Only a SHA-256 hash is stored, so a database leak cannot be replayed against
 * the reset endpoint — the same reasoning as password hashing, applied to
 * bearer-style links.
 */

export type TokenType = 'EMAIL_VERIFY' | 'PASSWORD_RESET';

const TTL_SECONDS: Record<TokenType, number> = {
  EMAIL_VERIFY: 60 * 60 * 24, // 24 hours
  PASSWORD_RESET: 60 * 60, // 1 hour — short, because it grants account access
};

function hash(token: string): string {
  return crypto.createHash('sha256').update(`${token}${env.JWT_REFRESH_SECRET}`).digest('hex');
}

export async function issueToken(userId: string, type: TokenType): Promise<string> {
  // Invalidate any outstanding token of the same type: requesting a new reset
  // link must retire the previous one.
  await prisma.verificationToken.updateMany({
    where: { userId, type, usedAt: null },
    data: { usedAt: new Date() },
  });

  const token = crypto.randomBytes(32).toString('base64url');
  await prisma.verificationToken.create({
    data: {
      userId,
      type,
      tokenHash: hash(token),
      expiresAt: new Date(Date.now() + TTL_SECONDS[type] * 1000),
    },
  });
  return token;
}

export interface ConsumedToken {
  ok: boolean;
  userId?: string;
  reason?: 'invalid' | 'expired' | 'used';
}

/** Validates and atomically consumes a token. */
export async function consumeToken(token: string, type: TokenType): Promise<ConsumedToken> {
  const record = await prisma.verificationToken.findUnique({ where: { tokenHash: hash(token) } });

  if (!record || record.type !== type) return { ok: false, reason: 'invalid' };
  if (record.usedAt) return { ok: false, reason: 'used' };
  if (record.expiresAt < new Date()) return { ok: false, reason: 'expired' };

  // Guard against a double-submit race: only the update that actually flips
  // usedAt from null wins.
  const claimed = await prisma.verificationToken.updateMany({
    where: { id: record.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  if (claimed.count === 0) return { ok: false, reason: 'used' };

  return { ok: true, userId: record.userId };
}

/** Housekeeping — safe to call from a scheduled job. */
export async function purgeExpiredTokens(): Promise<number> {
  const { count } = await prisma.verificationToken.deleteMany({
    where: { expiresAt: { lt: new Date(Date.now() - 86_400_000) } },
  });
  return count;
}
