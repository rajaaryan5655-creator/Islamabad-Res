import { beforeEach, describe, expect, it } from 'vitest';
import { useCart } from '@/store/cart';
import type { MenuItem } from '@/lib/api';

const dish = (over: Partial<MenuItem> = {}): MenuItem => ({
  id: 'dish-1',
  name: 'Chicken Biryani',
  slug: 'chicken-biryani',
  description: 'Test',
  price: 450,
  compareAtPrice: null,
  categoryId: 'cat-1',
  category: 'Biryani',
  categorySlug: 'biryani',
  image: '/images/dish-chicken-biryani.jpg',
  gallery: [],
  calories: 720,
  protein: 38,
  spiceLevel: 'MEDIUM',
  allergens: ['dairy'],
  tags: [],
  isVegetarian: false,
  isAvailable: true,
  isFeatured: false,
  isBestSeller: true,
  prepMinutes: 20,
  serves: 1,
  rating: 4.7,
  ratingCount: 100,
  orderCount: 500,
  ...over,
});

beforeEach(() => {
  useCart.setState({ lines: [], type: 'DELIVERY', zoneId: null, couponCode: null, redeemPoints: 0, isOpen: false });
});

describe('cart store', () => {
  it('starts empty', () => {
    expect(useCart.getState().lines).toHaveLength(0);
    expect(useCart.getState().count()).toBe(0);
    expect(useCart.getState().subtotal()).toBe(0);
  });

  it('adds an item', () => {
    useCart.getState().add(dish());
    expect(useCart.getState().lines).toHaveLength(1);
    expect(useCart.getState().count()).toBe(1);
    expect(useCart.getState().subtotal()).toBe(450);
  });

  it('merges a repeated item rather than duplicating the line', () => {
    useCart.getState().add(dish());
    useCart.getState().add(dish(), 2);
    expect(useCart.getState().lines).toHaveLength(1);
    expect(useCart.getState().count()).toBe(3);
    expect(useCart.getState().subtotal()).toBe(1350);
  });

  it('keeps distinct dishes on separate lines', () => {
    useCart.getState().add(dish());
    useCart.getState().add(dish({ id: 'dish-2', name: 'Mutton Karahi', price: 1750 }));
    expect(useCart.getState().lines).toHaveLength(2);
    expect(useCart.getState().subtotal()).toBe(2200);
  });

  it('updates a quantity', () => {
    useCart.getState().add(dish());
    useCart.getState().setQuantity('dish-1', 5);
    expect(useCart.getState().count()).toBe(5);
  });

  it('removes the line when the quantity drops to zero', () => {
    useCart.getState().add(dish());
    useCart.getState().setQuantity('dish-1', 0);
    expect(useCart.getState().lines).toHaveLength(0);
  });

  it('caps a line at 50 units', () => {
    useCart.getState().add(dish());
    useCart.getState().setQuantity('dish-1', 999);
    expect(useCart.getState().lines[0].quantity).toBe(50);
  });

  it('removes an item explicitly', () => {
    useCart.getState().add(dish());
    useCart.getState().remove('dish-1');
    expect(useCart.getState().lines).toHaveLength(0);
  });

  it('stores per-item kitchen notes', () => {
    useCart.getState().add(dish(), 1, 'No coriander');
    expect(useCart.getState().lines[0].notes).toBe('No coriander');
    useCart.getState().setNotes('dish-1', 'Extra raita');
    expect(useCart.getState().lines[0].notes).toBe('Extra raita');
  });

  it('tracks order type, zone and coupon', () => {
    useCart.getState().setType('PICKUP');
    useCart.getState().setZone('zone-f');
    useCart.getState().setCoupon('WELCOME15');
    expect(useCart.getState().type).toBe('PICKUP');
    expect(useCart.getState().zoneId).toBe('zone-f');
    expect(useCart.getState().couponCode).toBe('WELCOME15');
  });

  it('never allows negative point redemption', () => {
    useCart.getState().setRedeemPoints(-50);
    expect(useCart.getState().redeemPoints).toBe(0);
  });

  it('clears the basket and its coupon', () => {
    useCart.getState().add(dish());
    useCart.getState().setCoupon('X');
    useCart.getState().clear();
    expect(useCart.getState().lines).toHaveLength(0);
    expect(useCart.getState().couponCode).toBeNull();
  });

  it('opens, closes and toggles the drawer', () => {
    useCart.getState().open();
    expect(useCart.getState().isOpen).toBe(true);
    useCart.getState().close();
    expect(useCart.getState().isOpen).toBe(false);
    useCart.getState().toggle();
    expect(useCart.getState().isOpen).toBe(true);
  });
});
