'use client';

import { useReveal } from '@/hooks/use-reveal';

/** Mounts the global scroll-reveal observer once for the whole app. */
export function RevealProvider() {
  useReveal();
  return null;
}
