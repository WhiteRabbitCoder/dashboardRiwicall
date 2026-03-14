# RiwiCall Dashboard

RiwiCall Dashboard is a modular single-page application for call center operations, candidate follow-up, and event tracking.

## Stack

- Vanilla JavaScript (ES modules)
- Tailwind CSS (CDN)
- Lucide icons (CDN)
- XLSX (CDN, for Excel import)
- Netlify Edge Functions (Supabase proxy)
- Vite (local development and build)

## Project Structure

```text
src/
  css/
  js/
    components/
    loaders/
    logic/
    router/
    services/
  views/
netlify/
  edge-functions/
```

## Run Locally

```bash
npm install
npm run dev
```

Open: `http://localhost:5173`

## Build

```bash
npm run build
npm run preview
```

## Netlify Environment Variables

The Edge Function uses Netlify environment variables only:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Edge function file:

- `netlify/edge-functions/supabase-proxy.js`

## Notes

- Dashboard statistics are generated from synchronized Supabase data (`candidatos` + `llamadas`) and cached in localStorage as fallback.
- The settings page keeps only the call flow webhook configuration (`Webhook flujo llamadas`).
- Legacy hash routes remain available for backward compatibility.
