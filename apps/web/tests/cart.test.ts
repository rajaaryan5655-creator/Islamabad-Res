import { beforeEach, describe, expect, it } from 'vitest';
import { useCart, lineKey, type CartOption } from '@/store/cart';
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

/* ------------------------- dish customization ---------------------------- */

const portion = (choiceId: string, label: string, priceDelta: number): CartOption => ({
  groupId: 'grp-portion',
  groupName: 'Portion',
  choiceId,
  label,
  priceDelta,
});

const addon = (choiceId: string, label: string, priceDelta: number): CartOption => ({
  groupId: 'grp-addons',
  groupName: 'Add-ons',
  choiceId,
  label,
  priceDelta,
});

describe('cart lines with options', () => {
  it('keeps two configurations of the same dish as separate lines', () => {
    const { add } = useCart.getState();
    add(dish(), 1, undefined, [portion('half', 'Half kg', -400)]);
    add(dish(), 1, undefined, [portion('full', 'One kg', 0)]);

    expect(useCart.getState().lines).toHaveLength(2);
    expect(useCart.getState().count()).toBe(2);
  });

  it('merges an identical configuration into the existing line', () => {
    const { add } = useCart.getState();
    add(dish(), 1, undefined, [portion('half', 'Half kg', -400)]);
    add(dish(), 2, undefined, [portion('half', 'Half kg', -400)]);

    expect(useCart.getState().lines).toHaveLength(1);
    expect(useCart.getState().lines[0]!.quantity).toBe(3);
  });

  it('treats the same choices in a different order as one line', () => {
    const { add } = useCart.getState();
    add(dish(), 1, undefined, [portion('half', 'Half kg', -400), addon('raita', 'Raita', 90)]);
    add(dish(), 1, undefined, [addon('raita', 'Raita', 90), portion('half', 'Half kg', -400)]);

    expect(useCart.getState().lines).toHaveLength(1);
    expect(useCart.getState().lines[0]!.quantity).toBe(2);
  });

  it('adds option surcharges into the subtotal', () => {
    const { add } = useCart.getState();
    add(dish({ price: 1000 }), 2, undefined, [portion('full', 'One kg', 0), addon('naan', 'Two naan', 160)]);

    // (1000 + 0 + 160) × 2
    expect(useCart.getState().subtotal()).toBe(2320);
  });

  it('applies a negative surcharge for a smaller portion', () => {
    const { add } = useCart.getState();
    add(dish({ price: 1000 }), 1, undefined, [portion('half', 'Half kg', -400)]);
    expect(useCart.getState().subtotal()).toBe(600);
  });

  it('sends only identifiers to the checkout API, never prices', () => {
    const { add } = useCart.getState();
    add(dish(), 1, 'no coriander', [portion('half', 'Half kg', -400)]);

    const payload = useCart.getState().toOrderItems();
    expect(payload).toEqual([
      {
        menuItemId: 'dish-1',
        quantity: 1,
        notes: 'no coriander',
        options: [{ groupId: 'grp-portion', choiceId: 'half' }],
      },
    ]);
    expect(JSON.stringify(payload)).not.toContain('priceDelta');
    expect(JSON.stringify(payload)).not.toContain('450');
  });

  it('omits the options key entirely for a plain dish', () => {
    useCart.getState().add(dish(), 1);
    expect(useCart.getState().toOrderItems()[0]).toEqual({ menuItemId: 'dish-1', quantity: 1 });
  });

  it('removes and re-quantifies by line id, not dish id', () => {
    const { add } = useCart.getState();
    add(dish(), 1, undefined, [portion('half', 'Half kg', -400)]);
    add(dish(), 1, undefined, [portion('full', 'One kg', 0)]);

    const [first, second] = useCart.getState().lines;
    useCart.getState().setQuantity(second!.id, 5);
    expect(useCart.getState().lines.find((l) => l.id === second!.id)!.quantity).toBe(5);
    expect(useCart.getState().lines.find((l) => l.id === first!.id)!.quantity).toBe(1);

    useCart.getState().remove(first!.id);
    expect(useCart.getState().lines).toHaveLength(1);
    expect(useCart.getState().lines[0]!.id).toBe(second!.id);
  });
});

describe('lineKey', () => {
  it('is stable regardless of choice order', () => {
    expect(lineKey('a', [{ choiceId: 'x' }, { choiceId: 'y' }])).toBe(lineKey('a', [{ choiceId: 'y' }, { choiceId: 'x' }]));
  });

  it('falls back to the bare dish id when there are no options', () => {
    expect(lineKey('a')).toBe('a');
    expect(lineKey('a', [])).toBe('a');
  });

  it('distinguishes different option sets', () => {
    expect(lineKey('a', [{ choiceId: 'x' }])).not.toBe(lineKey('a', [{ choiceId: 'y' }]));
  });
});
