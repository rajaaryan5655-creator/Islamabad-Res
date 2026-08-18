import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-obsidian px-6 text-center">
      <Image src="/images/banner-spices.jpg" alt="" fill sizes="100vw" className="object-cover opacity-20" />
      <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/85 to-obsidian/70" />

      <div className="relative max-w-lg">
        <p className="font-script text-6xl text-saffron-400">404</p>
        <h1 className="mt-3 font-display text-[clamp(2.2rem,6vw,3.6rem)] font-semibold text-cream">
          This dish is not on the menu
        </h1>
        <p className="mt-4 text-cream/60">
          The page you were looking for has moved, or never existed. The biryani, however, is exactly where you left
          it.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild variant="primary" size="lg">
            <Link href="/menu">Browse the Menu</Link>
          </Button>
          <Button asChild variant="outlineGold" size="lg">
            <Link href="/">Back to Home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
