'use client';

import { useEffect } from 'react';

/**
 * Progressive scroll-reveal.
 *
 * Elements carry `.reveal` and are visible by default for crawlers and no-JS
 * users; this observer adds `.is-visible` as they enter the viewport. Using a
 * single document-level observer keeps this cheap regardless of element count.
 */
export function useReveal() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.08, rootMargin: '0px 0px -60px 0px' },
    );

    const attach = () => {
      document.querySelectorAll('.reveal:not(.is-visible)').forEach((el) => observer.observe(el));
    };
    attach();

    // Re-attach when client-rendered content appears (filters, pagination).
    const mutation = new MutationObserver(attach);
    mutation.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutation.disconnect();
    };
  }, []);
}
