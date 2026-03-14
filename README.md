# The WOL Collective

This repo is now structured as a Next.js storefront for Vercel.

## What was missing

Your working Vercel project uses a real framework app structure (`app/`, `package.json`, build scripts, and route handlers).
This repo did not. That mismatch is what kept causing deployment confusion.

## Required Vercel environment variables

Add these to the Vercel project before testing checkout:

- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_ID`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `DROP_ADMIN_SECRET`
- `DROP_GO_LIVE_AT`
- `SITE_URL`

Optional:

- `NEXT_PUBLIC_SITE_URL`
- `LAUNCH_DISCOUNT_PERCENT`
- `LAUNCH_DISCOUNT_EXPIRY_ISO`

## Vercel settings

- Framework Preset: `Next.js`
- Root Directory: repo root
- Build Command: leave default
- Output Directory: leave default
- Node.js Version: remove any old override or set it to `20.x`

## Checkout flow

The site uses a browser cart and a Next.js route at `app/api/create-checkout-session/route.js` to create the Stripe Checkout session securely on the server.

## Launch discount flow

The scratchcard claim form now supports a real no-login launch-discount system:

- Claims are saved server-side through `app/api/discount-claims/route.js`
- Emails are stored in Supabase
- Unique single-use Stripe promotion codes are created as soon as someone claims the offer
- The thank-you email with the code is sent immediately through Resend
- Stripe Checkout now allows promotion codes
- A cron-safe route can auto-dispatch all unsent launch emails once `DROP_GO_LIVE_AT` has passed

Before using it, run the schema in `supabase/launch-discounts.sql` inside the Supabase SQL editor.

For a quick Resend smoke test, you can use `onboarding@resend.dev` as `RESEND_FROM_EMAIL` while setting things up.

### Trigger the launch email send

If you ever need to send codes to claims that were saved but not emailed yet, call:

```bash
curl -X POST https://your-domain.com/api/admin/send-drop-discounts \
  -H "Authorization: Bearer YOUR_DROP_ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d "{\"limit\":100}"
```

That endpoint sends codes to all unsent claim emails up to the limit you provide.

### Automatic drop dispatch

If you want the launch email blast to happen automatically at drop time, use:

```text
GET /api/cron/send-drop-discounts
```

That route:

- waits until `DROP_GO_LIVE_AT`
- sends codes only to claims that have not been emailed yet
- can be called by a Vercel Cron job in production
- can also be tested manually with `Authorization: Bearer YOUR_DROP_ADMIN_SECRET`
- should be scheduled in UTC

Example manual test:

```bash
curl "http://localhost:3000/api/cron/send-drop-discounts?limit=100" \
  -H "Authorization: Bearer YOUR_DROP_ADMIN_SECRET"
```

### Send a test email

To verify Resend before launch, call:

```bash
curl -X POST https://your-domain.com/api/admin/send-test-email \
  -H "Authorization: Bearer YOUR_DROP_ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"thewolcollective@gmail.com\"}"
```

### Notes

- There is no customer login system in this flow.
- The admin send route is protected only by `DROP_ADMIN_SECRET`, so keep it private.
- `RESEND_FROM_EMAIL` must be a sender address that Resend has permission to send from.
- If Supabase, Stripe, or Resend are not configured correctly, the claim form will fail instead of pretending the code was sent.
