import type { Request } from 'express';
import { prisma } from '../lib/prisma.js';

/** Fire-and-forget audit trail (Phase 11 compliance). */
export async function audit(
  actorId: string | null,
  action: string,
  entity: string,
  entityId?: string | null,
  req?: Request,
  meta?: unknown,
) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId,
        action,
        entity,
        entityId: entityId ?? null,
        meta: meta ? JSON.stringify(meta) : null,
        ip: req ? ((req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.ip ?? null) : null,
      },
    });
  } catch (err) {
    console.warn('[audit] failed to record', action, (err as Error).message);
  }
}
