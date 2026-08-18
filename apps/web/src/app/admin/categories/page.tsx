'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ChevronDown, ChevronUp, LayoutGrid, Pencil, Plus, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge, Input, Skeleton, Textarea } from '@/components/ui/primitives';
import { cn } from '@/lib/utils';

interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  image: string | null;
  sortOrder: number;
  isActive: boolean;
  _count: { items: number };
}

type Draft = { name: string; description: string; icon: string; isActive: boolean };

const EMPTY: Draft = { name: '', description: '', icon: '', isActive: true };

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY);

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => api.get<{ categories: AdminCategory[] }>('/api/admin/categories'),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
    void queryClient.invalidateQueries({ queryKey: ['menu'] });
  };

  const create = useMutation({
    mutationFn: () => api.post('/api/admin/categories', draft),
    onSuccess: () => {
      toast.success(`${draft.name} created`);
      setCreating(false);
      setDraft(EMPTY);
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Draft> }) =>
      api.patch(`/api/admin/categories/${id}`, patch),
    onSuccess: () => {
      setEditing(null);
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/admin/categories/${id}`),
    onSuccess: () => {
      toast.success('Category deleted');
      invalidate();
    },
    // The API refuses to delete a category that still holds dishes; surface
    // that reason rather than a generic failure.
    onError: (err: Error) => toast.error(err.message),
  });

  const reorder = useMutation({
    mutationFn: (order: string[]) => api.post('/api/admin/categories/reorder', { order }),
    onSuccess: invalidate,
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) return <Skeleton className="h-96" />;
  if (error) {
    return (
      <div className="rounded-sm border border-ember-500/25 bg-ember-500/5 p-6">
        <p className="font-medium">Could not load categories.</p>
        <p className="mt-1 text-sm text-black/55">{(error as Error).message}</p>
      </div>
    );
  }

  const categories = data?.categories ?? [];

  function move(index: number, direction: -1 | 1) {
    const next = [...categories];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    reorder.mutate(next.map((c) => c.id));
  }

  function startEdit(category: AdminCategory) {
    setEditing(category.id);
    setCreating(false);
    setDraft({
      name: category.name,
      description: category.description ?? '',
      icon: category.icon ?? '',
      isActive: category.isActive,
    });
  }

  return (
    <div>
      <header className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl">Categories</h1>
          <p className="mt-1 text-black/55">
            {categories.length} sections · order here controls the order on the menu page
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => {
            setCreating((c) => !c);
            setEditing(null);
            setDraft(EMPTY);
          }}
        >
          <Plus />
          New category
        </Button>
      </header>

      {creating && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
          className="mb-6 space-y-4 rounded-sm border border-ember-500/30 bg-ember-500/3 p-6"
        >
          <h2 className="font-display text-2xl">New category</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Name"
              required
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="e.g. Seafood"
              autoFocus
            />
            <Input
              label="Icon key"
              value={draft.icon}
              onChange={(e) => setDraft({ ...draft, icon: e.target.value })}
              placeholder="e.g. fish"
              hint="Optional short key used by the menu UI"
            />
          </div>
          <Textarea
            label="Description"
            rows={2}
            maxLength={240}
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            placeholder="One line shown under the section heading"
          />
          <div className="flex gap-3">
            <Button type="submit" variant="primary" loading={create.isPending} disabled={draft.name.trim().length < 2}>
              Create
            </Button>
            <Button type="button" variant="ghost" onClick={() => setCreating(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      <ul className="space-y-3">
        {categories.map((category, index) => (
          <li
            key={category.id}
            className={cn(
              'rounded-sm border bg-white',
              category.isActive ? 'border-black/12' : 'border-black/8 bg-black/2',
            )}
          >
            {editing === category.id ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  update.mutate({ id: category.id, patch: draft });
                }}
                className="space-y-4 p-6"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Name"
                    required
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  />
                  <Input
                    label="Icon key"
                    value={draft.icon}
                    onChange={(e) => setDraft({ ...draft, icon: e.target.value })}
                  />
                </div>
                <Textarea
                  label="Description"
                  rows={2}
                  maxLength={240}
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                />
                <div className="flex gap-3">
                  <Button type="submit" variant="primary" size="sm" loading={update.isPending}>
                    Save
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(null)}>
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <div className="flex flex-wrap items-center gap-4 p-5">
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => move(index, -1)}
                    disabled={index === 0 || reorder.isPending}
                    aria-label={`Move ${category.name} up`}
                    className="rounded-sm p-1 text-black/35 transition-colors hover:bg-black/5 hover:text-obsidian disabled:opacity-25"
                  >
                    <ChevronUp className="size-4" />
                  </button>
                  <button
                    onClick={() => move(index, 1)}
                    disabled={index === categories.length - 1 || reorder.isPending}
                    aria-label={`Move ${category.name} down`}
                    className="rounded-sm p-1 text-black/35 transition-colors hover:bg-black/5 hover:text-obsidian disabled:opacity-25"
                  >
                    <ChevronDown className="size-4" />
                  </button>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 font-display text-xl">
                    {category.name}
                    {!category.isActive && <Badge variant="muted">Hidden</Badge>}
                  </p>
                  <p className="mt-0.5 truncate text-sm text-black/50">
                    {category.description || <span className="italic">No description</span>}
                  </p>
                  <p className="mt-1 text-xs text-black/40">
                    /{category.slug} · {category._count.items} dish{category._count.items === 1 ? '' : 'es'}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => update.mutate({ id: category.id, patch: { isActive: !category.isActive } })}
                  >
                    {category.isActive ? 'Hide' : 'Show'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => startEdit(category)} aria-label={`Edit ${category.name}`}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Delete ${category.name}`}
                    onClick={() => {
                      if (window.confirm(`Delete “${category.name}”? This cannot be undone.`)) {
                        remove.mutate(category.id);
                      }
                    }}
                  >
                    <Trash2 className="size-4 text-ember-500" />
                  </Button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>

      {categories.length === 0 && (
        <div className="rounded-sm border border-dashed border-black/15 py-16 text-center">
          <LayoutGrid className="mx-auto mb-3 size-8 text-black/20" />
          <p className="font-display text-2xl">No categories yet</p>
          <p className="mt-2 text-sm text-black/55">Create one to start building the menu.</p>
        </div>
      )}
    </div>
  );
}
