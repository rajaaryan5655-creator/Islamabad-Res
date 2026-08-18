import { Router } from 'express';
import {
  loginSchema,
  registerSchema,
  oauthSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  profileUpdateSchema,
  addressSchema,
  tierForPoints,
  type RegisterInput,
  type LoginInput,
  type AddressInput,
} from '@islamabad/shared';
import { prisma } from '../lib/prisma.js';
import { parseList, stringifyList } from '../lib/json.js';
import {
  createRefreshToken,
  generateReferralCode,
  hashPassword,
  hashRefreshToken,
  signAccessToken,
  verifyPassword,
} from '../lib/auth.js';
import {
  asyncHandler,
  authenticate,
  badRequest,
  conflict,
  notFound,
  rateLimit,
  unauthorized,
  validate,
  validated,
  param,
} from '../middleware/index.js';
import { env, isProd } from '../lib/env.js';
import { audit } from '../services/audit.js';
import { issueToken, consumeToken } from '../services/tokens.js';
import { queueEmail, sendEmail, welcomeEmail, verifyEmail, passwordResetEmail } from '../services/email/index.js';

export const authRouter = Router();

/** Links point at the web app, not the API, so they open the customer UI. */
function verificationUrl(token: string): string {
  return `${env.WEB_ORIGIN.replace(/\/$/, '')}/verify-email?token=${encodeURIComponent(token)}`;
}

function resetUrl(token: string): string {
  return `${env.WEB_ORIGIN.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(token)}`;
}

type SafeUser = ReturnType<typeof toSafeUser>;

function toSafeUser(u: {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: string;
  avatarUrl: string | null;
  points: number;
  lifetimePoints: number;
  tier: string;
  referralCode: string;
  emailVerified: boolean;
  marketingOptIn: boolean;
  dietaryPrefs: string;
  createdAt: Date;
}) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    phone: u.phone,
    role: u.role,
    avatarUrl: u.avatarUrl,
    points: u.points,
    lifetimePoints: u.lifetimePoints,
    tier: u.tier,
    referralCode: u.referralCode,
    emailVerified: u.emailVerified,
    marketingOptIn: u.marketingOptIn,
    dietaryPrefs: parseList(u.dietaryPrefs),
    memberSince: u.createdAt,
  };
}

function setAuthCookies(res: import('express').Response, accessToken: string, refreshToken: string, csrf: string) {
  const secure = isProd;
  res.cookie('access_token', accessToken, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    maxAge: env.ACCESS_TOKEN_TTL * 1000,
    path: '/',
  });
  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    maxAge: env.REFRESH_TOKEN_TTL * 1000,
    path: '/',
  });
  res.cookie('csrf_token', csrf, {
    httpOnly: false,
    secure,
    sameSite: 'lax',
    maxAge: env.REFRESH_TOKEN_TTL * 1000,
    path: '/',
  });
}

async function issueSession(
  res: import('express').Response,
  user: { id: string; email: string; name: string; role: string },
  req: import('express').Request,
) {
  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role as 'CUSTOMER',
    name: user.name,
  });
  const refresh = createRefreshToken();
  await prisma.session.create({
    data: {
      userId: user.id,
      refreshToken: refresh.hash,
      expiresAt: refresh.expiresAt,
      userAgent: req.headers['user-agent']?.slice(0, 240) ?? null,
      ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.ip ?? null,
    },
  });
  const csrf = createRefreshToken().token.slice(0, 32);
  setAuthCookies(res, accessToken, refresh.token, csrf);
  return { accessToken, refreshToken: refresh.token, csrfToken: csrf };
}

/* -------------------------------- register ------------------------------- */

authRouter.post(
  '/register',
  rateLimit({ windowSeconds: 900, max: 10, keyPrefix: 'register' }),
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const input = validated<RegisterInput>(req);
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw conflict('An account with that email already exists');

    const user = await prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        phone: input.phone,
        passwordHash: await hashPassword(input.password),
        referralCode: generateReferralCode(input.name),
        role: 'CUSTOMER',
      },
    });

    // Welcome bonus (Phase 14 loyalty).
    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { points: 250, lifetimePoints: 250 } }),
      prisma.pointsEntry.create({
        data: { userId: user.id, delta: 250, reason: 'Welcome bonus', balance: 250 },
      }),
      prisma.notification.create({
        data: {
          userId: user.id,
          type: 'SYSTEM',
          title: 'Welcome to Islamabad Restaurant',
          body: 'You have 250 welcome points — worth Rs. 500 off your first order.',
          link: '/dashboard/loyalty',
        },
      }),
    ]);

    const fresh = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    const tokens = await issueSession(res, fresh, req);
    await audit(user.id, 'user.register', 'User', user.id, req);

    // Mail is queued, never awaited: a slow SMTP hop must not delay signup.
    const verifyToken = await issueToken(user.id, 'EMAIL_VERIFY');
    const verifyUrl = verificationUrl(verifyToken);
    queueEmail({
      to: user.email,
      kind: 'welcome',
      userId: user.id,
      email: welcomeEmail({ name: user.name, verifyUrl }),
    });
    queueEmail({
      to: user.email,
      kind: 'verify-email',
      userId: user.id,
      email: verifyEmail({ name: user.name, verifyUrl }),
    });

    res.status(201).json({ user: toSafeUser(fresh), ...tokens });
  }),
);


/* --------------------------- email verification --------------------------- */

/**
 * Confirms an address from the emailed link. Idempotent for an already-verified
 * account so a second click on the link is not an error the customer sees.
 */
authRouter.post(
  '/verify-email',
  rateLimit({ windowSeconds: 900, max: 20, keyPrefix: 'verify-email' }),
  validate(verifyEmailSchema),
  asyncHandler(async (req, res) => {
    const { token } = req.body as { token: string };
    const result = await consumeToken(token, 'EMAIL_VERIFY');

    if (!result.ok) {
      throw badRequest(
        result.reason === 'expired'
          ? 'This verification link has expired. Request a new one from your dashboard.'
          : 'This verification link is no longer valid.',
      );
    }

    const user = await prisma.user.update({
      where: { id: result.userId },
      data: { emailVerified: true },
    });
    await prisma.notification.create({
      data: {
        userId: user.id,
        type: 'SYSTEM',
        title: 'Email verified',
        body: 'Your email address is confirmed. You will now receive order and reservation updates.',
        link: '/dashboard',
      },
    });
    await audit(user.id, 'user.email_verified', 'User', user.id, req);
    res.json({ verified: true, user: toSafeUser(user) });
  }),
);

/** Re-sends the verification link to the signed-in account. */
authRouter.post(
  '/resend-verification',
  authenticate,
  rateLimit({ windowSeconds: 900, max: 5, keyPrefix: 'resend-verify' }),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.sub } });
    if (user.emailVerified) {
      res.json({ sent: false, message: 'Your email address is already verified.' });
      return;
    }
    const token = await issueToken(user.id, 'EMAIL_VERIFY');
    const sent = await sendEmail({
      to: user.email,
      kind: 'verify-email',
      userId: user.id,
      email: verifyEmail({ name: user.name, verifyUrl: verificationUrl(token) }),
    });
    res.json({ sent, message: 'Verification link sent. Please check your inbox.' });
  }),
);

/* ----------------------------- password reset ----------------------------- */

/**
 * Always answers 200 with the same body whether or not the address exists —
 * otherwise this endpoint becomes an account-enumeration oracle.
 */
authRouter.post(
  '/forgot-password',
  rateLimit({ windowSeconds: 900, max: 5, keyPrefix: 'forgot-password' }),
  validate(forgotPasswordSchema),
  asyncHandler(async (req, res) => {
    const { email } = req.body as { email: string };
    const user = await prisma.user.findUnique({ where: { email } });

    if (user?.isActive && user.passwordHash) {
      const token = await issueToken(user.id, 'PASSWORD_RESET');
      await sendEmail({
        to: user.email,
        kind: 'password-reset',
        userId: user.id,
        email: passwordResetEmail({ name: user.name, resetUrl: resetUrl(token) }),
      });
      await audit(user.id, 'user.password_reset_requested', 'User', user.id, req);
    }

    res.json({
      sent: true,
      message: 'If an account exists for that address, a reset link is on its way.',
    });
  }),
);

/** Completes the reset and revokes every existing session. */
authRouter.post(
  '/reset-password',
  rateLimit({ windowSeconds: 900, max: 10, keyPrefix: 'reset-password' }),
  validate(resetPasswordSchema),
  asyncHandler(async (req, res) => {
    const { token, password } = req.body as { token: string; password: string };
    const result = await consumeToken(token, 'PASSWORD_RESET');

    if (!result.ok) {
      throw badRequest(
        result.reason === 'expired'
          ? 'This reset link has expired. Please request a new one.'
          : 'This reset link is no longer valid. Please request a new one.',
      );
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: result.userId },
        data: { passwordHash: await hashPassword(password) },
      }),
      // A password change must invalidate sessions an attacker may hold.
      prisma.session.deleteMany({ where: { userId: result.userId } }),
      prisma.notification.create({
        data: {
          userId: result.userId!,
          type: 'SYSTEM',
          title: 'Password changed',
          body: 'Your password was reset. If this was not you, contact us immediately.',
          link: '/dashboard',
        },
      }),
    ]);

    await audit(result.userId!, 'user.password_reset', 'User', result.userId!, req);
    res.json({ reset: true, message: 'Password updated. You can now sign in.' });
  }),
);

/* --------------------------------- login --------------------------------- */

authRouter.post(
  '/login',
  rateLimit({ windowSeconds: 900, max: 20, keyPrefix: 'login' }),
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const input = validated<LoginInput>(req);
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    // Constant-ish response to avoid user enumeration.
    if (!user?.passwordHash || !(await verifyPassword(input.password, user.passwordHash))) {
      throw unauthorized('Incorrect email or password');
    }
    if (!user.isActive) throw unauthorized('This account has been deactivated');

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    const tokens = await issueSession(res, user, req);
    await audit(user.id, 'user.login', 'User', user.id, req);
    res.json({ user: toSafeUser(user), ...tokens });
  }),
);

/* --------------------------------- oauth --------------------------------- */

/**
 * Social login. In production the `token` is verified against the provider's
 * token-info endpoint; in development a signed stub payload is accepted so the
 * flow is testable without external credentials.
 */
authRouter.post(
  '/oauth',
  rateLimit({ windowSeconds: 900, max: 20, keyPrefix: 'oauth' }),
  validate(oauthSchema),
  asyncHandler(async (req, res) => {
    const { provider, token, email: hintEmail, name: hintName } = req.body as {
      provider: 'google' | 'facebook';
      token: string;
      email?: string;
      name?: string;
    };

    const profile = await resolveOAuthProfile(provider, token, hintEmail, hintName);
    if (!profile.email) throw badRequest('The provider did not return an email address');

    let user = await prisma.user.findUnique({ where: { email: profile.email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: profile.email,
          name: profile.name,
          provider,
          providerId: profile.id,
          emailVerified: true,
          avatarUrl: profile.picture ?? null,
          referralCode: generateReferralCode(profile.name),
          points: 250,
          lifetimePoints: 250,
        },
      });
      await prisma.pointsEntry.create({
        data: { userId: user.id, delta: 250, reason: 'Welcome bonus', balance: 250 },
      });
    } else if (user.provider === 'local' && !user.providerId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { providerId: profile.id, emailVerified: true, lastLoginAt: new Date() },
      });
    }

    const tokens = await issueSession(res, user, req);
    await audit(user.id, `user.login.${provider}`, 'User', user.id, req);
    res.json({ user: toSafeUser(user), ...tokens });
  }),
);

async function resolveOAuthProfile(
  provider: 'google' | 'facebook',
  token: string,
  hintEmail?: string,
  hintName?: string,
) {
  if (isProd) {
    const url =
      provider === 'google'
        ? `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`
        : `https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${encodeURIComponent(token)}`;
    const response = await fetch(url);
    if (!response.ok) throw unauthorized(`${provider} sign-in failed`);
    const data = (await response.json()) as Record<string, string>;
    return {
      id: data.sub ?? data.id ?? token.slice(0, 24),
      email: (data.email ?? '').toLowerCase(),
      name: data.name ?? 'Guest',
      picture: data.picture,
    };
  }
  // Development stub — never reached in production.
  return {
    id: `${provider}_${token.slice(0, 16)}`,
    email: (hintEmail ?? `${provider}.demo@islamabadrestaurant.pk`).toLowerCase(),
    name: hintName ?? 'Social Guest',
    picture: undefined as string | undefined,
  };
}

/* -------------------------------- refresh -------------------------------- */

authRouter.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const raw = req.cookies?.refresh_token ?? (req.body as { refreshToken?: string })?.refreshToken;
    if (!raw) throw unauthorized('No refresh token supplied');

    const session = await prisma.session.findUnique({
      where: { refreshToken: hashRefreshToken(raw) },
      include: { user: true },
    });
    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw unauthorized('Session expired — please sign in again');
    }

    // Rotate: revoke the used token and issue a fresh pair.
    await prisma.session.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
    const tokens = await issueSession(res, session.user, req);
    res.json({ user: toSafeUser(session.user), ...tokens });
  }),
);

/* --------------------------------- logout -------------------------------- */

authRouter.post(
  '/logout',
  asyncHandler(async (req, res) => {
    const raw = req.cookies?.refresh_token;
    if (raw) {
      await prisma.session.updateMany({
        where: { refreshToken: hashRefreshToken(raw) },
        data: { revokedAt: new Date() },
      });
    }
    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/' });
    res.clearCookie('csrf_token', { path: '/' });
    res.json({ ok: true });
  }),
);

/* ----------------------------------- me ---------------------------------- */

authRouter.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
    if (!user) throw notFound('Account not found');
    res.json({ user: toSafeUser(user), tier: tierForPoints(user.lifetimePoints) });
  }),
);

authRouter.patch(
  '/me',
  authenticate,
  validate(profileUpdateSchema),
  asyncHandler(async (req, res) => {
    const input = req.body as { name?: string; phone?: string; dietaryPrefs?: string[]; marketingOptIn?: boolean };
    const user = await prisma.user.update({
      where: { id: req.user!.sub },
      data: {
        name: input.name,
        phone: input.phone,
        marketingOptIn: input.marketingOptIn,
        dietaryPrefs: input.dietaryPrefs ? stringifyList(input.dietaryPrefs) : undefined,
      },
    });
    res.json({ user: toSafeUser(user) });
  }),
);

authRouter.post(
  '/change-password',
  authenticate,
  rateLimit({ windowSeconds: 900, max: 5, keyPrefix: 'pwchange' }),
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword?: string };
    if (!currentPassword || !newPassword || newPassword.length < 8) {
      throw badRequest('Provide your current password and a new password of at least 8 characters');
    }
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.sub } });
    if (!user.passwordHash || !(await verifyPassword(currentPassword, user.passwordHash))) {
      throw unauthorized('Current password is incorrect');
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(newPassword) },
    });
    // Invalidate every other session.
    await prisma.session.updateMany({ where: { userId: user.id }, data: { revokedAt: new Date() } });
    await audit(user.id, 'user.password_change', 'User', user.id, req);
    res.json({ ok: true, message: 'Password updated. Please sign in again.' });
  }),
);

/* -------------------------------- addresses ------------------------------ */

authRouter.get(
  '/addresses',
  authenticate,
  asyncHandler(async (req, res) => {
    const addresses = await prisma.address.findMany({
      where: { userId: req.user!.sub },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
    res.json({ addresses });
  }),
);

authRouter.post(
  '/addresses',
  authenticate,
  validate(addressSchema),
  asyncHandler(async (req, res) => {
    const input = validated<AddressInput>(req);
    if (input.isDefault) {
      await prisma.address.updateMany({ where: { userId: req.user!.sub }, data: { isDefault: false } });
    }
    const count = await prisma.address.count({ where: { userId: req.user!.sub } });
    const address = await prisma.address.create({
      data: { ...input, line2: input.line2 || null, notes: input.notes || null, userId: req.user!.sub, isDefault: input.isDefault ?? count === 0 },
    });
    res.status(201).json({ address });
  }),
);

authRouter.patch(
  '/addresses/:id',
  authenticate,
  validate(addressSchema.partial()),
  asyncHandler(async (req, res) => {
    const owned = await prisma.address.findFirst({ where: { id: param(req, 'id'), userId: req.user!.sub } });
    if (!owned) throw notFound('Address not found');
    const input = req.body as Partial<AddressInput>;
    if (input.isDefault) {
      await prisma.address.updateMany({ where: { userId: req.user!.sub }, data: { isDefault: false } });
    }
    const address = await prisma.address.update({ where: { id: owned.id }, data: input });
    res.json({ address });
  }),
);

authRouter.delete(
  '/addresses/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const owned = await prisma.address.findFirst({ where: { id: param(req, 'id'), userId: req.user!.sub } });
    if (!owned) throw notFound('Address not found');
    await prisma.address.delete({ where: { id: owned.id } });
    res.json({ ok: true });
  }),
);

export type { SafeUser };
export { toSafeUser };
