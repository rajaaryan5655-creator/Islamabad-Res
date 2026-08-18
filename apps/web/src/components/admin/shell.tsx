'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart3,
  CalendarDays,
  ChefHat,
  Inbox,
  LogOut,
  LayoutGrid,
  Receipt,
  Settings,
  Star,
  Tag,
  UserCog,
  Users,
  UtensilsCrossed,
} from 'lucide-react';
import { useAuth } from '@/store/auth';
import { Spinner } from '@/components/ui/primitives';
import { cn, initials } from '@/lib/utils';

const LINKS = [
  { href: '/admin', label: 'Overview', Icon: BarChart3, minRole: 'STAFF' },
  { href: '/admin/orders', label: 'Orders', Icon: Receipt, minRole: 'STAFF' },
  { href: '/admin/kitchen', label: 'Kitchen board', Icon: ChefHat, minRole: 'STAFF' },
  { href: '/admin/reservations', label: 'Reservations', Icon: CalendarDays, minRole: 'STAFF' },
  { href: '/admin/menu', label: 'Menu', Icon: UtensilsCrossed, minRole: 'MANAGER' },
  { href: '/admin/categories', label: 'Categories', Icon: LayoutGrid, minRole: 'MANAGER' },
  { href: '/admin/reviews', label: 'Reviews', Icon: Star, minRole: 'STAFF' },
  { href: '/admin/customers', label: 'Customers', Icon: Users, minRole: 'MANAGER' },
  { href: '/admin/marketing', label: 'Marketing', Icon: Tag, minRole: 'MANAGER' },
  { href: '/admin/inbox', label: 'Inbox', Icon: Inbox, minRole: 'STAFF' },
  { href: '/admin/staff', label: 'Staff', Icon: UserCog, minRole: 'SUPER_ADMIN' },
  { href: '/admin/settings', label: 'Settings', Icon: Settings, minRole: 'MANAGER' },
];

const RANK: Record<string, number> = { CUSTOMER: 10, STAFF: 20, MANAGER: 30, SUPER_ADMIN: 40 };

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, status, logout } = useAuth();

  useEffect(() => {
    if (status === 'guest') router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    if (status === 'authenticated' && user && RANK[user.role] < RANK.STAFF) router.replace('/dashboard');
  }, [status, user, router, pathname]);

  if (status === 'idle' || status === 'loading' || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-charcoal">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (RANK[user.role] < RANK.STAFF) return null;

  const visible = LINKS.filter((l) => RANK[user.role] >= RANK[l.minRole]);

  return (
    <div className="min-h-screen bg-charcoal text-cream">
      <div className="flex">
        {/* sidebar */}
        <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-white/8 bg-obsidian lg:flex">
          <Link href="/" className="flex items-center gap-2.5 border-b border-white/8 px-5 py-5">
            <span className="flex size-9 items-center justify-center rounded-sm bg-ember-500">
              <ChefHat className="size-5 text-white" />
            </span>
            <span className="leading-none">
              <span className="block font-display text-lg">Islamabad</span>
              <span className="text-[0.55rem] uppercase tracking-[0.3em] text-saffron-400">Admin</span>
            </span>
          </Link>

          <nav aria-label="Admin" className="flex-1 overflow-y-auto p-3">
            <ul className="space-y-0.5">
              {visible.map(({ href, label, Icon }) => {
                const active = href === '/admin' ? pathname === href : pathname.startsWith(href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex items-center gap-3 rounded-sm px-3.5 py-2.5 text-sm transition-colors',
                        active ? 'bg-ember-500 text-white' : 'text-cream/65 hover:bg-white/6 hover:text-cream',
                      )}
                    >
                      <Icon className="size-4" />
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="border-t border-white/8 p-3">
            <div className="mb-2 flex items-center gap-2.5 px-2">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-saffron-400 text-sm font-semibold text-obsidian">
                {initials(user.name)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm">{user.name}</p>
                <p className="truncate text-[0.65rem] uppercase tracking-wider text-cream/40">
                  {user.role.replace('_', ' ').toLowerCase()}
                </p>
              </div>
            </div>
            <button
              onClick={() => void logout().then(() => router.push('/'))}
              className="flex w-full items-center gap-3 rounded-sm px-3.5 py-2.5 text-sm text-cream/65 transition-colors hover:bg-ember-500/15 hover:text-ember-300"
            >
              <LogOut className="size-4" />
              Sign out
            </button>
          </div>
        </aside>

        {/* mobile nav */}
        <nav className="fixed inset-x-0 bottom-0 z-50 flex overflow-x-auto border-t border-white/8 bg-obsidian lg:hidden">
          {visible.slice(0, 5).map(({ href, label, Icon }) => {
            const active = href === '/admin' ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex min-w-[4.5rem] flex-1 flex-col items-center gap-1 py-2.5 text-[0.6rem]',
                  active ? 'text-ember-400' : 'text-cream/50',
                )}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        <main className="min-w-0 flex-1 p-5 pb-24 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
