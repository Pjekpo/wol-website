# The WOL Collective

This repo is now set up as a static site for Vercel.

## Vercel deployment settings

Use these settings in the Vercel project:

- Framework Preset: `Other`
- Build Command: leave blank
- Output Directory: leave blank in the dashboard, or use the repo `vercel.json` override
- Install Command: leave blank

A `vercel.json` file is included to force the Output Directory to the repo root so Vercel serves `index.html`.

## Why the Vercel 404 happened

Vercel shows `404: NOT_FOUND` when the deployment does not include a root index file at the path it is serving from. In this repo the site lives at the repo root, while the `public/` folder only contains assets. If Vercel was trying to serve `public/` as the output directory, `/` would 404.

## Custom domain on Vercel

After the deployment works:

1. Open the Vercel project.
2. Go to `Settings` -> `Domains`.
3. Add `thewolcollective.com` and `www.thewolcollective.com`.
4. In Namecheap, use the DNS records Vercel gives you for that project.

## Important limitation

This is a static site. The password gate is browser-side only, and the waitlist is local-only unless you connect a real form endpoint in `data/content.json`.
