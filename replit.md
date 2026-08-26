# PropertyLedge

## Run on Replit

The project uses Next.js with the existing Supabase authentication and data layer.

- Development preview: `npm run dev -- --hostname 0.0.0.0 --port 5000`
- Production build: `npm run build`
- Type checking: `npm run typecheck`
- End-to-end tests: `npm run test:e2e`

The Replit workflow is configured as **Start application** on port `5000`.

## Environment

Supabase-backed authenticated routes require these environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Additional email, billing, and application settings are documented in `.env.example`. Keep credentials in Replit Secrets or environment variables rather than committing them.