/**
 * Dish customization: option resolution, server-side pricing and validation.
 *
 * These tests exist because option pricing is the one place a tampered client
 * could change what an order costs. Every case here sends only identifiers and
 * asserts the server derived the money itself.
 */
import { describe, expect, it, beforeAll } from 'vitest';

let prisma: typeof import('../src/lib/prisma.js')['prisma'];
let buildLines: typeof import('../src/services/orders.js')['buildLines'];

let itemId: string;
let portionGroupId: string;
let halfKgId: string;
let oneKgId: string;
let addOnGroupId: string;
let raitaId: string;
let naanId: string;
let basePrice: number;

beforeAll(async () => {
  ({ prisma } = await import('../src/lib/prisma.js'));
  ({ buildLines } = await import('../src/services/orders.js'));

  const category = await prisma.category.create({
    data: { name: 'Customisable Test', slug: 'customisable-test', sortOrder: 900 },
  });

  const item = await prisma.menuItem.create({
    data: {
      name: 'Test Karahi',
      slug: 'test-karahi',
      description: 'A dish used to exercise option pricing.',
      price: 1000,
      image: '/images/dish-mutton-karahi.jpg',
      categoryId: category.id,
      optionGroups: {
        create: [
          {
            name: 'Portion',
            type: 'SINGLE',
            isRequired: true,
            minSelect: 1,
            maxSelect: 1,
            sortOrder: 0,
            choices: {
              create: [
                { label: 'Half kg', priceDelta: -400, sortOrder: 0 },
                { label: 'One kg', priceDelta: 0, isDefault: true, sortOrder: 1 },
              ],
            },
          },
          {
            name: 'Add-ons',
            type: 'MULTI',
            isRequired: false,
            minSelect: 0,
            maxSelect: 2,
            sortOrder: 1,
            choices: {
              create: [
                { label: 'Extra raita', priceDelta: 90, sortOrder: 0 },
                { label: 'Two naan', priceDelta: 160, sortOrder: 1 },
                { label: 'Sold out side', priceDelta: 50, isAvailable: false, sortOrder: 2 },
              ],
            },
          },
        ],
      },
    },
    include: { optionGroups: { include: { choices: true }, orderBy: { sortOrder: 'asc' } } },
  });

  itemId = item.id;
  basePrice = item.price;
  const portion = item.optionGroups[0]!;
  const addOns = item.optionGroups[1]!;
  portionGroupId = portion.id;
  halfKgId = portion.choices.find((c) => c.label === 'Half kg')!.id;
  oneKgId = portion.choices.find((c) => c.label === 'One kg')!.id;
  addOnGroupId = addOns.id;
  raitaId = addOns.choices.find((c) => c.label === 'Extra raita')!.id;
  naanId = addOns.choices.find((c) => c.label === 'Two naan')!.id;
});

describe('option pricing', () => {
  it('applies a negative surcharge for a smaller portion', async () => {
    const [line] = await buildLines([
      { menuItemId: itemId, quantity: 1, options: [{ groupId: portionGroupId, choiceId: halfKgId }] },
    ]);
    expect(line!.unitPrice).toBe(basePrice - 400);
    expect(line!.total).toBe(basePrice - 400);
  });

  it('sums multiple add-ons into the unit price and multiplies by quantity', async () => {
    const [line] = await buildLines([
      {
        menuItemId: itemId,
        quantity: 3,
        options: [
          { groupId: portionGroupId, choiceId: oneKgId },
          { groupId: addOnGroupId, choiceId: raitaId },
          { groupId: addOnGroupId, choiceId: naanId },
        ],
      },
    ]);
    expect(line!.unitPrice).toBe(basePrice + 90 + 160);
    expect(line!.total).toBe((basePrice + 90 + 160) * 3);
    expect(line!.options).toHaveLength(3);
  });

  it('records the option snapshot so a later price change cannot rewrite history', async () => {
    const [line] = await buildLines([
      { menuItemId: itemId, quantity: 1, options: [{ groupId: portionGroupId, choiceId: halfKgId }] },
    ]);
    expect(line!.options[0]).toMatchObject({
      groupName: 'Portion',
      label: 'Half kg',
      priceDelta: -400,
    });
  });
});

describe('option validation', () => {
  it('rejects a missing required group', async () => {
    await expect(buildLines([{ menuItemId: itemId, quantity: 1 }])).rejects.toThrow(/choose a portion/i);
  });

  it('rejects more choices than the group allows', async () => {
    await expect(
      buildLines([
        {
          menuItemId: itemId,
          quantity: 1,
          options: [
            { groupId: portionGroupId, choiceId: oneKgId },
            { groupId: addOnGroupId, choiceId: raitaId },
            { groupId: addOnGroupId, choiceId: naanId },
            { groupId: addOnGroupId, choiceId: raitaId },
          ],
        },
      ]),
    ).rejects.toThrow(/at most 2/i);
  });

  it('rejects a choice that belongs to another group', async () => {
    await expect(
      buildLines([
        {
          menuItemId: itemId,
          quantity: 1,
          options: [{ groupId: portionGroupId, choiceId: raitaId }],
        },
      ]),
    ).rejects.toThrow(/not available/i);
  });

  it('rejects a sold-out choice', async () => {
    const soldOut = await prisma.menuOptionChoice.findFirstOrThrow({ where: { label: 'Sold out side' } });
    await expect(
      buildLines([
        {
          menuItemId: itemId,
          quantity: 1,
          options: [
            { groupId: portionGroupId, choiceId: oneKgId },
            { groupId: addOnGroupId, choiceId: soldOut.id },
          ],
        },
      ]),
    ).rejects.toThrow(/unavailable/i);
  });

  it('ignores a price sent by the client and uses the database value', async () => {
    // The input type has no price field at all; this asserts the contract by
    // passing one anyway and confirming the server value wins.
    const [line] = await buildLines([
      {
        menuItemId: itemId,
        quantity: 1,
        options: [{ groupId: portionGroupId, choiceId: halfKgId }],
        // @ts-expect-error — deliberately sending a field the API must ignore
        unitPrice: 1,
      },
    ]);
    expect(line!.unitPrice).toBe(basePrice - 400);
  });
});
