# The WOL Collective

This repo is now structured as a Next.js storefront for Vercel.

## What was missing

Your working Vercel project uses a real framework app structure (`app/`, `package.json`, build scripts, and route handlers).
This repo did not. That mismatch is what kept causing deployment confusion.

## Required Vercel environment variables

Add these to the Vercel project before testing checkout:

- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_ID`

## Vercel settings

- Framework Preset: `Next.js`
- Root Directory: repo root
- Build Command: leave default
- Output Directory: leave default
- Node.js Version: remove any old override or set it to `20.x`

## Checkout flow

The site uses a browser cart and a Next.js route at `app/api/create-checkout-session/route.js` to create the Stripe Checkout session securely on the server.
