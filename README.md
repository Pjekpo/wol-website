# The WOL Collective

This repo is now structured as a Next.js storefront for Vercel.

## What was missing

Your working Vercel project uses a real framework app structure (`app/`, `package.json`, build scripts, and route handlers).
This repo did not. That mismatch is what kept causing deployment confusion.

## Required Vercel environment variables

Add these to the Vercel project before testing checkout:

- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_ID`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `DROP_ADMIN_SECRET`
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
- Emails are stored in Upstash Redis
- Unique single-use Stripe promotion codes are created when you send the drop
- Launch emails are sent through Resend
- Stripe Checkout now allows promotion codes

### Trigger the launch email send

When you are ready to send the drop email, call:

```bash
curl -X POST https://your-domain.com/api/admin/send-drop-discounts \
  -H "Authorization: Bearer YOUR_DROP_ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d "{\"limit\":100}"
```

That endpoint sends codes to all unsent claim emails up to the limit you provide.

### Notes

- There is no customer login system in this flow.
- The admin send route is protected only by `DROP_ADMIN_SECRET`, so keep it private.
- `RESEND_FROM_EMAIL` must be a sender address that Resend has permission to send from.
- If Redis/Resend are not configured yet, the storefront still falls back to browser-only saving for local testing.
