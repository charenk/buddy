# Figma AI Buddy

Build "@buddy": when a designer comments `@buddy …` on a Figma frame, an AI replies in the same thread with staff/principal‑level critique, edge cases, a11y notes, and concrete next steps. No copy/paste to external tools.

## What you'll ship in v1 (MVP)

- A Vercel‑hosted Node/TypeScript endpoint that listens to **Figma comment webhooks**.
- It detects `@buddy`, exports the referenced frame as an image, sends the image + prompt to a **Vision LLM**, and **replies in the same Figma thread**.
- Optional tiny Figma **Plugin** (button to test; not required for v1).

## Prerequisites

1. **Accounts**
   - Figma (Editor on a Team/Org).
   - Vercel (free) — for hosting.
   - OpenAI (API key) — vision model.
   - Supabase — log requests.

2. **Local tools**
   - **Cursor IDE** installed and signed in.
   - Node 20+ and pnpm or npm (`node -v`).

3. **One test Figma file** with at least one frame you can comment on.

## Environment Variables

Copy `env.example` to `.env.local` and fill in your credentials:

```bash
# OpenAI API Key
OPENAI_API_KEY=your_openai_api_key_here

# Figma API
FIGMA_PAT=your_figma_personal_access_token_here
FIGMA_WEBHOOK_SECRET=your_webhook_secret_here

# Supabase
SUPABASE_URL=your_supabase_project_url_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Optional: File allowlist for security
ALLOWLIST_FILE_KEYS=comma_separated_file_keys_here
```

## Development

```bash
# Install dependencies
npm install

# Run locally
npm run dev

# Build
npm run build
```

## Deployment

The project is configured for Vercel deployment. Every push to `main` will auto-deploy.

## Usage

1. Comment `@buddy` on any Figma frame
2. Buddy will analyze the frame and reply with design critique
3. Check Supabase for usage logs and metrics

## Project Structure

```
buddy/
├── api/
│   └── figma-webhook.ts    # Main webhook endpoint
├── lib/
│   ├── figma.ts            # Figma API helpers
│   ├── openai.ts           # OpenAI API helpers
│   ├── db.ts               # Supabase helpers
│   ├── logger.ts           # Logging utilities
│   └── schema.ts           # Zod validation schemas
├── package.json
├── tsconfig.json
└── README.md
```
