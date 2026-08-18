'use client';

import { usePathname } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { CartDrawer } from '@/components/commerce/cart-drawer';
import { ChatWidget } from '@/components/chat/chat-widget';
import { CookieConsent } from '@/components/layout/cookie-consent';

/**
 * The admin console is a full-bleed application surface with its own sidebar,
 * so the marketing chrome (header, footer, concierge, consent banner) is
 * suppressed there.
 */
export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith('/admin');

  if (isAdmin) return <main id="main">{children}</main>;

  return (
    <>
      <Header />
      <main id="main">{children}</main>
      <Footer />
      <CartDrawer />
      <ChatWidget />
      <CookieConsent />
    </>
  );
}
