import { createRequire } from 'node:module';
import { BRAND } from '@islamabad/shared';
import { env, isProd, isTest } from '../../lib/env.js';
import { prisma } from '../../lib/prisma.js';
import type { RenderedEmail } from './templates.js';

export * from './templates.js';

/**
 * Mail transport.
 *
 * Production uses SMTP via nodemailer when SMTP_URL is set. Without it — dev, CI,
 * and any deployment before the client supplies credentials — messages are
 * recorded to the database and logged instead of being dropped, so the whole
 * flow stays observable and testable. The public API is identical either way.
 */

export interface SendOptions {
  to: string;
  email: RenderedEmail;
  /** Correlates the message with a user for the admin outbox. */
  userId?: string | null;
  kind: string;
}

type Transport = (opts: { to: string; from: string; subject: string; html: string; text: string }) => Promise<void>;

let transport: Transport | null = null;

async function resolveTransport(): Promise<Transport> {
  if (transport) return transport;

  if (env.SMTP_URL) {
    try {
      // Optional dependency: only required when SMTP is actually configured.
      const require = createRequire(import.meta.url);
      const nodemailer = require('nodemailer') as typeof import('nodemailer');
      const mailer = nodemailer.createTransport(env.SMTP_URL);
      transport = async ({ to, from, subject, html, text }) => {
        await mailer.sendMail({ to, from, subject, html, text });
      };
      console.log('[email] SMTP transport ready');
      return transport;
    } catch (err) {
      console.warn('[email] SMTP unavailable, falling back to log transport:', (err as Error).message);
    }
  }

  transport = async ({ to, subject }) => {
    if (!isTest) console.log(`[email] (log transport) → ${to} :: ${subject}`);
  };
  return transport;
}

/**
 * Sends an email and records it. Never throws — a failed welcome email must not
 * fail the registration that triggered it.
 */
export async function sendEmail({ to, email, userId, kind }: SendOptions): Promise<boolean> {
  const from = env.MAIL_FROM || `${BRAND.name} <${BRAND.email}>`;
  let status = 'SENT';
  let error: string | null = null;

  try {
    const send = await resolveTransport();
    await send({ to, from, subject: email.subject, html: email.html, text: email.text });
  } catch (err) {
    status = 'FAILED';
    error = (err as Error).message;
    console.error(`[email] failed to send "${kind}" to ${to}:`, error);
  }

  try {
    await prisma.emailLog.create({
      data: {
        to,
        subject: email.subject,
        kind,
        status,
        error,
        userId: userId ?? null,
        // The rendered body is kept outside production so templates can be
        // inspected in development without a mail client.
        body: isProd ? null : email.html,
      },
    });
  } catch (err) {
    console.warn('[email] could not record message:', (err as Error).message);
  }

  return status === 'SENT';
}

/** Fire-and-forget: use when the caller must not wait on mail delivery. */
export function queueEmail(options: SendOptions): void {
  void sendEmail(options).catch(() => undefined);
}
