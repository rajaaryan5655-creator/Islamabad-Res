'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MenuItem } from '@/lib/api';

export interface CartLine {
  menuItemId: string;
  name: string;
  slug: string;
  price: number;
  image: string;
  quantity: number;
  notes?: string;
  spiceLevel?: string;
}

export type OrderType = 'DELIVERY' | 'PICKUP' | 'DINE_IN';

interface CartState {
  lines: CartLine[];
  type: OrderType;
  zoneId: string | null;
  couponCode: string | null;
  redeemPoints: number;
  isOpen: boolean;

  add: (item: MenuItem, quantity?: number, notes?: string) => void;
  remove: (menuItemId: string) => void;
  setQuantity: (menuItemId: string, quantity: number) => void;
  setNotes: (menuItemId: string, notes: string) => void;
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

      add: (item, quantity = 1, notes) =>
        set((state) => {
          const existing = state.lines.find((l) => l.menuItemId === item.id);
          if (existing) {
            return {
              lines: state.lines.map((l) =>
                l.menuItemId === item.id
                  ? { ...l, quantity: Math.min(50, l.quantity + quantity), notes: notes ?? l.notes }
                  : l,
              ),
            };
          }
          return {
            lines: [
              ...state.lines,
              {
                menuItemId: item.id,
                name: item.name,
                slug: item.slug,
                price: item.price,
                image: item.image,
                quantity,
                notes,
                spiceLevel: item.spiceLevel,
              },
            ],
          };
        }),

      remove: (menuItemId) => set((state) => ({ lines: state.lines.filter((l) => l.menuItemId !== menuItemId) })),

      setQuantity: (menuItemId, quantity) =>
        set((state) => ({
          lines:
            quantity <= 0
              ? state.lines.filter((l) => l.menuItemId !== menuItemId)
              : state.lines.map((l) => (l.menuItemId === menuItemId ? { ...l, quantity: Math.min(50, quantity) } : l)),
        })),

      setNotes: (menuItemId, notes) =>
        set((state) => ({
          lines: state.lines.map((l) => (l.menuItemId === menuItemId ? { ...l, notes } : l)),
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
      subtotal: () => get().lines.reduce((n, l) => n + l.price * l.quantity, 0),
    }),
    {
      name: 'ir-cart',
      partialize: (state) => ({
        lines: state.lines,
        type: state.type,
        zoneId: state.zoneId,
        couponCode: state.couponCode,
      }),
    },
  ),
);
