/** Domain enums & types shared across web + API. */

export const ROLES = ['SUPER_ADMIN', 'MANAGER', 'STAFF', 'CUSTOMER'] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_RANK: Record<Role, number> = {
  SUPER_ADMIN: 40,
  MANAGER: 30,
  STAFF: 20,
  CUSTOMER: 10,
};

export const ORDER_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'READY',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_FLOW: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY', 'CANCELLED'],
  READY: ['OUT_FOR_DELIVERY', 'DELIVERED'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

export const ORDER_STATUS_META: Record<
  OrderStatus,
  { label: string; description: string; tone: string; step: number }
> = {
  PENDING: { label: 'Pending', description: 'We have received your order and are confirming it.', tone: 'amber', step: 0 },
  CONFIRMED: { label: 'Confirmed', description: 'Order confirmed — sent to the kitchen.', tone: 'blue', step: 1 },
  PREPARING: { label: 'Preparing', description: 'Your food is being cooked to order.', tone: 'orange', step: 2 },
  READY: { label: 'Ready', description: 'Packed and ready for pickup / dispatch.', tone: 'violet', step: 3 },
  OUT_FOR_DELIVERY: { label: 'Out for delivery', description: 'Your rider is on the way.', tone: 'cyan', step: 4 },
  DELIVERED: { label: 'Delivered', description: 'Delivered. Bon appétit!', tone: 'green', step: 5 },
  CANCELLED: { label: 'Cancelled', description: 'This order was cancelled.', tone: 'red', step: -1 },
};

export const ORDER_TYPES = ['DELIVERY', 'PICKUP', 'DINE_IN'] as const;
export type OrderType = (typeof ORDER_TYPES)[number];

export const PAYMENT_METHODS = ['CARD_STRIPE', 'PAYPAL', 'JAZZCASH', 'EASYPAISA', 'COD'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_META: Record<PaymentMethod, { label: string; description: string; provider: string }> = {
  CARD_STRIPE: { label: 'Credit / Debit Card', description: 'Visa, Mastercard, UnionPay — secured by Stripe', provider: 'stripe' },
  PAYPAL: { label: 'PayPal', description: 'Pay with your PayPal balance or linked card', provider: 'paypal' },
  JAZZCASH: { label: 'JazzCash', description: 'Pakistan mobile wallet', provider: 'jazzcash' },
  EASYPAISA: { label: 'Easypaisa', description: 'Pakistan mobile wallet', provider: 'easypaisa' },
  COD: { label: 'Cash on Delivery', description: 'Pay the rider in cash', provider: 'manual' },
};

export const PAYMENT_STATUSES = ['UNPAID', 'AUTHORIZED', 'PAID', 'REFUNDED', 'FAILED'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const RESERVATION_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'SEATED',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
  'WAITLIST',
] as const;
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

export const ALLERGENS = ['gluten', 'dairy', 'nuts', 'egg', 'soy', 'mustard', 'sesame', 'fish'] as const;
export type Allergen = (typeof ALLERGENS)[number];

export const SPICE_LEVELS = ['MILD', 'MEDIUM', 'HOT', 'FIERY'] as const;
export type SpiceLevel = (typeof SPICE_LEVELS)[number];

export const EVENT_TYPES = ['PRIVATE_DINING', 'CATERING', 'BIRTHDAY', 'CORPORATE', 'WEDDING'] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export interface Money {
  amount: number;
  currency: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiError {
  error: string;
  message: string;
  details?: unknown;
}
