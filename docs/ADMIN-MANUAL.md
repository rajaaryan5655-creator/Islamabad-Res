# Admin Manual

For managers, floor staff and kitchen staff at Islamabad Restaurant.

Sign in at **/login** with your work email. You will be taken to **/admin**.

---

## Who can do what

| | Kitchen / Floor (Staff) | Manager | Owner (Super Admin) |
| --- | :---: | :---: | :---: |
| Kitchen board, orders, reservations | ✅ | ✅ | ✅ |
| Mark a dish sold out | ✅ | ✅ | ✅ |
| Inbox (messages, enquiries) | ✅ | ✅ | ✅ |
| Add/edit dishes and prices | — | ✅ | ✅ |
| Customers, coupons, campaigns | — | ✅ | ✅ |
| Reports | ✅ | ✅ | ✅ |
| Staff accounts, audit log | — | — | ✅ |

If you cannot see a menu item in the sidebar, your role does not have access to it.

---

## Kitchen board — the screen for service

**/admin/kitchen**

Four columns: **Pending → Confirmed → Preparing → Ready**. Tickets flow left to right.
The board refreshes itself every 12 seconds; leave it open on the pass.

Each ticket shows the last six characters of the order number, the customer's name, the
order type, every item with quantities, and — highlighted in red — any note the customer
left for the kitchen.

- The timer on each ticket counts minutes since the order was placed.
- **A ticket whose border turns red has been waiting over 30 minutes.** Deal with it
  next.
- Press the button at the bottom of a ticket to advance it one stage. That is the only
  action you need during service.

When an order reaches **Ready**, it disappears from the board and moves to the delivery
or collection flow. The customer is notified automatically at every stage.

### If a dish runs out mid-service

Go to **/admin/menu**, find the dish, and switch **Available** off. It disappears from
the website immediately and nobody can order it. Switch it back on tomorrow.

You do not need a manager for this — every staff account can do it.

---

## Orders

**/admin/orders**

Search by order number, customer name or phone. Filter by status. Click any order to
expand it and see the items, the address, the payment method and the timeline.

The **Move to** buttons only offer transitions that are actually legal. You cannot skip
from Confirmed to Delivered, and you cannot un-deliver an order — this is deliberate, so
the timeline stays honest.

**Cancelling.** Customers can cancel themselves while an order is Pending or Confirmed.
After that they must call, and you cancel it here. Any loyalty points they redeemed are
returned to them automatically.

### Refunds

Managers and above see a **Refund** button on any order that has been paid.

- Leave the amount empty to refund everything still outstanding, or type a figure for a
  partial refund. The form will not let you refund more than the order is worth, and the
  API checks again — a stale screen cannot over-refund.
- Always write a reason. It goes into the email the customer receives and into the order
  timeline, so the next person to look at this order knows what happened.
- **Card orders** go back through the original payment automatically; the money reaches
  the customer in 5–10 working days.
- **Cash and wallet orders** show an amber "return the cash by hand" note. The system
  records the refund, but somebody physically has to give the money back — enter it in
  the day book.
- Loyalty is corrected for you: points earned on the refunded portion are removed, and
  on a full refund any points the customer spent are returned.

You can refund the same order more than once until it is fully refunded. The button then
changes to "Fully refunded" and stops accepting more.

---

## Reservations

**/admin/reservations**

The date picker controls everything on the page. The three tiles show bookings, covers
and the percentage of the 260-cover floor plan committed.

The **month strip** shows every day at a glance — darker red means busier. Click a day
to jump to it.

### Approving bookings

Unless auto-approval is switched on (Settings → Service), every online booking arrives as
**Awaiting approval**. A table is held for it, but the guest has been told only that we
have their request.

- **Approve** confirms it and emails the guest. The system picks the best-fitting free
  table; if you want a specific one, approve from the booking and choose it.
- **Reject** releases the table and emails the guest your reason. Write a real sentence —
  they will read it. "We are fully committed at that time" is fine; leaving it blank is
  not, because the guest is left guessing.

Once a booking has been decided it cannot be decided again. If you approve by mistake,
cancel the booking instead, which frees the table and promotes anyone waiting.

For each booking:

- **Seat** when the guests arrive.
- **Complete** when they leave, which frees the table for the rest of the evening.
- **No show** if they never arrive. We hold tables for 15 minutes.

Guests who booked a slot with no free table are on the **waiting list**. When a
conflicting booking is cancelled, the first waitlisted party for that slot is promoted
automatically and notified — you do not need to do anything.

Special requests (high chair, wheelchair access, allergies, birthday cake) appear in
italics under the guest's name. Read them before service.

---

## Menu

**/admin/menu** — managers and above.

**Add dish** opens a form. Required: name, category, price, description. Strongly
recommended: calories, prep time, spice level and allergens — customers filter on these
and dishes without them get less traffic.

Flags:

- **Best seller** — a red badge on the card, and the dish is surfaced on the home page.
- **Featured** — included in the home page's signature dishes.
- **Vegetarian** — appears in the vegetarian filter.

Prices are in whole rupees, excluding tax. Tax is added at checkout.

Deleting a dish is permanent and removes it from the menu, but past orders keep their
record of what was sold.

---

## Categories

**/admin/categories** — managers and above.

Categories are the sections of the menu. The order here is the order guests see, so put
the things you want to sell first at the top: use the **up and down arrows** beside each
one.

- **Hide** takes a whole section off the site without deleting anything. Useful for a
  seasonal menu you will bring back.
- **Delete** is refused while the category still holds dishes — otherwise deleting
  "Biryani" would take thirty-nine dishes and their order history with it. Move or delete
  the dishes first.

---

## Reviews

**/admin/reviews** — all staff can read; managers can act.

**Nothing a customer writes appears on the site until somebody approves it here.** The
page opens on the pending queue.

- **Approve** publishes it.
- **Hide** takes a published review back down without deleting it.
- **Reply** publishes an owner response underneath the review, and notifies the guest.
  Reply to every review below four stars. Thank them by name, address the specific thing
  they raised, and say what you have changed. A well-handled bad review reads better to a
  new customer than a page of five stars.
- **Delete** is permanent — use it only for spam or abuse, never for criticism.

The panel at the top shows the overall average, the distribution across one to five
stars, and the last thirty days separately. Watch the 30-day figure rather than the
lifetime average: it moves fast enough to tell you something.

---

## Settings

**/admin/settings** — managers and above. Changes take effect within a minute; nobody
needs to redeploy anything.

| Switch | When to use it |
| --- | --- |
| **Accepting online orders** | Turn off when the kitchen is overwhelmed or you have closed early. The site immediately stops taking orders. A red banner reminds you it is off. |
| **Accepting reservations** | Closes the online booking form. Phone bookings and walk-ins are unaffected. |
| **Auto-approve reservations** | Leave **off** if you want to see every booking before it is confirmed. Turn on only during quiet periods. |
| **Delivery / Pickup** | Withdraw either option at checkout — for example, delivery during a storm. |
| **Kitchen prep time** | Added to every delivery estimate. Raise it on a busy Friday so the quoted time is honest. |
| **Site announcement** | A banner across the whole site. Use it for Eid hours or a road closure. Clear it when it stops being true. |

**Clear cache** forces the site to rebuild its menu on the next request. Use it if you
have changed a dish and the site still shows the old version after a minute.

---

## Analytics and reports

**/admin** — the overview.

The four tiles show revenue this month (with growth against the same span last month,
so a half-finished month does not look like a disaster), orders, average ticket, and
customers.

The **revenue chart** covers 7, 30 or 90 days.

The **business report** switches between daily, weekly, monthly and annual, and gives
you revenue, order count, average ticket, items sold, tax collected, discounts given,
the top seven dishes by revenue, and the delivery/pickup/dine-in split.

Practical uses:

- Compare the top-sellers list monthly. A dish falling out of the top ten for two months
  running is a candidate for the chopping block.
- Watch the discount total against revenue. If discounts exceed about 8% of revenue,
  a coupon is being over-used.
- The order mix tells you whether to staff the floor or the delivery kitchen.

---

## Customers

**/admin/customers** — managers and above.

Searchable by name, email or phone. Shows tier, order count, lifetime spend, points, and
whether they have opted into marketing.

Sort mentally by lifetime spend: your Gold and Platinum guests are a small group who
deserve to be recognised by name when they walk in.

---

## Marketing

**/admin/marketing**

### Coupons

**New coupon** takes a code, a type and a value.

| Type | Use it for |
| --- | --- |
| Percentage off | General promotions. Always set a maximum discount. |
| Fixed amount off | Family and large-order deals. |
| Free delivery | Winning back delivery customers. |

Always set a **minimum order** — a percentage coupon with no minimum can be used on a
single cup of chai.

Switch a coupon off rather than deleting it; deleting loses the usage history.

### Campaigns

Draft an email, then **Send now**. The audience is everyone who opted into marketing —
the count is shown at the top of the page. Opens and clicks appear after sending.

Do not send more than one a week. The people on that list gave you their address; treat
it as a loan.

---

## Inbox

**/admin/inbox**

**Enquiries** are private-dining and catering leads. Move each one along the pipeline:
Contacted → Quoted → Won or Lost. These are the highest-value messages you receive —
a single wedding is worth hundreds of covers. Reply within one working day.

**Messages** are contact-form submissions. **Reply** opens your email client with the
subject pre-filled. Mark them Read, Replied or Archived so the team knows what has been
handled.

---

## Staff

**/admin/staff** — owner only.

**Add staff** creates an account. If you leave the password blank, a temporary one is
generated and shown once — copy it immediately, it is not shown again.

Give the lowest role that lets someone do their job. A line cook needs Staff, not
Manager.

When someone leaves, switch **Active** off rather than deleting the account. Their
history in the audit log stays intact and they can no longer sign in.

You cannot demote your own account — this stops you locking yourself out.

---

## Daily rhythm

**Opening (10:30)**
- Open the kitchen board on the pass display
- Check /admin/reservations for today's covers and any special requests
- Check the menu for anything switched off yesterday that is available again

**During service**
- Work the kitchen board; watch for red-bordered tickets
- Mark dishes sold out the moment they run out

**Closing (23:00)**
- Clear the board — no ticket should be left in Preparing
- Mark no-shows on the reservation page
- Glance at /admin for the day's revenue

**Weekly (Monday)**
- Read the weekly report; compare top sellers with last week
- Answer any event enquiries still sitting in New
- Review coupon usage

**Monthly**
- Monthly report; check growth and the discount ratio
- Review menu prices against food cost
- Rotate the seeded staff passwords if they have not been changed

---

## Troubleshooting

| Problem | What to do |
| --- | --- |
| A dish still shows online after selling out | Check /admin/menu — the toggle may not have saved. Reload. |
| A customer says their coupon does not work | Check the minimum order and expiry on /admin/marketing. |
| The kitchen board is empty during service | Check the internet connection; the board needs the API. Orders are safe either way. |
| A guest arrives with no booking on file | Look them up by confirmation code on /admin/reservations, or seat them and add a walk-in. |
| Someone cannot sign in | Check Active on /admin/staff. Owner can set a new password. |
| Website appears down | Check `https://api.islamabadrestaurant.pk/api/health`. If it does not return `ok`, contact your developer. |

For anything technical, contact your developer with the order or reservation number.
