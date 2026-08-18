'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { Filter, Leaf, Search, SlidersHorizontal, X } from 'lucide-react';
import { ALLERGENS, SPICE_LEVELS } from '@islamabad/shared';
import { api, type MenuCategory, type MenuItem } from '@/lib/api';
import { DishCard } from '@/components/menu/dish-card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/primitives';
import { cn, formatPKR } from '@/lib/utils';

type SortKey = 'popular' | 'price-asc' | 'price-desc' | 'rating' | 'name';

const SORTS: { value: SortKey; label: string }[] = [
  { value: 'popular', label: 'Most popular' },
  { value: 'rating', label: 'Highest rated' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'name', label: 'A – Z' },
];

export function MenuBrowser({
  initialItems,
  categories,
  initialCategory,
}: {
  initialItems: MenuItem[];
  categories: MenuCategory[];
  initialCategory?: string;
}) {
  const [category, setCategory] = useState(initialCategory ?? 'all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('popular');
  const [vegOnly, setVegOnly] = useState(false);
  const [maxPrice, setMaxPrice] = useState(2000);
  const [spice, setSpice] = useState<string[]>([]);
  const [excluded, setExcluded] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { data, isFetching } = useQuery({
    queryKey: ['menu', category, sort],
    queryFn: () =>
      api.get<{ items: MenuItem[] }>(
        `/api/menu?pageSize=100&sort=${sort}${category !== 'all' ? `&category=${category}` : ''}`,
      ),
    initialData: category === 'all' && sort === 'popular' ? { items: initialItems } : undefined,
    staleTime: 120_000,
  });

  // Cheap filters run client-side for instant feedback; the server handles the
  // expensive category/sort work.
  const items = useMemo(() => {
    let list = data?.items ?? [];
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q) ||
          i.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }
    if (vegOnly) list = list.filter((i) => i.isVegetarian);
    if (spice.length) list = list.filter((i) => spice.includes(i.spiceLevel));
    if (excluded.length) list = list.filter((i) => !i.allergens.some((a) => excluded.includes(a)));
    list = list.filter((i) => i.price <= maxPrice);
    return list;
  }, [data, search, vegOnly, spice, excluded, maxPrice]);

  const activeFilters = (vegOnly ? 1 : 0) + spice.length + excluded.length + (maxPrice < 2000 ? 1 : 0);

  function reset() {
    setVegOnly(false);
    setSpice([]);
    setExcluded([]);
    setMaxPrice(2000);
    setSearch('');
  }

  const toggle = (list: string[], value: string, setter: (v: string[]) => void) =>
    setter(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  return (
    <div className="container-luxe py-14">
      {/* search + sort */}
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-black/35" />
          <label htmlFor="menu-search" className="sr-only">
            Search the menu
          </label>
          <input
            id="menu-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search dishes, ingredients, tags…"
            className="h-12 w-full rounded-sm border border-black/12 bg-white pl-11 pr-4 text-sm outline-none transition focus:border-saffron-400 focus:ring-2 focus:ring-saffron-400/15"
          />
        </div>

        <div className="flex gap-2">
          <label htmlFor="menu-sort" className="sr-only">
            Sort dishes
          </label>
          <select
            id="menu-sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="h-12 rounded-sm border border-black/12 bg-white px-4 text-sm outline-none focus:border-saffron-400"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>

          <button
            onClick={() => setFiltersOpen((v) => !v)}
            className={cn(
              'flex h-12 items-center gap-2 rounded-sm border px-4 text-sm transition',
              activeFilters > 0 ? 'border-ember-500 bg-ember-500 text-white' : 'border-black/12 bg-white hover:border-black/30',
            )}
            aria-expanded={filtersOpen}
          >
            <SlidersHorizontal className="size-4" />
            Filters
            {activeFilters > 0 && (
              <span className="flex size-5 items-center justify-center rounded-full bg-white text-[0.65rem] font-bold text-ember-500">
                {activeFilters}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* categories */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setCategory('all')}
          className={cn(
            'shrink-0 rounded-full px-5 py-2 text-sm font-medium transition-all',
            category === 'all' ? 'bg-obsidian text-cream' : 'bg-white text-black/65 hover:bg-black/5',
          )}
        >
          All dishes
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setCategory(c.slug)}
            className={cn(
              'shrink-0 rounded-full px-5 py-2 text-sm font-medium transition-all',
              category === c.slug ? 'bg-obsidian text-cream' : 'bg-white text-black/65 hover:bg-black/5',
            )}
          >
            {c.name}
            <span className="ml-1.5 text-xs opacity-50">{c.itemCount}</span>
          </button>
        ))}
      </div>

      {/* filter panel */}
      <AnimatePresence>
        {filtersOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mb-6 overflow-hidden"
          >
            <div className="grid gap-6 rounded-sm border border-black/10 bg-white p-6 md:grid-cols-3">
              <fieldset>
                <legend className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-black/60">
                  Dietary
                </legend>
                <label className="flex cursor-pointer items-center gap-2.5 text-sm">
                  <input
                    type="checkbox"
                    checked={vegOnly}
                    onChange={(e) => setVegOnly(e.target.checked)}
                    className="size-4 accent-emerald-600"
                  />
                  <Leaf className="size-4 text-emerald-600" />
                  Vegetarian only
                </label>

                <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-[0.15em] text-black/60">
                  Exclude allergens
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {ALLERGENS.map((a) => (
                    <button
                      key={a}
                      onClick={() => toggle(excluded, a, setExcluded)}
                      className={cn(
                        'rounded-full border px-3 py-1 text-xs capitalize transition',
                        excluded.includes(a)
                          ? 'border-ember-500 bg-ember-500 text-white'
                          : 'border-black/15 hover:border-black/40',
                      )}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-black/60">
                  Spice level
                </legend>
                <div className="flex flex-wrap gap-1.5">
                  {SPICE_LEVELS.map((s) => (
                    <button
                      key={s}
                      onClick={() => toggle(spice, s, setSpice)}
                      className={cn(
                        'rounded-full border px-3 py-1 text-xs capitalize transition',
                        spice.includes(s) ? 'border-ember-500 bg-ember-500 text-white' : 'border-black/15 hover:border-black/40',
                      )}
                    >
                      {s.toLowerCase()}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-black/60">
                  Maximum price
                </legend>
                <input
                  type="range"
                  min={100}
                  max={2000}
                  step={50}
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                  className="w-full accent-ember-500"
                  aria-label={`Maximum price ${formatPKR(maxPrice)}`}
                />
                <p className="mt-1 text-sm font-semibold text-ember-500">
                  Up to {formatPKR(maxPrice)}
                  {maxPrice >= 2000 && '+'}
                </p>

                {activeFilters > 0 && (
                  <button
                    onClick={reset}
                    className="mt-5 flex items-center gap-1.5 text-xs uppercase tracking-widest text-black/50 hover:text-ember-500"
                  >
                    <X className="size-3.5" />
                    Clear all filters
                  </button>
                )}
              </fieldset>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* results */}
      <p className="mb-5 text-sm text-black/50" aria-live="polite">
        {isFetching ? 'Loading dishes…' : `${items.length} dish${items.length === 1 ? '' : 'es'}`}
        {category !== 'all' && ` in ${categories.find((c) => c.slug === category)?.name ?? category}`}
      </p>

      {isFetching && !data ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-96" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-sm border border-dashed border-black/15 py-20 text-center">
          <Filter className="mx-auto mb-4 size-8 text-black/20" />
          <p className="font-display text-2xl">Nothing matches those filters</p>
          <p className="mt-1 text-sm text-black/50">Try widening the price range or clearing an allergen.</p>
          <Button variant="outline" className="mt-5" onClick={reset}>
            Clear filters
          </Button>
        </div>
      ) : (
        <motion.div layout className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <AnimatePresence mode="popLayout">
            {items.map((item, i) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.32, delay: Math.min(i, 8) * 0.03 }}
              >
                <DishCard item={item} priority={i < 4} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
