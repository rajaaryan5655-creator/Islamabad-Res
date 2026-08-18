import { BRAND, formatPKR } from '@islamabad/shared';

/**
 * Transactional email templates.
 *
 * Built as a single inlined-CSS layout because email clients (Outlook in
 * particular) ignore <style> blocks, external stylesheets, flexbox and grid.
 * Tables and inline styles are the only reliably portable layout primitives.
 */

const C = {
  obsidian: '#0a0a0a',
  ember: '#c8102e',
  saffron: '#f4b400',
  cream: '#f7f3ec',
  text: '#1f1c19',
  muted: '#6b6560',
  border: '#e4ddd0',
};

const SITE = process.env.WEB_ORIGIN?.split(',')[0] ?? 'https://islamabadrestaurant.pk';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function button(label: string, href: string): string {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:26px 0;">
    <tr><td align="center" bgcolor="${C.ember}" style="border-radius:3px;">
      <a href="${href}" style="display:inline-block;padding:14px 32px;font-family:Helvetica,Arial,sans-serif;font-size:13px;font-weight:bold;letter-spacing:1.6px;text-transform:uppercase;color:#ffffff;text-decoration:none;">${escapeHtml(label)}</a>
    </td></tr>
  </table>`;
}

function layout(opts: { preheader: string; heading: string; body: string; footerNote?: string }): string {
  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<title>${escapeHtml(opts.heading)}</title>
</head>
<body style="margin:0;padding:0;background:${C.cream};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(opts.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.cream};padding:28px 12px;">
<tr><td align="center">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:#ffffff;border:1px solid ${C.border};">

    <tr><td align="center" bgcolor="${C.obsidian}" style="padding:30px 24px;">
      <div style="font-family:Georgia,'Times New Roman',serif;font-size:26px;color:#ffffff;letter-spacing:0.5px;">Islamabad</div>
      <div style="font-family:Helvetica,Arial,sans-serif;font-size:9px;letter-spacing:5px;color:${C.saffron};text-transform:uppercase;margin-top:3px;">Restaurant</div>
    </td></tr>

    <tr><td style="padding:36px 40px 8px;">
      <h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:27px;line-height:1.25;color:${C.text};font-weight:normal;">${escapeHtml(opts.heading)}</h1>
      <div style="font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.65;color:${C.text};">${opts.body}</div>
    </td></tr>

    <tr><td style="padding:24px 40px 34px;">
      ${opts.footerNote ? `<p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:${C.muted};">${opts.footerNote}</p>` : ''}
    </td></tr>

    <tr><td bgcolor="${C.obsidian}" style="padding:26px 40px;">
      <p style="margin:0 0 6px;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:1.7;color:rgba(247,243,236,0.75);">
        ${BRAND.address.street}, ${BRAND.address.locality} ${BRAND.address.postalCode}<br>
        <a href="tel:${BRAND.phoneRaw}" style="color:${C.saffron};text-decoration:none;">${BRAND.phone}</a> &nbsp;·&nbsp;
        <a href="mailto:${BRAND.email}" style="color:${C.saffron};text-decoration:none;">${BRAND.email}</a>
      </p>
      <p style="margin:12px 0 0;font-family:Helvetica,Arial,sans-serif;font-size:11px;color:rgba(247,243,236,0.4);">
        © ${new Date().getFullYear()} ${BRAND.legalName}. Serving Pakistan since ${BRAND.established}.
      </p>
    </td></tr>

  </table>
</td></tr></table>
</body></html>`;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

const strip = (html: string) =>
  html
    .replace(/<style[\s\S]*?<\/style>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

/* --------------------------------- welcome -------------------------------- */

export function welcomeEmail(input: { name: string; verifyUrl?: string }): RenderedEmail {
  const first = input.name.split(' ')[0];
  const html = layout({
    preheader: 'Your 250 welcome points are ready — worth Rs. 500 off your first order.',
    heading: `Welcome, ${escapeHtml(first)}`,
    body: `
      <p style="margin:0 0 14px;">Thank you for joining us. Your account is ready, and we have credited
      <strong>250 welcome points</strong> — worth <strong>${formatPKR(500)}</strong> off your first order.</p>
      <p style="margin:0 0 14px;">A few things worth knowing:</p>
      <ul style="margin:0 0 14px;padding-left:20px;color:${C.text};">
        <li style="margin-bottom:7px;">You earn 1 point for every ${formatPKR(100)} you spend, and each point is worth ${formatPKR(2)}.</li>
        <li style="margin-bottom:7px;">Save your address once and checkout becomes a single tap.</li>
        <li style="margin-bottom:7px;">Every order can be tracked live, from the kitchen to your door.</li>
      </ul>
      ${input.verifyUrl ? `<p style="margin:0 0 6px;">Please confirm your email address to secure your account:</p>${button('Verify my email', input.verifyUrl)}` : button('Start an order', `${SITE}/order`)}
    `,
    footerNote: 'You are receiving this because an account was created with this email address.',
  });
  return { subject: `Welcome to ${BRAND.name}`, html, text: strip(html) };
}

/* ---------------------------- email verification --------------------------- */

export function verifyEmail(input: { name: string; verifyUrl: string }): RenderedEmail {
  const html = layout({
    preheader: 'Confirm your email address to secure your account.',
    heading: 'Confirm your email',
    body: `
      <p style="margin:0 0 14px;">Hello ${escapeHtml(input.name.split(' ')[0])},</p>
      <p style="margin:0 0 14px;">Please confirm this email address so we can send you order confirmations
      and reservation reminders.</p>
      ${button('Verify my email', input.verifyUrl)}
      <p style="margin:0;font-size:13px;color:${C.muted};">This link expires in 24 hours. If the button does not
      work, paste this into your browser:<br>
      <span style="word-break:break-all;color:${C.ember};">${escapeHtml(input.verifyUrl)}</span></p>
    `,
    footerNote: 'If you did not create an account, you can safely ignore this email.',
  });
  return { subject: `Confirm your email — ${BRAND.name}`, html, text: strip(html) };
}

/* ----------------------------- password reset ------------------------------ */

export function passwordResetEmail(input: { name: string; resetUrl: string }): RenderedEmail {
  const html = layout({
    preheader: 'Reset your password. This link expires in one hour.',
    heading: 'Reset your password',
    body: `
      <p style="margin:0 0 14px;">Hello ${escapeHtml(input.name.split(' ')[0])},</p>
      <p style="margin:0 0 14px;">We received a request to reset the password on your account. Choose a new
      one using the button below.</p>
      ${button('Choose a new password', input.resetUrl)}
      <p style="margin:0 0 14px;font-size:13px;color:${C.muted};">This link expires in <strong>one hour</strong> and
      can be used once. If the button does not work, paste this into your browser:<br>
      <span style="word-break:break-all;color:${C.ember};">${escapeHtml(input.resetUrl)}</span></p>
    `,
    footerNote:
      'If you did not request this, no action is needed — your password has not changed. If you receive these repeatedly, please contact us.',
  });
  return { subject: `Reset your password — ${BRAND.name}`, html, text: strip(html) };
}

/* -------------------------- order confirmation ----------------------------- */

export function orderConfirmationEmail(input: {
  name: string;
  orderNumber: string;
  items: { name: string; quantity: number; total: number; notes?: string | null }[];
  subtotal: number;
  discount: number;
  pointsDiscount: number;
  deliveryFee: number;
  packaging: number;
  tax: number;
  total: number;
  type: string;
  addressText?: string | null;
  etaMinutes?: number | null;
  trackingUrl: string;
  pointsEarned: number;
}): RenderedEmail {
  const rows = input.items
    .map(
      (i) => `
      <tr>
        <td style="padding:9px 0;border-bottom:1px solid ${C.border};font-family:Helvetica,Arial,sans-serif;font-size:14px;color:${C.text};">
          <strong style="color:${C.muted};">${i.quantity}×</strong> ${escapeHtml(i.name)}
          ${i.notes ? `<br><span style="font-size:12px;font-style:italic;color:${C.muted};">“${escapeHtml(i.notes)}”</span>` : ''}
        </td>
        <td align="right" style="padding:9px 0;border-bottom:1px solid ${C.border};font-family:Helvetica,Arial,sans-serif;font-size:14px;color:${C.text};white-space:nowrap;">${formatPKR(i.total)}</td>
      </tr>`,
    )
    .join('');

  const line = (label: string, value: string, colour = C.muted) => `
    <tr><td style="padding:3px 0;font-family:Helvetica,Arial,sans-serif;font-size:13px;color:${colour};">${label}</td>
    <td align="right" style="padding:3px 0;font-family:Helvetica,Arial,sans-serif;font-size:13px;color:${colour};">${value}</td></tr>`;

  const html = layout({
    preheader: `Order ${input.orderNumber} confirmed — ${formatPKR(input.total)}`,
    heading: 'Your order is confirmed',
    body: `
      <p style="margin:0 0 14px;">Thank you, ${escapeHtml(input.name.split(' ')[0])}. We have your order and the
      kitchen is on it.</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.cream};padding:14px 16px;margin:0 0 20px;">
        <tr><td style="font-family:Helvetica,Arial,sans-serif;font-size:13px;color:${C.muted};">Order number</td>
            <td align="right" style="font-family:Helvetica,Arial,sans-serif;font-size:13px;font-weight:bold;color:${C.text};">${escapeHtml(input.orderNumber)}</td></tr>
        <tr><td style="font-family:Helvetica,Arial,sans-serif;font-size:13px;color:${C.muted};padding-top:5px;">Type</td>
            <td align="right" style="font-family:Helvetica,Arial,sans-serif;font-size:13px;color:${C.text};padding-top:5px;text-transform:capitalize;">${escapeHtml(input.type.replace('_', ' ').toLowerCase())}</td></tr>
        ${input.etaMinutes ? `<tr><td style="font-family:Helvetica,Arial,sans-serif;font-size:13px;color:${C.muted};padding-top:5px;">Estimated</td><td align="right" style="font-family:Helvetica,Arial,sans-serif;font-size:13px;color:${C.text};padding-top:5px;">${input.etaMinutes} minutes</td></tr>` : ''}
        ${input.addressText ? `<tr><td style="font-family:Helvetica,Arial,sans-serif;font-size:13px;color:${C.muted};padding-top:5px;">Delivering to</td><td align="right" style="font-family:Helvetica,Arial,sans-serif;font-size:13px;color:${C.text};padding-top:5px;">${escapeHtml(input.addressText)}</td></tr>` : ''}
      </table>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">
        ${line('Subtotal', formatPKR(input.subtotal))}
        ${input.discount > 0 ? line('Discount', `−${formatPKR(input.discount)}`, '#0f7b4f') : ''}
        ${input.pointsDiscount > 0 ? line('Points redeemed', `−${formatPKR(input.pointsDiscount)}`, '#0f7b4f') : ''}
        ${input.packaging > 0 ? line('Packaging', formatPKR(input.packaging)) : ''}
        ${input.deliveryFee > 0 ? line('Delivery', formatPKR(input.deliveryFee)) : ''}
        ${line('Sales tax (16%)', formatPKR(input.tax))}
        <tr><td style="padding:10px 0 0;border-top:2px solid ${C.obsidian};font-family:Georgia,serif;font-size:19px;color:${C.text};">Total</td>
            <td align="right" style="padding:10px 0 0;border-top:2px solid ${C.obsidian};font-family:Georgia,serif;font-size:19px;color:${C.ember};">${formatPKR(input.total)}</td></tr>
      </table>

      ${button('Track my order', input.trackingUrl)}
      ${input.pointsEarned > 0 ? `<p style="margin:0;font-size:13px;color:${C.saffron === '#f4b400' ? '#a37c15' : C.muted};">You will earn <strong>${input.pointsEarned} loyalty points</strong> when this order is delivered.</p>` : ''}
    `,
    footerNote:
      'You can cancel free of charge until the kitchen begins preparing your order. After that, please call us.',
  });
  return { subject: `Order ${input.orderNumber} confirmed — ${BRAND.name}`, html, text: strip(html) };
}

/* ------------------------ reservation confirmation ------------------------- */

export function reservationEmail(input: {
  name: string;
  code: string;
  date: string;
  time: string;
  guests: number;
  status: 'PENDING' | 'CONFIRMED' | 'WAITLIST' | 'REJECTED';
  tableName?: string | null;
  occasion?: string | null;
  manageUrl: string;
  rejectionReason?: string | null;
}): RenderedEmail {
  const pretty = new Date(`${input.date}T12:00:00`).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const copy: Record<typeof input.status, { heading: string; intro: string }> = {
    PENDING: {
      heading: 'We have your booking request',
      intro: 'Our floor manager is confirming availability and will email you shortly — usually within the hour during service.',
    },
    CONFIRMED: {
      heading: 'Your table is confirmed',
      intro: 'We look forward to seeing you. Your table is held for 15 minutes past the booked time.',
    },
    WAITLIST: {
      heading: 'You are on the waiting list',
      intro: 'That slot is fully booked, but we will call you the moment a table frees up.',
    },
    REJECTED: {
      heading: 'We cannot host that booking',
      intro:
        input.rejectionReason ??
        'Unfortunately we are unable to accommodate this booking. Please try another date or time — we would still love to have you.',
    },
  };

  const { heading, intro } = copy[input.status];

  const html = layout({
    preheader: `${heading} — ${pretty} at ${input.time}`,
    heading,
    body: `
      <p style="margin:0 0 14px;">Hello ${escapeHtml(input.name.split(' ')[0])},</p>
      <p style="margin:0 0 18px;">${escapeHtml(intro)}</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.cream};padding:16px;margin:0 0 18px;">
        <tr><td style="font-family:Helvetica,Arial,sans-serif;font-size:13px;color:${C.muted};">Confirmation code</td>
            <td align="right" style="font-family:'Courier New',monospace;font-size:15px;font-weight:bold;color:${C.text};">${escapeHtml(input.code)}</td></tr>
        <tr><td style="font-family:Helvetica,Arial,sans-serif;font-size:13px;color:${C.muted};padding-top:6px;">Date</td>
            <td align="right" style="font-family:Helvetica,Arial,sans-serif;font-size:13px;color:${C.text};padding-top:6px;">${escapeHtml(pretty)}</td></tr>
        <tr><td style="font-family:Helvetica,Arial,sans-serif;font-size:13px;color:${C.muted};padding-top:6px;">Time</td>
            <td align="right" style="font-family:Helvetica,Arial,sans-serif;font-size:13px;color:${C.text};padding-top:6px;">${escapeHtml(input.time)}</td></tr>
        <tr><td style="font-family:Helvetica,Arial,sans-serif;font-size:13px;color:${C.muted};padding-top:6px;">Guests</td>
            <td align="right" style="font-family:Helvetica,Arial,sans-serif;font-size:13px;color:${C.text};padding-top:6px;">${input.guests}</td></tr>
        ${input.tableName ? `<tr><td style="font-family:Helvetica,Arial,sans-serif;font-size:13px;color:${C.muted};padding-top:6px;">Table</td><td align="right" style="font-family:Helvetica,Arial,sans-serif;font-size:13px;color:${C.text};padding-top:6px;">${escapeHtml(input.tableName)}</td></tr>` : ''}
        ${input.occasion ? `<tr><td style="font-family:Helvetica,Arial,sans-serif;font-size:13px;color:${C.muted};padding-top:6px;">Occasion</td><td align="right" style="font-family:Helvetica,Arial,sans-serif;font-size:13px;color:${C.text};padding-top:6px;">${escapeHtml(input.occasion)}</td></tr>` : ''}
      </table>
      ${input.status !== 'REJECTED' ? button('Manage my booking', input.manageUrl) : button('Try another date', `${SITE}/reservations`)}
    `,
    footerNote:
      input.status === 'CONFIRMED'
        ? 'Changes and cancellations are free up to two hours before your booking.'
        : undefined,
  });

  return { subject: `${heading} — ${BRAND.name}`, html, text: strip(html) };
}

/* -------------------------------- promotion -------------------------------- */

export function promotionEmail(input: { name?: string; subject: string; body: string; ctaUrl?: string }): RenderedEmail {
  const html = layout({
    preheader: input.body.slice(0, 110),
    heading: input.subject,
    body: `
      ${input.name ? `<p style="margin:0 0 14px;">Hello ${escapeHtml(input.name.split(' ')[0])},</p>` : ''}
      ${input.body
        .split('\n')
        .filter(Boolean)
        .map((p) => `<p style="margin:0 0 14px;">${escapeHtml(p)}</p>`)
        .join('')}
      ${button('View the menu', input.ctaUrl ?? `${SITE}/menu`)}
    `,
    footerNote: `You are receiving this because you opted into offers. <a href="${SITE}/unsubscribe" style="color:${C.muted};">Unsubscribe</a>.`,
  });
  return { subject: input.subject, html, text: strip(html) };
}

/* ------------------------------ refund notice ------------------------------ */

export function refundEmail(input: { name: string; orderNumber: string; amount: number; reason?: string | null }): RenderedEmail {
  const html = layout({
    preheader: `Refund of ${formatPKR(input.amount)} for order ${input.orderNumber}`,
    heading: 'Your refund is on its way',
    body: `
      <p style="margin:0 0 14px;">Hello ${escapeHtml(input.name.split(' ')[0])},</p>
      <p style="margin:0 0 14px;">We have refunded <strong>${formatPKR(input.amount)}</strong> against order
      <strong>${escapeHtml(input.orderNumber)}</strong>.</p>
      ${input.reason ? `<p style="margin:0 0 14px;color:${C.muted};">Reason: ${escapeHtml(input.reason)}</p>` : ''}
      <p style="margin:0 0 14px;">Card refunds usually appear within 5 to 10 working days, depending on your bank.
      Cash refunds are handled at the restaurant.</p>
      <p style="margin:0;">We are sorry the order did not meet the standard you expect from us.</p>
    `,
    footerNote: 'Any loyalty points redeemed on this order have been returned to your account.',
  });
  return { subject: `Refund issued — order ${input.orderNumber}`, html, text: strip(html) };
}
