# Caviar Beauty Frontend

React and Vite storefront. This folder is self-contained and can be deployed as its own Vercel project.

## Local development

1. Install Node.js 22.12 or newer (the version used in CI).
2. Run `npm install`.
3. Copy `.env.example` to `.env`. For local development, leave `VITE_API_URL` unset; Vite proxies `/api` and `/uploads` to `http://localhost:4000`.
4. Run `npm run dev`.

Useful commands: `npm run build`, `npm run preview`, and `npm test`.

## Editing the site

Storefront copy comes from the API, so most text changes need no deploy. Sign in at `/admin/login` (the seeded administrator is asked to change the default password before the panel opens) and then:

- `/admin/content` lists every editable page. The About, FAQ, size guide, care instructions, order tracking, privacy, terms, cookie and GDPR pages ship with the app and can be edited or unpublished but not deleted. Custom pages appear at `/p/<slug>`.
- `/admin/content/:id/edit` edits one page: title, subtitle, SEO fields, and a section builder for headings, paragraphs, bullet lists and optional tables. The About page swaps the section builder for story paragraphs and value cards.
- `/admin/settings` edits the site-wide details used across the storefront: brand name, tagline, footer text, contact details, social links, the announcement strip, and the home hero slides.

Each page falls back to the copy in `src/data/infoPages.js` and `src/data/siteDefaults.js` if the API is unreachable, so the storefront never renders empty. The brand name from `/admin/settings` also drives the navbar and splash marks, footer, About copy, contact preview, auth screens and page titles.

## Vercel

Create a Vercel project with this folder as its Root Directory. The included `vercel.json` proxies `/api` and `/uploads` to the separate backend deployment so browser authentication cookies remain first-party. Optional frontend variables are `VITE_GOOGLE_CLIENT_ID`, `VITE_PAYTM_MID`, and `VITE_GA_MEASUREMENT_ID`. Vite embeds these values during the build, so redeploy after changing them.

The backend must allow this site's exact production origin in `FRONTEND_URL`. Update the backend destination in `vercel.json` if the backend's Vercel domain changes.
