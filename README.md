# The WOL Collective

This repo is now set up for GitHub Pages.

## What changed

- The old Node backend was removed because GitHub Pages only serves static files.
- The site now runs from `index.html` and loads content from `data/content.json`.
- The owner password gate is client-side only.
- Waitlist signup is also client-side by default and stores emails in the visitor browser unless you connect a real form endpoint.

## Real waitlist collection on GitHub Pages

If you want real email capture on a static host, connect a form service like Formspree or Formsubmit.
Then set `gate.waitlistEndpoint` in `data/content.json` to that endpoint URL.

## GitHub Pages setup

1. Push this repo to GitHub.
2. In GitHub, open the repo `Settings` -> `Pages`.
3. Under `Build and deployment`, set `Source` to `Deploy from a branch`.
4. Select branch `main` and folder `/ (root)`.
5. Save.
6. GitHub will publish `index.html` from the repo root.

## Custom domain

This repo includes a `CNAME` file for `thewolcollective.com`.
After GitHub Pages is live, set the custom domain in GitHub Pages settings and then point Namecheap DNS to GitHub Pages.

## Namecheap DNS for apex + www

Use these records for GitHub Pages:

- `A` Host `@` -> `185.199.108.153`
- `A` Host `@` -> `185.199.109.153`
- `A` Host `@` -> `185.199.110.153`
- `A` Host `@` -> `185.199.111.153`
- `CNAME` Host `www` -> `pjekpo.github.io`

Remove conflicting old `A`, `CNAME`, `URL Redirect`, or `AAAA` records first.

## Important limitation

Because this is GitHub Pages, the password gate is not secure server-side protection. It only hides the site in the browser.
