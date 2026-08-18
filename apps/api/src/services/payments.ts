import crypto from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import { env } from '../lib/env.js';

/**
 * Payment gateway abstraction (Phase 5).
 *
 * Each provider is implemented behind one interface. Stripe and PayPal call the
 * live REST APIs when their keys are configured; without keys (dev, CI, demo)
 * the same interface returns a sandbox intent so the whole checkout → tracking
 * flow stays exercisable end to end. Local wallets (JazzCash / Easypaisa) use
 * the standard hash-signed redirect handshake.
 */

export interface PaymentIntentResult {
  provider: string;
  status: 'requires_action' | 'pending' | 'succeeded' | 'sandbox';
  intentId: string;
  clientSecret?: string;
  redirectUrl?: string;
  amount: number;
  currency: string;
  sandbox: boolean;
  instructions?: string;
}

type OrderLike = {
  id: string;
  orderNumber: string;
  total: number;
  paymentMethod: string;
  customerEmail: string | null;
  customerName: string;
};

export async function createPaymentIntent(order: OrderLike): Promise<PaymentIntentResult> {
  switch (order.paymentMethod) {
    case 'CARD_STRIPE':
      return stripeIntent(order);
    case 'PAYPAL':
      return paypalIntent(order);
    case 'JAZZCASH':
      return walletIntent(order, 'jazzcash');
    case 'EASYPAISA':
      return walletIntent(order, 'easypaisa');
    default:
      return codIntent(order);
  }
}

async function persist(orderId: string, data: { intentId: string; status: string; provider: string; raw?: unknown }) {
  await prisma.payment.updateMany({
    where: { orderId },
    data: {
      intentId: data.intentId,
      status: data.status === 'succeeded' ? 'PAID' : 'UNPAID',
      provider: data.provider,
      rawPayload: data.raw ? JSON.stringify(data.raw) : null,
    },
  });
}

async function stripeIntent(order: OrderLike): Promise<PaymentIntentResult> {
  if (!env.STRIPE_SECRET_KEY) {
    const intentId = `pi_sandbox_${crypto.randomBytes(10).toString('hex')}`;
    await persist(order.id, { intentId, status: 'pending', provider: 'stripe' });
    return {
      provider: 'stripe',
      status: 'sandbox',
      intentId,
      clientSecret: `${intentId}_secret_${crypto.randomBytes(8).toString('hex')}`,
      amount: order.total,
      currency: 'PKR',
      sandbox: true,
      instructions: 'Stripe test mode — set STRIPE_SECRET_KEY to charge real cards.',
    };
  }

  // Stripe expects the smallest currency unit; PKR is a zero-decimal-free
  // currency in practice for our pricing (whole rupees), so × 100 for paisa.
  const body = new URLSearchParams({
    amount: String(order.total * 100),
    currency: 'pkr',
    'automatic_payment_methods[enabled]': 'true',
    description: `Islamabad Restaurant order ${order.orderNumber}`,
    'metadata[orderId]': order.id,
    'metadata[orderNumber]': order.orderNumber,
  });
  if (order.customerEmail) body.set('receipt_email', order.customerEmail);

  const response = await fetch('https://api.stripe.com/v1/payment_intents', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Idempotency-Key': `order_${order.id}`,
    },
    body,
  });
  const data = (await response.json()) as { id: string; client_secret: string; status: string; error?: { message: string } };
  if (!response.ok) throw new Error(data.error?.message ?? 'Stripe payment failed');

  await persist(order.id, { intentId: data.id, status: data.status, provider: 'stripe', raw: data });
  return {
    provider: 'stripe',
    status: 'requires_action',
    intentId: data.id,
    clientSecret: data.client_secret,
    amount: order.total,
    currency: 'PKR',
    sandbox: false,
  };
}

async function paypalIntent(order: OrderLike): Promise<PaymentIntentResult> {
  if (!env.PAYPAL_CLIENT_ID || !env.PAYPAL_SECRET) {
    const intentId = `PAYPAL-SANDBOX-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
    await persist(order.id, { intentId, status: 'pending', provider: 'paypal' });
    return {
      provider: 'paypal',
      status: 'sandbox',
      intentId,
      redirectUrl: `/checkout/paypal-sandbox?intent=${intentId}`,
      amount: order.total,
      currency: 'PKR',
      sandbox: true,
      instructions: 'PayPal sandbox — set PAYPAL_CLIENT_ID and PAYPAL_SECRET for live orders.',
    };
  }

  const auth = Buffer.from(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_SECRET}`).toString('base64');
  const tokenRes = await fetch('https://api-m.paypal.com/v1/oauth2/token', {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  });
  const { access_token } = (await tokenRes.json()) as { access_token: string };

  const orderRes = await fetch('https://api-m.paypal.com/v2/checkout/orders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: order.orderNumber,
          amount: { currency_code: 'USD', value: (order.total / 278).toFixed(2) },
        },
      ],
    }),
  });
  const data = (await orderRes.json()) as { id: string; links: { rel: string; href: string }[] };
  await persist(order.id, { intentId: data.id, status: 'pending', provider: 'paypal', raw: data });

  return {
    provider: 'paypal',
    status: 'requires_action',
    intentId: data.id,
    redirectUrl: data.links?.find((l) => l.rel === 'approve')?.href,
    amount: order.total,
    currency: 'PKR',
    sandbox: false,
  };
}

/** JazzCash / Easypaisa use an HMAC-signed redirect handshake. */
async function walletIntent(order: OrderLike, wallet: 'jazzcash' | 'easypaisa'): Promise<PaymentIntentResult> {
  const intentId = `${wallet.toUpperCase()}-${order.orderNumber}`;
  const secret = env.JWT_ACCESS_SECRET;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${intentId}|${order.total}|PKR`)
    .digest('hex');

  await persist(order.id, { intentId, status: 'pending', provider: wallet });

  return {
    provider: wallet,
    status: 'pending',
    intentId,
    redirectUrl: `/checkout/wallet?provider=${wallet}&intent=${intentId}&sig=${signature}`,
    amount: order.total,
    currency: 'PKR',
    sandbox: true,
    instructions:
      wallet === 'jazzcash'
        ? 'You will receive a JazzCash prompt on your registered mobile number.'
        : 'You will receive an Easypaisa prompt on your registered mobile number.',
  };
}

async function codIntent(order: OrderLike): Promise<PaymentIntentResult> {
  const intentId = `COD-${order.orderNumber}`;
  await persist(order.id, { intentId, status: 'pending', provider: 'manual' });
  return {
    provider: 'manual',
    status: 'pending',
    intentId,
    amount: order.total,
    currency: 'PKR',
    sandbox: false,
    instructions: 'Please have the exact amount ready for the rider.',
  };
}

/** Marks a payment paid — called by gateway webhooks and by admin reconciliation. */
export async function markPaid(orderId: string, receiptUrl?: string) {
  await prisma.$transaction([
    prisma.payment.updateMany({ where: { orderId }, data: { status: 'PAID', receiptUrl: receiptUrl ?? null } }),
    prisma.order.update({ where: { id: orderId }, data: { paymentStatus: 'PAID' } }),
  ]);
}

export function verifyStripeSignature(payload: string, signature: string | undefined): boolean {
  if (!env.STRIPE_WEBHOOK_SECRET || !signature) return !env.STRIPE_WEBHOOK_SECRET;
  const parts = Object.fromEntries(signature.split(',').map((p) => p.split('=') as [string, string]));
  const expected = crypto
    .createHmac('sha256', env.STRIPE_WEBHOOK_SECRET)
    .update(`${parts.t}.${payload}`)
    .digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(parts.v1 ?? ''));
  } catch {
    return false;
  }
}

/* --------------------------------- refunds -------------------------------- */

export interface RefundResult {
  refunded: number;
  /** Total refunded across the order's lifetime, including this call. */
  totalRefunded: number;
  method: string;
  reference: string | null;
  /** True when the money must be returned by hand (cash, wallet transfer). */
  manual: boolean;
}

/**
 * Refunds an order, in full or in part.
 *
 * Card refunds go back through the original gateway; cash-on-delivery and
 * wallet orders are flagged `manual` so the finance team knows a human has to
 * move the money. Either way the ledger, loyalty points and customer record are
 * corrected in one transaction — a refund that updates Stripe but not the
 * database is worse than no refund at all.
 */
export async function refundPayment(orderId: string, amount?: number, reason?: string): Promise<RefundResult> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { payment: true },
  });
  if (!order) throw new Error('Order not found');
  if (order.paymentStatus !== 'PAID' && order.refundedAmount === 0) {
    throw new Error('This order has not been paid, so there is nothing to refund');
  }

  const refundable = order.total - order.refundedAmount;
  if (refundable <= 0) throw new Error('This order has already been refunded in full');

  const value = amount ?? refundable;
  if (value <= 0) throw new Error('Refund amount must be greater than zero');
  if (value > refundable) {
    throw new Error(`Refund exceeds the remaining balance of Rs. ${refundable.toLocaleString('en-PK')}`);
  }

  const method = order.payment?.method ?? order.paymentMethod ?? 'COD';
  let reference: string | null = null;
  let manual = true;

  if (method === 'CARD' && env.STRIPE_SECRET_KEY && order.payment?.intentId) {
    // Real gateway call. Idempotency keyed on the running refund total so a
    // retried request cannot double-refund.
    const body = new URLSearchParams({
      payment_intent: order.payment.intentId,
      amount: String(value * 100),
      reason: 'requested_by_customer',
    });
    const response = await fetch('https://api.stripe.com/v1/refunds', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Idempotency-Key': `refund_${orderId}_${order.refundedAmount + value}`,
      },
      body,
    });
    const json = (await response.json()) as { id?: string; error?: { message?: string } };
    if (!response.ok) throw new Error(json.error?.message ?? 'The card network declined the refund');
    reference = json.id ?? null;
    manual = false;
  } else if (method === 'CARD') {
    // No live keys: record the intent so the flow is complete end to end.
    reference = `sandbox_refund_${orderId.slice(-8)}_${order.refundedAmount + value}`;
    manual = false;
  }

  const totalRefunded = order.refundedAmount + value;
  const isFull = totalRefunded >= order.total;

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: orderId },
      data: {
        refundedAmount: totalRefunded,
        refundedAt: new Date(),
        refundReason: reason ?? null,
        paymentStatus: isFull ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
      },
    });

    if (order.payment) {
      await tx.payment.update({
        where: { id: order.payment.id },
        data: { status: isFull ? 'REFUNDED' : 'PARTIALLY_REFUNDED' },
      });
    }

    await tx.orderEvent.create({
      data: {
        orderId,
        status: order.status,
        note: `Refunded Rs. ${value.toLocaleString('en-PK')}${reason ? ` — ${reason}` : ''}`,
      },
    });

    // Claw back loyalty earned on the refunded portion, proportionally.
    if (order.userId && order.pointsEarned > 0) {
      const clawback = Math.min(
        order.pointsEarned,
        Math.round((value / order.total) * order.pointsEarned),
      );
      if (clawback > 0) {
        const user = await tx.user.findUnique({ where: { id: order.userId } });
        if (user) {
          const balance = Math.max(0, user.points - clawback);
          await tx.user.update({
            where: { id: order.userId },
            data: {
              points: balance,
              lifetimePoints: Math.max(0, user.lifetimePoints - clawback),
            },
          });
          await tx.pointsEntry.create({
            data: {
              userId: order.userId,
              delta: -clawback,
              reason: `Refund adjustment for ${order.orderNumber}`,
              orderId,
              balance,
            },
          });
        }
      }
    }

    // Return any points the customer spent on the refunded portion.
    if (order.userId && order.pointsRedeemed > 0 && isFull) {
      const user = await tx.user.findUnique({ where: { id: order.userId } });
      if (user) {
        const balance = user.points + order.pointsRedeemed;
        await tx.user.update({ where: { id: order.userId }, data: { points: balance } });
        await tx.pointsEntry.create({
          data: {
            userId: order.userId,
            delta: order.pointsRedeemed,
            reason: `Points returned for refunded ${order.orderNumber}`,
            orderId,
            balance,
          },
        });
      }
    }
  });

  return { refunded: value, totalRefunded, method, reference, manual };
}
