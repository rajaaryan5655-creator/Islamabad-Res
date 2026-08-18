'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { api, type MenuCategory, type MenuItem } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge, Input, Select, Skeleton, Textarea } from '@/components/ui/primitives';
import { cn, formatPKR } from '@/lib/utils';

const EMPTY = {
  name: '',
  description: '',
  price: 500,
  categoryId: '',
  image: '/images/dish-chicken-biryani.jpg',
  calories: 0,
  spiceLevel: 'MEDIUM',
  isVegetarian: false,
  isFeatured: false,
  isBestSeller: false,
  prepMinutes: 20,
  serves: 1,
};

export default function AdminMenuPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-menu'],
    queryFn: () => api.get<{ items: MenuItem[] }>('/api/menu?pageSize=200&available=false'),
  });

  const { data: cats } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<{ categories: MenuCategory[] }>('/api/menu/categories'),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-menu'] });
    void queryClient.invalidateQueries({ queryKey: ['menu'] });
  };

  const toggleAvailability = useMutation({
    mutationFn: ({ id, isAvailable }: { id: string; isAvailable: boolean }) =>
      api.patch(`/api/menu/${id}/availability`, { isAvailable }),
    onSuccess: () => {
      toast.success('Availability updated');
      invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const save = useMutation({
    mutationFn: (payload: typeof EMPTY & { id?: string }) =>
      payload.id ? api.patch(`/api/menu/${payload.id}`, payload) : api.post('/api/menu', payload),
    onSuccess: () => {
      toast.success(editing ? 'Dish updated' : 'Dish added');
      setEditing(null);
      setCreating(false);
      setForm(EMPTY);
      invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/menu/${id}`),
    onSuccess: () => {
      toast.success('Dish removed');
      invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  function openEdit(item: MenuItem) {
    setEditing(item);
    setCreating(false);
    setForm({
      name: item.name,
      description: item.description,
      price: item.price,
      categoryId: item.categoryId,
      image: item.image,
      calories: item.calories ?? 0,
      spiceLevel: item.spiceLevel,
      isVegetarian: item.isVegetarian,
      isFeatured: item.isFeatured,
      isBestSeller: item.isBestSeller,
      prepMinutes: item.prepMinutes,
      serves: item.serves,
    });
  }

  const items = (data?.items ?? []).filter((i) => {
    if (category !== 'all' && i.categorySlug !== category) return false;
    const q = search.trim().toLowerCase();
    return !q || i.name.toLowerCase().includes(q);
  });

  const showForm = creating || editing;

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl">Menu management</h1>
          <p className="mt-1 text-sm text-cream/50">{items.length} dishes</p>
        </div>
        <Button
          variant="gold"
          onClick={() => {
            setCreating(true);
            setEditing(null);
            setForm({ ...EMPTY, categoryId: cats?.categories[0]?.id ?? '' });
          }}
        >
          <Plus />
          Add dish
        </Button>
      </header>

      {showForm && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate({ ...form, ...(editing ? { id: editing.id } : {}) });
          }}
          className="mb-6 rounded-sm border border-saffron-400/30 bg-obsidian p-6"
        >
          <h2 className="mb-4 font-display text-2xl">{editing ? `Edit ${editing.name}` : 'New dish'}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="text-cream" />
            <Select label="Category" required value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
              <option value="">Select…</option>
              {cats?.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <Input label="Price (Rs.)" required type="number" min={1} value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
            <Input label="Calories" type="number" min={0} value={form.calories} onChange={(e) => setForm({ ...form, calories: Number(e.target.value) })} />
            <Input label="Prep minutes" type="number" min={1} value={form.prepMinutes} onChange={(e) => setForm({ ...form, prepMinutes: Number(e.target.value) })} />
            <Input label="Serves" type="number" min={1} value={form.serves} onChange={(e) => setForm({ ...form, serves: Number(e.target.value) })} />
            <Select label="Spice level" value={form.spiceLevel} onChange={(e) => setForm({ ...form, spiceLevel: e.target.value })}>
              {['MILD', 'MEDIUM', 'HOT', 'FIERY'].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
            <Input label="Image path" value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} />
            <Textarea label="Description" required className="sm:col-span-2" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>

          <div className="mt-4 flex flex-wrap gap-5 text-sm">
            {([
              ['isVegetarian', 'Vegetarian'],
              ['isFeatured', 'Featured'],
              ['isBestSeller', 'Best seller'],
            ] as const).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
                  className="size-4 accent-ember-500"
                />
                {label}
              </label>
            ))}
          </div>

          <div className="mt-5 flex gap-2">
            <Button type="submit" variant="gold" loading={save.isPending}>
              {editing ? 'Save changes' : 'Create dish'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditing(null);
                setCreating(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* filters */}
      <div className="mb-5 flex flex-wrap gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-cream/35" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search dishes…"
            aria-label="Search dishes"
            className="h-11 w-full rounded-sm border border-white/10 bg-obsidian pl-10 pr-4 text-sm text-cream outline-none placeholder:text-cream/30 focus:border-saffron-400"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label="Filter by category"
          className="h-11 rounded-sm border border-white/10 bg-obsidian px-4 text-sm text-cream outline-none focus:border-saffron-400"
        >
          <option value="all">All categories</option>
          {cats?.categories.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <Skeleton className="h-96" />
      ) : (
        <div className="overflow-x-auto rounded-sm border border-white/8">
          <table className="w-full min-w-[50rem] text-sm">
            <thead className="bg-obsidian text-left text-[0.65rem] uppercase tracking-widest text-cream/45">
              <tr>
                <th className="px-4 py-3 font-medium">Dish</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Sold</th>
                <th className="px-4 py-3 font-medium">Available</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/6 bg-charcoal-2">
              {items.map((item) => (
                <tr key={item.id} className={cn('transition-colors hover:bg-white/3', !item.isAvailable && 'opacity-50')}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative size-10 shrink-0 overflow-hidden rounded-sm">
                        <Image src={item.image} alt="" fill sizes="40px" className="object-cover" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{item.name}</p>
                        <div className="flex gap-1">
                          {item.isBestSeller && <Badge variant="ember">Best</Badge>}
                          {item.isFeatured && <Badge variant="gold">Featured</Badge>}
                          {item.isVegetarian && <Badge variant="success">Veg</Badge>}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-cream/60">{item.category}</td>
                  <td className="px-4 py-3 tabular-nums">{formatPKR(item.price)}</td>
                  <td className="px-4 py-3 tabular-nums text-cream/60">{item.orderCount}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleAvailability.mutate({ id: item.id, isAvailable: !item.isAvailable })}
                      role="switch"
                      aria-checked={item.isAvailable}
                      aria-label={`Toggle availability for ${item.name}`}
                      className={cn(
                        'relative h-6 w-11 rounded-full transition-colors',
                        item.isAvailable ? 'bg-emerald-600' : 'bg-white/15',
                      )}
                    >
                      <span
                        className={cn(
                          'absolute top-0.5 size-5 rounded-full bg-white transition-transform',
                          item.isAvailable ? 'translate-x-5.5' : 'translate-x-0.5',
                        )}
                      />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(item)} aria-label={`Edit ${item.name}`} className="rounded-sm p-2 text-cream/50 transition-colors hover:bg-white/8 hover:text-saffron-400">
                        <Pencil className="size-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Remove ${item.name} from the menu?`)) remove.mutate(item.id);
                        }}
                        aria-label={`Delete ${item.name}`}
                        className="rounded-sm p-2 text-cream/50 transition-colors hover:bg-ember-500/15 hover:text-ember-400"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
