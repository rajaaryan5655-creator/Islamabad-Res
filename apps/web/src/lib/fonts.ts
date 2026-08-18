import localFont from 'next/font/local';

/**
 * Self-hosted fonts.
 *
 * Serving the woff2 files from our own origin removes a third-party DNS +
 * TLS handshake from the critical path, eliminates the Google Fonts privacy
 * concern under GDPR, and lets us set immutable cache headers. Only the Latin
 * subsets are shipped (176 KB total).
 */

export const inter = localFont({
  src: [{ path: '../../public/fonts/inter-latin-wght-normal.woff2', weight: '100 900', style: 'normal' }],
  variable: '--font-inter',
  display: 'swap',
  preload: true,
  fallback: ['system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
  adjustFontFallback: 'Arial',
});

export const cormorant = localFont({
  src: [
    { path: '../../public/fonts/cormorant-garamond-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: '../../public/fonts/cormorant-garamond-latin-500-normal.woff2', weight: '500', style: 'normal' },
    { path: '../../public/fonts/cormorant-garamond-latin-600-normal.woff2', weight: '600', style: 'normal' },
    { path: '../../public/fonts/cormorant-garamond-latin-700-normal.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-cormorant',
  display: 'swap',
  preload: true,
  fallback: ['Georgia', 'Times New Roman', 'serif'],
  adjustFontFallback: 'Times New Roman',
});

export const dancing = localFont({
  src: [{ path: '../../public/fonts/dancing-script-latin-700-normal.woff2', weight: '700', style: 'normal' }],
  variable: '--font-dancing',
  display: 'swap',
  preload: false,
  fallback: ['cursive'],
});
