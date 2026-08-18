/**
 * Typed API client.
 *
 * Always uses same-origin relative URLs in the browser so the Next.js rewrite
 * proxies to the API server — never a hard-coded host, which would break in
 * preview and production. On the server we call the API origin directly.
 */

const SERVER_ORIGIN = process.env.API_ORIGIN ?? 'http://127.0.0.1:4000';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: { path: string; message: string }[],
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** Field-level errors keyed by form field name. */
  get fieldErrors(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const d of this.details ?? []) out[d.path] = d.message;
    return out;
  }
}

function resolveUrl(path: string): string {
  if (typeof window === 'undefined') return `${SERVER_ORIGIN}${path}`;
  return path;
}

let accessToken: string | null = null;
export function setAccessToken(token: string | null) {
  accessToken = token;
}
export function getAccessToken() {
  return accessToken;
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[2]) : null;
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /** Next.js fetch cache options for server components. */
  revalidate?: number | false;
  tags?: string[];
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, revalidate, tags, headers, ...rest } = options;

  const finalHeaders: Record<string, string> = {
    Accept: 'application/json',
    ...(body ? { 'Content-Type': 'application/json' } : {}),
    ...(headers as Record<string, string>),
  };

  if (accessToken) finalHeaders.Authorization = `Bearer ${accessToken}`;
  const csrf = readCookie('csrf_token');
  if (csrf && rest.method && rest.method !== 'GET') finalHeaders['X-CSRF-Token'] = csrf;

  const next =
    revalidate !== undefined || tags
      ? { next: { ...(revalidate !== undefined ? { revalidate: revalidate === false ? 0 : revalidate } : {}), ...(tags ? { tags } : {}) } }
      : {};

  const response = await fetch(resolveUrl(path), {
    ...rest,
    ...next,
    headers: finalHeaders,
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload?.error ?? 'REQUEST_FAILED',
      payload?.message ?? `Request failed with status ${response.status}`,
      payload?.details,
    );
  }

  return payload as T;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => apiFetch<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiFetch<T>(path, { ...options, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiFetch<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T>(path: string, options?: RequestOptions) => apiFetch<T>(path, { ...options, method: 'DELETE' }),
};

/* ------------------------------- API types -------------------------------- */

export interface MenuOptionChoice {
  id: string;
  label: string;
  priceDelta: number;
  isDefault: boolean;
}

/** Dish customization: portion sizes, spice levels, add-ons. */
export interface MenuOptionGroup {
  id: string;
  name: string;
  type: 'SINGLE' | 'MULTI';
  isRequired: boolean;
  minSelect: number;
  maxSelect: number;
  choices: MenuOptionChoice[];
}

export interface MenuItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  compareAtPrice: number | null;
  categoryId: string;
  category: string | null;
  categorySlug: string | null;
  image: string;
  gallery: string[];
  calories: number | null;
  protein: number | null;
  spiceLevel: 'MILD' | 'MEDIUM' | 'HOT' | 'FIERY';
  allergens: string[];
  tags: string[];
  isVegetarian: boolean;
  isAvailable: boolean;
  isFeatured: boolean;
  isBestSeller: boolean;
  prepMinutes: number;
  serves: number;
  rating: number;
  ratingCount: number;
  orderCount: number;
  /** Only returned by the single-dish endpoint, not by list endpoints. */
  optionGroups?: MenuOptionGroup[];
}

export interface MenuCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  image: string | null;
  itemCount: number;
}

export interface OrderItemRow {
  id: string;
  menuItemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  total: number;
  notes: string | null;
}

export interface Order {
  id: string;
  orderNumber: string;
  type: 'DELIVERY' | 'PICKUP' | 'DINE_IN';
  status: 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';
  customerName: string;
  customerPhone: string;
  addressText: string | null;
  notes: string | null;
  tableNumber: string | null;
  subtotal: number;
  packaging: number;
  deliveryFee: number;
  discount: number;
  pointsDiscount: number;
  tax: number;
  total: number;
  pointsEarned: number;
  couponCode: string | null;
  paymentMethod: string;
  paymentStatus: string;
  etaMinutes: number | null;
  trackingToken: string;
  createdAt: string;
  items: OrderItemRow[];
  events?: { id: string; status: string; note: string | null; createdAt: string }[];
}

export interface Reservation {
  id: string;
  code: string;
  name: string;
  email: string;
  phone: string;
  date: string;
  time: string;
  guests: number;
  seating: string;
  occasion: string | null;
  requests: string | null;
  status: string;
  waitlistPos: number | null;
  table?: { id: string; name: string; zone: string } | null;
}

export interface Quote {
  subtotal: number;
  packaging: number;
  deliveryFee: number;
  discount: number;
  pointsDiscount: number;
  pointsRedeemed: number;
  tax: number;
  total: number;
  pointsEarned: number;
  freeDeliveryApplied: boolean;
  couponCode: string | null;
  couponError: string | null;
  etaMinutes: number | null;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: 'SUPER_ADMIN' | 'MANAGER' | 'STAFF' | 'CUSTOMER';
  avatarUrl: string | null;
  points: number;
  lifetimePoints: number;
  tier: string;
  referralCode: string;
  marketingOptIn: boolean;
  dietaryPrefs: string[];
  memberSince: string;
}

export interface Offer {
  code: string;
  description: string;
  type: 'PERCENT' | 'FIXED' | 'FREE_DELIVERY';
  value: number;
  minOrder: number;
  maxDiscount: number | null;
  expiresAt: string | null;
}
