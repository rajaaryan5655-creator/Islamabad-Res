'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MenuItem } from '@/lib/api';

/** A single chosen option, denormalised so the cart can render without a fetch. */
export interface CartOption {
  groupId: string;
  groupName: string;
  choiceId: string;
  label: string;
  priceDelta: number;
}

export interface CartLine {
  /** Stable identity for this configuration — see `lineKey`. */
  id: string;
  menuItemId: string;
  name: string;
  slug: string;
  /** Base price at the time of adding; the server re-prices at checkout. */
  price: number;
  image: string;
  quantity: number;
  notes?: string;
  spiceLevel?: string;
  options: CartOption[];
}

export type OrderType = 'DELIVERY' | 'PICKUP' | 'DINE_IN';

/**
 * Two lines are the same line only if they are the same dish with the same
 * options. "Karahi, half kg" and "Karahi, one kg with naan" must stay apart in
 * the basket, so the key folds the sorted choice ids into the id.
 */
export function lineKey(menuItemId: string, options: { choiceId: string }[] = []): string {
  const signature = options
    .map((o) => o.choiceId)
    .sort()
    .join('+');
  return signature ? `${menuItemId}::${signature}` : menuItemId;
}

/** Unit price including option surcharges. */
export function lineUnitPrice(line: Pick<CartLine, 'price' | 'options'>): number {
  return line.price + line.options.reduce((sum, o) => sum + o.priceDelta, 0);
}

export function lineTotal(line: CartLine): number {
  return lineUnitPrice(line) * line.quantity;
}

interface CartState {
  lines: CartLine[];
  type: OrderType;
  zoneId: string | null;
  couponCode: string | null;
  redeemPoints: number;
  isOpen: boolean;

  add: (item: MenuItem, quantity?: number, notes?: string, options?: CartOption[]) => void;
  remove: (lineId: string) => void;
  setQuantity: (lineId: string, quantity: number) => void;
  setNotes: (lineId: string, notes: string) => void;
  setType: (type: OrderType) => void;
  setZone: (zoneId: string | null) => void;
  setCoupon: (code: string | null) => void;
  setRedeemPoints: (points: number) => void;
  clear: () => void;
  open: () => void;
  close: () => void;
  toggle: () => void;

  count: () => number;
  subtotal: () => number;
  /** Payload shape the checkout API expects — ids only, never prices. */
  toOrderItems: () => { menuItemId: string; quantity: number; notes?: string; options?: { groupId: string; choiceId: string }[] }[];
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      type: 'DELIVERY',
      zoneId: null,
      couponCode: null,
      redeemPoints: 0,
      isOpen: false,

      add: (item, quantity = 1, notes, options = []) =>
        set((state) => {
          const id = lineKey(item.id, options);
          const existing = state.lines.find((l) => l.id === id);

          if (existing) {
            return {
              lines: state.lines.map((l) =>
                l.id === id
                  ? { ...l, quantity: Math.min(50, l.quantity + quantity), notes: notes ?? l.notes }
                  : l,
              ),
            };
          }

          return {
            lines: [
              ...state.lines,
              {
                id,
                menuItemId: item.id,
                name: item.name,
                slug: item.slug,
                // Always the current menu price — never a value carried over
                // from an old order, which would silently absorb a price rise.
                price: item.price,
                image: item.image,
                quantity: Math.min(50, quantity),
                notes,
                spiceLevel: item.spiceLevel,
                options,
              },
            ],
          };
        }),

      remove: (lineId) => set((state) => ({ lines: state.lines.filter((l) => l.id !== lineId) })),

      setQuantity: (lineId, quantity) =>
        set((state) => ({
          lines:
            quantity <= 0
              ? state.lines.filter((l) => l.id !== lineId)
              : state.lines.map((l) => (l.id === lineId ? { ...l, quantity: Math.min(50, quantity) } : l)),
        })),

      setNotes: (lineId, notes) =>
        set((state) => ({
          lines: state.lines.map((l) => (l.id === lineId ? { ...l, notes } : l)),
        })),

      setType: (type) => set({ type }),
      setZone: (zoneId) => set({ zoneId }),
      setCoupon: (couponCode) => set({ couponCode }),
      setRedeemPoints: (redeemPoints) => set({ redeemPoints: Math.max(0, redeemPoints) }),
      clear: () => set({ lines: [], couponCode: null, redeemPoints: 0 }),

      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      toggle: () => set((s) => ({ isOpen: !s.isOpen })),

      count: () => get().lines.reduce((n, l) => n + l.quantity, 0),
      subtotal: () => get().lines.reduce((n, l) => n + lineTotal(l), 0),

      toOrderItems: () =>
        get().lines.map((l) => ({
          menuItemId: l.menuItemId,
          quantity: l.quantity,
          ...(l.notes ? { notes: l.notes } : {}),
          ...(l.options.length
            ? { options: l.options.map((o) => ({ groupId: o.groupId, choiceId: o.choiceId })) }
            : {}),
        })),
    }),
    {
      name: 'ir-cart',
      version: 2,
      /**
       * v1 lines had no `id` or `options`. Rather than drop a customer's
       * basket on deploy, backfill the new shape.
       */
      migrate: (persisted, version) => {
        const state = persisted as { lines?: Partial<CartLine>[] };
        if (version < 2 && Array.isArray(state.lines)) {
          state.lines = state.lines.map((l) => ({
            ...l,
            options: l.options ?? [],
            id: l.id ?? lineKey(l.menuItemId as string, []),
          }));
        }
        return state as CartState;
      },
      partialize: (state) => ({
        lines: state.lines,
        type: state.type,
        zoneId: state.zoneId,
        couponCode: state.couponCode,
      }),
    },
  ),
);
