# Caviar Beauty Frontend

React and Vite storefront. This folder is self-contained and can be deployed as its own Vercel project.

## Local development

1. Install Node.js 22.12 or newer (the version used in CI).
2. Run `npm install`.
3. Copy `.env.example` to `.env`. For local development, leave `VITE_API_URL` unset; Vite proxies `/api` and `/uploads` to `http://localhost:4000`.
4. Run `npm run dev`.

Useful commands: `npm run build`, `npm run preview`, and `npm test`.

## Vercel

Create a Vercel project with this folder as its Root Directory. The included `vercel.json` proxies `/api` and `/uploads` to the separate backend deployment so browser authentication cookies remain first-party. Optional frontend variables are `VITE_GOOGLE_CLIENT_ID`, `VITE_RAZORPAY_KEY_ID`, and `VITE_GA_MEASUREMENT_ID`. Vite embeds these values during the build, so redeploy after changing them.

The backend must allow this site's exact production origin in `FRONTEND_URL`. Update the backend destination in `vercel.json` if the backend's Vercel domain changes.
