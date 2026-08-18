'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { CalendarDays, Gift, Heart, LayoutDashboard, LogOut, MapPin, Receipt, Settings, Sparkles, TicketPercent } from 'lucide-react';
import { useAuth } from '@/store/auth';
import { Spinner } from '@/components/ui/primitives';
import { cn, initials } from '@/lib/utils';

const LINKS = [
  { href: '/dashboard', label: 'Overview', Icon: LayoutDashboard },
  { href: '/dashboard/orders', label: 'Orders', Icon: Receipt },
  { href: '/dashboard/reservations', label: 'Reservations', Icon: CalendarDays },
  { href: '/dashboard/loyalty', label: 'Loyalty', Icon: Sparkles },
  { href: '/dashboard/coupons', label: 'My Offers', Icon: TicketPercent },
  { href: '/dashboard/addresses', label: 'Addresses', Icon: MapPin },
  { href: '/dashboard/gift-cards', label: 'Gift Cards', Icon: Gift },
  { href: '/dashboard/settings', label: 'Settings', Icon: Settings },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, status, logout } = useAuth();

  useEffect(() => {
    if (status === 'guest') router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [status, router, pathname]);

  if (status === 'idle' || status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream pt-24">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-cream pt-[7.5rem]">
      <div className="container-luxe grid gap-8 py-10 lg:grid-cols-[15rem_1fr]">
        <aside className="lg:sticky lg:top-28 lg:h-fit">
          <div className="mb-5 flex items-center gap-3 rounded-sm border border-black/10 bg-white p-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-ember-500 font-display text-lg text-white">
              {initials(user.name)}
            </span>
            <div className="min-w-0">
              <p className="truncate font-medium">{user.name}</p>
              <p className="truncate text-xs text-saffron-600">
                {user.tier.charAt(0) + user.tier.slice(1).toLowerCase()} · {user.points} pts
              </p>
            </div>
          </div>

          <nav aria-label="Dashboard">
            <ul className="space-y-1">
              {LINKS.map(({ href, label, Icon }) => {
                const active = href === '/dashboard' ? pathname === href : pathname.startsWith(href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex items-center gap-3 rounded-sm px-4 py-2.5 text-sm transition-colors',
                        active ? 'bg-obsidian text-cream' : 'text-black/65 hover:bg-black/5',
                      )}
                    >
                      <Icon className="size-4" />
                      {label}
                    </Link>
                  </li>
                );
              })}
              <li>
                <button
                  onClick={() => void logout().then(() => router.push('/'))}
                  className="flex w-full items-center gap-3 rounded-sm px-4 py-2.5 text-sm text-black/65 transition-colors hover:bg-ember-50 hover:text-ember-500"
                >
                  <LogOut className="size-4" />
                  Sign out
                </button>
              </li>
            </ul>
          </nav>
        </aside>

        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
