'use client';

import Image from 'next/image';
import Link from 'next/link';
import { toast } from 'sonner';
import { Flame, Leaf, Plus, Star } from 'lucide-react';
import type { MenuItem } from '@/lib/api';
import { useCart } from '@/store/cart';
import { cn, formatPKR } from '@/lib/utils';
import { Badge } from '@/components/ui/primitives';

const SPICE_DOTS: Record<string, number> = { MILD: 0, MEDIUM: 1, HOT: 2, FIERY: 3 };

export function DishCard({ item, priority = false }: { item: MenuItem; priority?: boolean }) {
  const add = useCart((s) => s.add);
  const openCart = useCart((s) => s.open);

  function handleAdd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    add(item);
    toast.success(`${item.name} added`, {
      description: formatPKR(item.price),
      action: { label: 'View cart', onClick: openCart },
    });
  }

  const spice = SPICE_DOTS[item.spiceLevel] ?? 0;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-sm bg-white shadow-sm transition-all duration-500 hover:shadow-2xl hover:shadow-black/12">
      <Link href={`/menu/${item.slug}`} className="relative block aspect-[4/3] overflow-hidden bg-black/5">
        <Image
          src={item.image}
          alt={item.name}
          fill
          priority={priority}
          loading={priority ? undefined : 'lazy'}
          sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-108"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

        <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
          {item.isBestSeller && <Badge variant="ember">Best Seller</Badge>}
          {item.compareAtPrice && (
            <Badge variant="gold">Save {formatPKR(item.compareAtPrice - item.price)}</Badge>
          )}
          {!item.isAvailable && <Badge variant="default">Sold out</Badge>}
        </div>

        {item.isVegetarian && (
          <span
            className="absolute right-3 top-3 flex size-7 items-center justify-center rounded-full bg-emerald-600 text-white"
            title="Vegetarian"
          >
            <Leaf className="size-3.5" />
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <div className="mb-1.5 flex items-start justify-between gap-3">
          <h3 className="font-display text-xl leading-tight">
            <Link href={`/menu/${item.slug}`} className="transition-colors hover:text-ember-500">
              {item.name}
            </Link>
          </h3>
          <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-black/60">
            <Star className="size-3.5 fill-saffron-400 text-saffron-400" />
            {item.rating.toFixed(1)}
          </span>
        </div>

        <p className="line-clamp-2 text-[0.84rem] leading-relaxed text-black/55">{item.description}</p>

        <div className="mb-3 mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.7rem] text-black/45">
          {item.calories && <span>{item.calories} cal</span>}
          {item.serves > 1 && <span>Serves {item.serves}</span>}
          <span>{item.prepMinutes} min</span>
          {spice > 0 && (
            <span className="flex items-center gap-0.5" title={`Spice level: ${item.spiceLevel.toLowerCase()}`}>
              {Array.from({ length: spice }).map((_, i) => (
                <Flame key={i} className="size-3 fill-ember-500 text-ember-500" />
              ))}
            </span>
          )}
        </div>

        {item.allergens.length > 0 && (
          <p className="mb-3 text-[0.68rem] uppercase tracking-wider text-black/35">
            Contains: {item.allergens.join(', ')}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-black/8 pt-3">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-2xl font-semibold text-ember-500">{formatPKR(item.price)}</span>
            {item.compareAtPrice && (
              <span className="text-sm text-black/35 line-through">{formatPKR(item.compareAtPrice)}</span>
            )}
          </div>
          <button
            onClick={handleAdd}
            disabled={!item.isAvailable}
            aria-label={`Add ${item.name} to your order`}
            className={cn(
              'flex size-10 items-center justify-center rounded-sm transition-all duration-300',
              item.isAvailable
                ? 'bg-obsidian text-cream hover:bg-ember-500 hover:scale-105 active:scale-95'
                : 'cursor-not-allowed bg-black/8 text-black/25',
            )}
          >
            <Plus className="size-5" />
          </button>
        </div>
      </div>
    </article>
  );
}
