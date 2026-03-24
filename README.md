# Whats does Figma buddy do? 

Buddy App: when a designer comments `@buddy …` on a Figma frame, an AI replies in the same thread with staff/principal‑level critique, edge cases, a11y notes, and concrete next steps. No copy/paste to external tools.


## Prerequisites

1. **Accounts**
   - Figma (Editor on a Team/Org).
   - Vercel (free) — for hosting.
   - OpenAI (API key) — vision model.
   - Supabase — log requests.

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
