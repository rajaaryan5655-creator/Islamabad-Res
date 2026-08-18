import { z } from 'zod';
import { ORDER_TYPES, PAYMENT_METHODS, ORDER_STATUSES, RESERVATION_STATUSES, EVENT_TYPES, ROLES } from './types.ts';

/* ---------------------------------- auth --------------------------------- */

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^(\+92|0)?3\d{9}$/, 'Enter a valid Pakistani mobile number (e.g. 0306 4650507)');

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  email: z.email('Enter a valid email address').toLowerCase(),
  phone: phoneSchema,
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[a-z]/, 'Include a lowercase letter')
    .regex(/[A-Z]/, 'Include an uppercase letter')
    .regex(/[0-9]/, 'Include a number'),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.email('Enter a valid email address').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const oauthSchema = z.object({
  provider: z.enum(['google', 'facebook']),
  token: z.string().min(1),
  email: z.email().optional(),
  name: z.string().optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.email('Enter a valid email address').toLowerCase(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10, 'Reset link is invalid'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[a-z]/, 'Include a lowercase letter')
    .regex(/[A-Z]/, 'Include an uppercase letter')
    .regex(/[0-9]/, 'Include a number'),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(10, 'Verification link is invalid'),
});

export const pushSubscriptionSchema = z.object({
  endpoint: z.string().min(10),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
});

export const refundSchema = z.object({
  amount: z.number().int().positive().optional(),
  reason: z.string().trim().max(240).optional(),
});

export const reservationDecisionSchema = z.object({
  decision: z.enum(['APPROVE', 'REJECT']),
  tableId: z.string().optional(),
  reason: z.string().trim().max(240).optional(),
});

export const profileUpdateSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  phone: phoneSchema.optional(),
  dietaryPrefs: z.array(z.string()).max(12).optional(),
  marketingOptIn: z.boolean().optional(),
});

export const addressSchema = z.object({
  label: z.string().trim().min(2).max(32),
  line1: z.string().trim().min(5).max(160),
  line2: z.string().trim().max(160).optional().or(z.literal('')),
  city: z.string().trim().min(2).max(60),
  zoneId: z.string().trim().min(2),
  notes: z.string().trim().max(240).optional().or(z.literal('')),
  isDefault: z.boolean().optional(),
});
export type AddressInput = z.infer<typeof addressSchema>;

/* ---------------------------------- menu --------------------------------- */

export const menuQuerySchema = z.object({
  category: z.string().optional(),
  search: z.string().max(80).optional(),
  maxPrice: z.coerce.number().positive().optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  vegetarian: z.coerce.boolean().optional(),
  spice: z.string().optional(),
  excludeAllergens: z.string().optional(),
  available: z.coerce.boolean().optional(),
  sort: z.enum(['popular', 'price-asc', 'price-desc', 'rating', 'name']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});

export const menuItemSchema = z.object({
  name: z.string().trim().min(2).max(90),
  slug: z.string().trim().min(2).max(90).optional(),
  description: z.string().trim().min(10).max(400),
  price: z.number().int().positive(),
  compareAtPrice: z.number().int().positive().nullable().optional(),
  categoryId: z.string().min(1),
  image: z.string().min(1),
  calories: z.number().int().positive().nullable().optional(),
  protein: z.number().int().nonnegative().nullable().optional(),
  spiceLevel: z.enum(['MILD', 'MEDIUM', 'HOT', 'FIERY']).optional(),
  allergens: z.array(z.string()).optional(),
  isVegetarian: z.boolean().optional(),
  isAvailable: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  isBestSeller: z.boolean().optional(),
  prepMinutes: z.number().int().positive().max(180).optional(),
  serves: z.number().int().positive().max(20).optional(),
  sortOrder: z.number().int().optional(),
});

export const categorySchema = z.object({
  name: z.string().trim().min(2).max(50),
  slug: z.string().trim().min(2).max(50).optional(),
  description: z.string().trim().max(240).optional(),
  icon: z.string().max(40).optional(),
  image: z.string().max(300).optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

/* --------------------------------- orders -------------------------------- */

export const selectedOptionSchema = z.object({
  groupId: z.string().min(1),
  choiceId: z.string().min(1),
});

export const cartItemSchema = z.object({
  menuItemId: z.string().min(1),
  quantity: z.number().int().min(1).max(50),
  notes: z.string().max(240).optional(),
  options: z.array(selectedOptionSchema).max(20).optional(),
});

export const checkoutSchema = z
  .object({
    type: z.enum(ORDER_TYPES),
    items: z.array(cartItemSchema).min(1, 'Your cart is empty'),
    customerName: z.string().trim().min(2).max(80),
    customerPhone: phoneSchema,
    customerEmail: z.email().optional().or(z.literal('')),
    addressId: z.string().optional(),
    address: z.string().trim().max(300).optional(),
    zoneId: z.string().optional(),
    scheduledFor: z.string().datetime().optional(),
    paymentMethod: z.enum(PAYMENT_METHODS),
    couponCode: z.string().trim().max(32).optional().or(z.literal('')),
    redeemPoints: z.number().int().min(0).optional(),
    notes: z.string().trim().max(400).optional().or(z.literal('')),
    tableNumber: z.string().max(12).optional(),
  })
  // A saved address already carries its delivery zone, so `addressId` alone is
  // sufficient; a one-off address must be accompanied by an explicit zone.
  .refine((v) => v.type !== 'DELIVERY' || Boolean(v.addressId) || Boolean(v.address && v.zoneId), {
    message: 'Choose a saved address, or enter an address and delivery area',
    path: ['address'],
  });
export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const orderStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES),
  note: z.string().max(240).optional(),
});

/* ------------------------------ reservations ----------------------------- */

export const reservationSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.email('Enter a valid email address'),
  phone: phoneSchema,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a date'),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Pick a time slot'),
  guests: z.number().int().min(1, 'At least 1 guest').max(40, 'For 40+ guests please use private events'),
  occasion: z.string().max(40).optional(),
  seating: z.enum(['ANY', 'INDOOR', 'OUTDOOR', 'PRIVATE']).default('ANY'),
  requests: z.string().max(400).optional().or(z.literal('')),
});
export type ReservationInput = z.infer<typeof reservationSchema>;

export const reservationStatusSchema = z.object({
  status: z.enum(RESERVATION_STATUSES),
  tableId: z.string().optional(),
  note: z.string().max(240).optional(),
});

export const availabilityQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guests: z.coerce.number().int().min(1).max(40),
});

/* -------------------------------- marketing ------------------------------ */

export const newsletterSchema = z.object({
  email: z.email('Enter a valid email address').toLowerCase(),
  name: z.string().trim().max(80).optional(),
  source: z.string().max(40).optional(),
});

export const contactSchema = z.object({
  name: z.string().trim().min(2, 'Tell us your name').max(80),
  email: z.email('Enter a valid email address'),
  phone: phoneSchema.optional().or(z.literal('')),
  subject: z.string().trim().min(3, 'Add a subject').max(120),
  message: z.string().trim().min(10, 'Message must be at least 10 characters').max(2000),
});

export const couponSchema = z.object({
  code: z.string().trim().min(3).max(32).toUpperCase(),
  description: z.string().max(200),
  type: z.enum(['PERCENT', 'FIXED', 'FREE_DELIVERY']),
  value: z.number().nonnegative(),
  minOrder: z.number().int().nonnegative().default(0),
  maxDiscount: z.number().int().positive().nullable().optional(),
  usageLimit: z.number().int().positive().nullable().optional(),
  startsAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  isActive: z.boolean().default(true),
});

/* ---------------------------------- events -------------------------------- */

export const eventEnquirySchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.email(),
  phone: phoneSchema,
  type: z.enum(EVENT_TYPES),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guests: z.number().int().min(1).max(1000),
  budget: z.number().int().nonnegative().optional(),
  details: z.string().max(1500).optional().or(z.literal('')),
});

export const giftCardPurchaseSchema = z.object({
  amount: z.number().int().min(1000).max(100000),
  recipientName: z.string().trim().min(2).max(80),
  recipientEmail: z.email(),
  senderName: z.string().trim().min(2).max(80),
  message: z.string().max(300).optional().or(z.literal('')),
});

/* ---------------------------------- staff --------------------------------- */

export const staffSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.email(),
  phone: phoneSchema.optional(),
  role: z.enum(ROLES),
  position: z.string().max(60).optional(),
  password: z.string().min(8).optional(),
  isActive: z.boolean().optional(),
});

/* -------------------------------- settings -------------------------------- */

export const settingsSchema = z.object({
  acceptingOrders: z.boolean().optional(),
  acceptingReservations: z.boolean().optional(),
  autoApproveReservations: z.boolean().optional(),
  deliveryEnabled: z.boolean().optional(),
  pickupEnabled: z.boolean().optional(),
  prepTimeMinutes: z.number().int().min(5).max(180).optional(),
  announcement: z.string().max(240).optional().or(z.literal('')),
});

/* ------------------------------- ai assistant ----------------------------- */

export const chatSchema = z.object({
  message: z.string().trim().min(1).max(500),
  history: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(2000) }))
    .max(20)
    .optional(),
});

export const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(120).optional(),
  body: z.string().trim().min(10).max(1200),
  menuItemId: z.string().optional(),
});
