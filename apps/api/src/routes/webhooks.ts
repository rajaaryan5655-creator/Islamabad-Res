import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { markPaid, verifyStripeSignature } from '../services/payments.js';
import { transitionOrder } from '../services/orders.js';
import { asyncHandler } from '../middleware/index.js';

export const webhookRouter = Router();

/** Stripe payment webhook — raw body, signature-verified. */
webhookRouter.post(
  '/stripe',
  asyncHandler(async (req, res) => {
    const raw = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : JSON.stringify(req.body);
    if (!verifyStripeSignature(raw, req.headers['stripe-signature'] as string | undefined)) {
      return res.status(400).json({ error: 'INVALID_SIGNATURE', message: 'Signature verification failed' });
    }

    const event = JSON.parse(raw) as { type: string; data: { object: Record<string, unknown> } };
    const object = event.data?.object ?? {};
    const orderId = (object.metadata as Record<string, string> | undefined)?.orderId;

    if (event.type === 'payment_intent.succeeded' && orderId) {
      await markPaid(orderId, (object.charges as { data?: { receipt_url?: string }[] })?.data?.[0]?.receipt_url);
      const order = await prisma.order.findUnique({ where: { id: orderId } });
      if (order?.status === 'PENDING') {
        await transitionOrder(orderId, 'CONFIRMED', null, 'Payment received via Stripe');
      }
    }

    if (event.type === 'payment_intent.payment_failed' && orderId) {
      await prisma.payment.updateMany({ where: { orderId }, data: { status: 'FAILED' } });
      await prisma.order.update({ where: { id: orderId }, data: { paymentStatus: 'FAILED' } });
    }

    res.json({ received: true });
  }),
);

/** PayPal capture webhook. */
webhookRouter.post(
  '/paypal',
  asyncHandler(async (req, res) => {
    const raw = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : JSON.stringify(req.body);
    const event = JSON.parse(raw) as { event_type: string; resource: Record<string, string> };

    if (event.event_type === 'CHECKOUT.ORDER.APPROVED' || event.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
      const payment = await prisma.payment.findFirst({ where: { intentId: event.resource?.id } });
      if (payment) {
        await markPaid(payment.orderId);
        const order = await prisma.order.findUnique({ where: { id: payment.orderId } });
        if (order?.status === 'PENDING') {
          await transitionOrder(payment.orderId, 'CONFIRMED', null, 'Payment received via PayPal');
        }
      }
    }
    res.json({ received: true });
  }),
);

/** Local wallet callback (JazzCash / Easypaisa). */
webhookRouter.post(
  '/wallet',
  asyncHandler(async (req, res) => {
    const raw = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : JSON.stringify(req.body);
    const body = JSON.parse(raw) as { intentId?: string; status?: string };
    if (body.intentId && body.status === 'SUCCESS') {
      const payment = await prisma.payment.findFirst({ where: { intentId: body.intentId } });
      if (payment) {
        await markPaid(payment.orderId);
        const order = await prisma.order.findUnique({ where: { id: payment.orderId } });
        if (order?.status === 'PENDING') {
          await transitionOrder(payment.orderId, 'CONFIRMED', null, 'Wallet payment received');
        }
      }
    }
    res.json({ received: true });
  }),
);
