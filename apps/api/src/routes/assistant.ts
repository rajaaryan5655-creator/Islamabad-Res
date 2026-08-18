import { Router } from 'express';
import { chatSchema } from '@islamabad/shared';
import { asyncHandler, optionalAuth, rateLimit, validate } from '../middleware/index.js';
import { answer, recommendations } from '../services/assistant.js';

export const assistantRouter = Router();

assistantRouter.post(
  '/chat',
  optionalAuth,
  rateLimit({ windowSeconds: 60, max: 30, keyPrefix: 'chat' }),
  validate(chatSchema),
  asyncHandler(async (req, res) => {
    const { message, history } = req.body as { message: string; history?: { role: string; content: string }[] };
    const reply = await answer(message, history ?? []);
    res.json(reply);
  }),
);

assistantRouter.get(
  '/recommendations',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const cart = String(req.query.cart ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const result = await recommendations(req.user?.sub ?? null, cart);
    res.json(result);
  }),
);
