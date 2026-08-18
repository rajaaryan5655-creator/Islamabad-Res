import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { Role } from '@islamabad/shared';
import { env } from './env.js';

export interface AccessPayload {
  sub: string;
  email: string;
  role: Role;
  name: string;
}

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function signAccessToken(payload: AccessPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.ACCESS_TOKEN_TTL,
    issuer: 'islamabad-restaurant',
    audience: 'islamabad-web',
  });
}

export function verifyAccessToken(token: string): AccessPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET, {
    issuer: 'islamabad-restaurant',
    audience: 'islamabad-web',
  }) as AccessPayload;
}

export function createRefreshToken(): { token: string; hash: string; expiresAt: Date } {
  const token = crypto.randomBytes(48).toString('base64url');
  return {
    token,
    hash: hashRefreshToken(token),
    expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL * 1000),
  };
}

export function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token + env.JWT_REFRESH_SECRET).digest('hex');
}

export function generateReferralCode(name: string): string {
  const prefix = name.replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase().padEnd(4, 'X');
  return `${prefix}${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

/** Deterministic, collision-resistant human-facing identifiers. */
export function orderNumber(): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `IR-${ymd}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

export function reservationCode(): string {
  return `RSV-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

export function trackingToken(): string {
  return crypto.randomBytes(16).toString('base64url');
}

export function giftCardCode(): string {
  const raw = crypto.randomBytes(6).toString('hex').toUpperCase();
  return `GIFT-${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
}
