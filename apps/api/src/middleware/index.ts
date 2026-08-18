import type { NextFunction, Request, Response } from 'express';
import { ZodError, type ZodType } from 'zod';
import { ROLE_RANK, type Role } from '@islamabad/shared';
import { verifyAccessToken, type AccessPayload } from '../lib/auth.js';
import { cache } from '../lib/cache.js';
import { isProd } from '../lib/env.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AccessPayload;
      validated?: unknown;
    }
  }
}

/* --------------------------------- errors -------------------------------- */

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export const badRequest = (m: string, d?: unknown) => new HttpError(400, 'BAD_REQUEST', m, d);
export const unauthorized = (m = 'Authentication required') => new HttpError(401, 'UNAUTHORIZED', m);
export const forbidden = (m = 'You do not have permission to do that') => new HttpError(403, 'FORBIDDEN', m);
export const notFound = (m = 'Not found') => new HttpError(404, 'NOT_FOUND', m);
export const conflict = (m: string) => new HttpError(409, 'CONFLICT', m);
export const tooMany = (m = 'Too many requests') => new HttpError(429, 'RATE_LIMITED', m);

/** Wraps async handlers so rejected promises reach the error middleware. */
export function asyncHandler<T extends Request = Request>(
  fn: (req: T, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req as T, res, next)).catch(next);
  };
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.code, message: err.message, details: err.details });
  }
  if (err instanceof ZodError) {
    return res.status(422).json({
      error: 'VALIDATION_ERROR',
      message: 'Please check the highlighted fields',
      details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }
  const e = err as Error & { code?: string };
  // Prisma unique-constraint violation
  if (e.code === 'P2002') {
    return res.status(409).json({ error: 'CONFLICT', message: 'That record already exists' });
  }
  if (e.code === 'P2025') {
    return res.status(404).json({ error: 'NOT_FOUND', message: 'Record not found' });
  }
  console.error('[api] Unhandled error:', e);
  return res.status(500).json({
    error: 'INTERNAL_ERROR',
    message: isProd ? 'Something went wrong on our side' : e.message,
  });
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: 'NOT_FOUND', message: `No route for ${req.method} ${req.path}` });
}

/* ------------------------------- validation ------------------------------ */

export function validate<S extends ZodType>(schema: S, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) return next(result.error);
    req.validated = result.data;
    if (source === 'body') req.body = result.data;
    next();
  };
}

export function validated<T>(req: Request): T {
  return req.validated as T;
}

/** Express 5 types route params as `string | string[]`; normalise to a string. */
export function param(req: Request, key: string): string {
  const value = (req.params as Record<string, string | string[]>)[key];
  return Array.isArray(value) ? value[0] : (value ?? '');
}

/* ----------------------------------- auth -------------------------------- */

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  const cookie = (req as Request & { cookies?: Record<string, string> }).cookies?.access_token;
  return cookie ?? null;
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) return next(unauthorized());
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    next(unauthorized('Your session has expired — please sign in again'));
  }
}

/** Attaches the user when a token is present, but never blocks the request. */
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (token) {
    try {
      req.user = verifyAccessToken(token);
    } catch {
      /* ignore — treated as guest */
    }
  }
  next();
}

export function requireRole(...roles: Role[]) {
  const minRank = Math.min(...roles.map((r) => ROLE_RANK[r]));
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(unauthorized());
    if (ROLE_RANK[req.user.role] < minRank) return next(forbidden());
    next();
  };
}

export const requireStaff = requireRole('STAFF');
export const requireManager = requireRole('MANAGER');
export const requireSuperAdmin = requireRole('SUPER_ADMIN');

/* ------------------------------ rate limiting ---------------------------- */

export function rateLimit(opts: { windowSeconds: number; max: number; keyPrefix: string }) {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
    const key = `rl:${opts.keyPrefix}:${ip}`;
    const count = await cache.incr(key, opts.windowSeconds);
    res.setHeader('X-RateLimit-Limit', opts.max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, opts.max - count));
    if (count > opts.max) {
      return next(tooMany(`Too many requests. Please wait ${opts.windowSeconds}s and try again.`));
    }
    next();
  });
}

/* ---------------------------- csrf (double submit) ------------------------ */

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Double-submit-cookie CSRF guard. Only enforced for cookie-authenticated
 * mutations — pure Bearer-token API clients are immune by construction.
 */
export function csrfGuard(req: Request, _res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method)) return next();
  const cookies = (req as Request & { cookies?: Record<string, string> }).cookies ?? {};
  const usesCookieAuth = Boolean(cookies.access_token) && !req.headers.authorization;
  if (!usesCookieAuth) return next();
  const header = req.headers['x-csrf-token'];
  if (!header || header !== cookies.csrf_token) {
    return next(new HttpError(403, 'CSRF_FAILED', 'Invalid or missing CSRF token'));
  }
  next();
}
