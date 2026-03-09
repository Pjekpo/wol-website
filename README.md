# The WOL Collective

This repo is now a Vercel-ready storefront with a client-side cart and a serverless Stripe Checkout session endpoint.

## Stack

- Static storefront at `index.html`
- Cart state in `localStorage`
- Vercel Function at `api/create-checkout-session.mjs`
- Stripe Checkout for hosted payment flow

## Required Vercel environment variables

Add these in the Vercel project settings:

- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_ID`

`STRIPE_PRICE_ID` should be the Stripe Price ID for the product you want to sell.

## How checkout works

1. Customer adds the product to cart.
2. Client posts quantity to `/api/create-checkout-session`.
3. The Vercel function creates a Stripe Checkout Session using your secret key and price ID.
4. Customer is redirected to Stripe.

## Vercel project settings

Use these settings in the Vercel project:

- Framework Preset: `Other`
- Build Command: leave blank
- Install Command: leave blank
- Output Directory: leave blank

## Important notes

- This is now dynamic because checkout is created server-side through Vercel Functions.
- The waitlist form is still browser-only unless you connect a real endpoint in `data/content.json`.
- If the site still shows a Vercel 404, check that the Vercel project Root Directory is the repo root and not `public`.
