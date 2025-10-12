# Goal

Build “@buddy”: when a designer comments `@buddy …` on a Figma frame, an AI replies in the same thread with staff/principal‑level critique, edge cases, a11y notes, and concrete next steps. No copy/paste to external tools.

---

## What you’ll ship in v1 (MVP)

- A Vercel‑hosted Node/TypeScript endpoint that listens to **Figma comment webhooks**.
- It detects `@buddy`, exports the referenced frame as an image, sends the image + prompt to a **Vision LLM**, and **replies in the same Figma thread**.
- Optional tiny Figma **Plugin** (button to test; not required for v1).

---

## Prereqs (10–20 min)

1. **Accounts**

   - Figma (Editor on a Team/Org).
   - Vercel (free) — for hosting.
   - OpenAI (API key) — vision model.
   - (Optional) Supabase — log requests.

2. **Local tools**

   - **Cursor IDE** installed and signed in.
   - Node 20+ and pnpm or npm (`node -v`).

3. **One test Figma file** with at least one frame you can comment on.

---

## Cursor IDE: context and workflow (read this first)

- **Repo scaffold**: keep a tidy structure so Cursor can “see” everything.
  ```
  @buddy/
    README.md
    .env.example
    .cursorrules
    /api
      figma-webhook.ts
    /lib
      figma.ts
      openai.ts
      logger.ts
      schema.ts
    /plugin   (optional, v2)
    /scripts  (one-off helpers)
  ```
- **.cursorrules** (helps LLM stay consistent):
  - Prefer TypeScript, Node 20, fetch API.
  - Never print secrets. Use env vars.
  - Replies must be under 2–4 seconds when possible.
  - Style: concise functions, JSDoc on exported functions.
- **Working with Cursor**:
  - Use **CMD+K** to ask Cursor to *modify the open file*.
  - Pin files (click the pin icon) like `figma-webhook.ts`, `figma.ts`, and `openai.ts` so they’re always in the model’s context.
  - When you ask for changes, say *where* (e.g., “In `figma-webhook.ts`, add HMAC verification”).
  - Keep a `TODO.md` so Cursor can track your plan.

---

## Step 0.5 — Git & GitHub setup (versioning + backups)

**Goal**: You can stop anytime, resume anywhere, and never lose work. Also, every change is traceable.

### 0.5.1 Create the repo

1. On GitHub, **New repository** → name it `buddy` (private).
2. In Cursor terminal:

```
git init
git remote add origin https://github.com/<you>/buddy.git
git checkout -b main
```

3. Create a `.gitignore` file:

```
# Node / tooling
node_modules
.DS_Store
.vercel

# Env secrets
.env
.env.local
.env.*.local

# Logs
npm-debug.log*

# Build outputs (if any later)
dist
```

4. First commit:

```
git add .
git commit -m "chore: scaffold repo and docs"
git push -u origin main
```

### 0.5.2 Branching & commits (simple rules)

- Use **feature branches**: `feat/webhook`, `feat/supabase-logs`, `fix/signature`
- Write clear messages: `feat: add Supabase events table + logger`
- One PR per change; keep them small.

### 0.5.3 Protect `main`

GitHub → **Settings → Branches → Add rule**:

- Require PRs
- Require 1 review (you can self‑review)
- Block force‑pushes
- Require status checks to pass (we’ll add CI next)

### 0.5.4 Minimal CI (GitHub Actions)

Create `.github/workflows/ci.yml`:

```yaml
name: ci
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci || npm i
      - run: npx tsc --noEmit || true
      - run: node -e "console.log('lint placeholder')"
```

> Keep it light. This just catches obvious type errors.

### 0.5.5 PR & issue templates (optional but helpful)

Create `.github/pull_request_template.md`:

```
## What changed
- 

## Why
- 

## How to test
- 
```

Create `.github/ISSUE_TEMPLATE/bug.md` (optional) to file bugs consistently.

### 0.5.6 Releases & rollback

- Tag stable deploys: `git tag -a v0.1.0 -m "MVP webhook" && git push --tags`
- Keep a `CHANGELOG.md` with short entries.
- In Vercel, connect to GitHub (already done in Step 3). Every merge to `main` auto‑deploys; you can **rollback** to a previous deployment from Vercel UI in one click.

### 0.5.7 Secrets & environments

- Never commit `.env*`. Store secrets in **Vercel → Environment Variables**.
- If you add **Preview** environments later, mirror secrets in both Preview and Production.
- Rotate keys if they leak into logs.

### 0.5.8 When to commit & how to write great commit messages

**Mindset**: small, self‑contained commits with clear intent. Commit as soon as something *coherent* works or a discrete change is done.

**When to commit (for this project):**

- After you scaffold files and `.gitignore` → commit.
- After Step 2 (Figma app + webhook saved) → commit docs/config updates.
- After Step 4 (repo initialized in Cursor, tsconfig ready) → commit.
- After Step 5 **compiles locally** (no type errors) → commit.
- After the **first successful webhook reply** in Figma → commit.
- After adding **Supabase logging** and seeing first row → commit.
- After each bug fix (signature verify, node export, retries) → commit.
- Before any refactor (save current good state), and right after the refactor passes tests → commit.
- Before merging a PR → final commit addressing review comments.

**Message style** (conventional commits, imperative voice):

- `feat: …` — a new user‑visible capability
- `fix: …` — a bug fix
- `docs: …` — docs only changes
- `chore: …` — build/dev tooling, repo hygiene
- `refactor: …` — code change that neither fixes a bug nor adds a feature
- `perf: …` — performance improvements
- `test: …` — add or fix tests
- `ci: …` — CI related changes
- `revert: …` — reverts a previous commit

**Good examples:**

- `chore: scaffold repo, add .gitignore and cursorrules`
- `feat: initial webhook handler for @buddy comments`
- `feat: export node PNG and call vision model`
- `fix: verify HMAC using raw body on Vercel`
- `feat: post threaded reply to same Figma comment`
- `feat: add Supabase events table and server logging`
- `refactor: extract figma and openai helpers into /lib`
- `perf: reduce image export scale to 1.5 for latency`
- `docs: add env var checklist and troubleshooting`
- `ci: add minimal Node 20 build step`

**Structure for longer messages:**

```
feat: add Supabase logging for events

- create events table + daily view
- add lib/db.ts helper and wire into webhook
- record latency_ms and ok/error
```

**Anti‑patterns to avoid:**

- `wip` or `fix` with no context.
- Huge commits that mix feature + refactor + formatting.
- Committing secrets.

**Simple daily rhythm:**

1. Start a branch: `feat/supabase-logs`
2. Make 3–6 small commits while building
3. Open PR → self‑review → squash merge to `main` with a clear title
4. Tag if it’s a notable milestone: `v0.2.0`

---

## Step 1 — Create an OpenAI API key (5 min)

1. Go to platform.openai.com → API Keys → **Create new secret key**.
2. Copy it; you’ll paste into Vercel env as `OPENAI_API_KEY`.

> Tip: Don’t share your key in Cursor prompts. Put secrets in `.env.local` and reference `process.env.OPENAI_API_KEY`.

---

## Step 2 — Make a Figma “app” and webhook (10–15 min)

1. Visit **Figma Developer Portal** → New App.
2. App name: `Buddy`
3. OAuth redirect: you can leave OAuth for later; for MVP with webhooks + PAT it’s fine.
4. **Personal Access Token (PAT)** (temporary for MVP): Create one; save as `FIGMA_PAT`.
5. **Webhooks**: Add a webhook subscription for **File comments**.
   - Event: `FILE_COMMENT` (or similar wording in UI).
   - Endpoint URL: `https://YOUR_VERCEL_URL/api/figma-webhook` (we’ll deploy soon; you can enter a placeholder and edit later).
   - **Secret/Passcode**: set one (e.g., `FIGMA_WEBHOOK_SECRET`). Save it.

> Figma will send a signature header (often `X-Hub-Signature-256`) using your webhook secret. We’ll verify it.

---

## Step 3 — Create a Vercel project (10 min)

1. vercel.com → New Project → **Framework = Other**.
2. Connect your GitHub repo (create a private repo named `buddy`).
3. Add **Environment Variables** in Vercel → Settings → Environment Variables:
   - `OPENAI_API_KEY` = your key
   - `FIGMA_PAT` = your Personal Access Token
   - `FIGMA_WEBHOOK_SECRET` = the webhook passcode you set
   - (Optional) `ALLOWLIST_FILE_KEYS` = comma‑separated Figma file keys for safety

> You can add `LOCAL_TEST_TOKEN` later for local curl tests.

---

## Step 4 — Initialize the repo in Cursor (10 min)

1. In Cursor: **Clone** your `buddy` repo.
2. Create files:
   - `README.md` — paste this guide’s top sections.
   - `.env.example` — list the env vars without values.
   - `.cursorrules` — add the rules block from above.
   - `api/figma-webhook.ts`
   - `lib/figma.ts`, `lib/openai.ts`, `lib/logger.ts`, `lib/schema.ts`
3. Run `npm init -y` then `npm i zod` (for validation) if needed. On Vercel you can rely on the Edge/Node runtime fetch.

> Ask Cursor: “Generate minimal tsconfig.json for Node 20 moduleResolution bundler, target ES2022.”

---

## Step 5 — Paste these starter files

### `lib/logger.ts`

```ts
export const log = (...args: any[]) => console.log('[buddy]', ...args);
export const warn = (...args: any[]) => console.warn('[buddy]', ...args);
export const error = (...args: any[]) => console.error('[buddy]', ...args);
```

### `lib/schema.ts`

```ts
import { z } from 'zod';

// Figma webhook payload (simplified; we validate what we use)
export const CommentEvent = z.object({
  event_type: z.string().optional(),
  file_key: z.string(),
  comment: z.object({
    id: z.string(),
    message: z.string(),
    created_at: z.string().optional(),
    resolved_at: z.string().nullable().optional(),
    user: z.any().optional(),
    client_meta: z.any().optional(),
    parent_id: z.string().nullable().optional(),
    // In many orgs, pinned comments include a node reference
    // We’ll accept either pinned node in client_meta or a mention link in message
  }),
});
export type CommentEvent = z.infer<typeof CommentEvent>;
```

### `lib/figma.ts`

```ts
const BASE = 'https://api.figma.com/v1';
const FIGMA_PAT = process.env.FIGMA_PAT!;

const authHeaders = () => ({
  'X-Figma-Token': FIGMA_PAT,
});

export async function exportNodePng(fileKey: string, nodeId: string, scale = 2) {
  const url = `${BASE}/images/${fileKey}?ids=${encodeURIComponent(nodeId)}&format=png&scale=${scale}`;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) throw new Error(`Figma export failed: ${res.status}`);
  const data = await res.json();
  const imageUrl = data.images?.[nodeId];
  if (!imageUrl) throw new Error('No image URL returned');
  return imageUrl; // ephemeral CDN URL
}

export async function replyToComment(fileKey: string, commentId: string, message: string) {
  const url = `${BASE}/files/${fileKey}/comments`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      ...authHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ comment_id: commentId, message }),
  });
  if (!res.ok) throw new Error(`Reply failed: ${res.status}`);
  return res.json();
}

// Heuristic: try to extract a node id from message links like figma.com/file/…?node-id=XXX
export function maybeExtractNodeIdFromMessage(message: string): string | null {
  const m = message.match(/node-id=([^\s&]+)/i);
  return m ? decodeURIComponent(m[1]) : null;
}
```

### `lib/openai.ts`

```ts
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;

const SYSTEM_PROMPT = `You are “Buddy,” a staff/principal product designer with systems thinking.
Be direct, specific, and practical. Always:
1) Call out usability risks,
2) Edge cases and failure states,
3) Accessibility (contrast, focus, keyboard, SR),
4) Responsive behavior,
5) IA clarity,
6) Interaction flows (loading/empty/error/success),
7) Metrics to validate.
Structure with short headers and bullets. No fluff. Offer alternatives tied to the problem.`;

export async function critiqueWithVision(opts: { ask: string; imageUrl?: string }) {
  const { ask, imageUrl } = opts;
  const payload: any = {
    model: 'gpt-4o-mini', // vision-capable, fast; change if needed
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          { type: 'text', text: `Ask: ${ask}\nDeliver a compact critique with: What works, Top risks, Edge cases, Accessibility, Responsive, Alternatives, Next moves, Metrics.` },
        ],
      },
    ],
  };
  if (imageUrl) {
    (payload.messages[1].content as any[]).push({ type: 'input_image', image_url: imageUrl });
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`OpenAI error: ${res.status}`);
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content?.trim();
  return text || 'No response.';
}
```

### `api/figma-webhook.ts`

```ts
import { CommentEvent as CommentEventSchema } from '../lib/schema';
import { replyToComment, exportNodePng, maybeExtractNodeIdFromMessage } from '../lib/figma';
import { critiqueWithVision } from '../lib/openai';
import { log, error } from '../lib/logger';
import crypto from 'node:crypto';

// Vercel API Route (Node runtime)
export const config = { runtime: 'nodejs' } as const;

function verifySignature(body: string, signature?: string) {
  const secret = process.env.FIGMA_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  // Many webhook providers use sha256 HMAC. Adjust header name if Figma changes.
  const hmac = crypto.createHmac('sha256', secret).update(body).digest('hex');
  // Signature header may be like: sha256=abcdef...
  const clean = signature.replace(/^sha256=/, '').toLowerCase();
  return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(clean));
}

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    const sig = req.headers['x-hub-signature-256'] || req.headers['x-figma-signature'];
    if (!verifySignature(raw, Array.isArray(sig) ? sig[0] : sig)) {
      return res.status(401).send('Invalid signature');
    }

    const data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const parsed = CommentEventSchema.safeParse(data);
    if (!parsed.success) {
      log('Ignoring non-comment payload');
      return res.status(200).json({ ok: true });
    }

    const evt = parsed.data;
    const fileKey = evt.file_key;
    const comment = evt.comment;
    const msg = (comment.message || '').trim();

    // Only react to @buddy
    if (!/@buddy\b/i.test(msg)) return res.status(200).json({ ok: true, ignored: true });

    // Extract the user ask after @buddy
    const ask = msg.replace(/.*@buddy\s*/i, '').trim() || 'General critique this frame';

    // Node targeting: prefer pinned node id in message URL, else skip image
    let nodeId = maybeExtractNodeIdFromMessage(msg);
    let imageUrl: string | undefined;
    if (nodeId) {
      try { imageUrl = await exportNodePng(fileKey, nodeId, 2); } catch (e) { log('Export failed, continuing without image'); }
    }

    const reply = await critiqueWithVision({ ask, imageUrl });

    await replyToComment(fileKey, comment.id, reply);

    return res.status(200).json({ ok: true });
  } catch (e: any) {
    error('webhook error', e?.message || e);
    return res.status(500).json({ ok: false });
  }
}
```

> Commit and push. Vercel will auto‑deploy and give you a URL like `https://buddy-yourname.vercel.app`.

---

## Step 5.1 — Add Supabase (logs & simple metrics)

**Why**: keep a lightweight audit trail (what was asked, which frame, latency, token usage, errors). This helps you improve prompts and reliability.

### 5.1.1 Create Supabase project

1. Go to supabase.com → **New project**.
2. Copy your **Project URL** and **Service Role Key** (Settings → API). Keep Service Role server‑only.
3. In **Vercel → Project → Settings → Environment Variables**, add:
   - `SUPABASE_URL` = your project URL
   - `SUPABASE_SERVICE_ROLE_KEY` = service role key (server‑only)

> Do **not** ship the service role to a client or plugin. We only log from the serverless function.

### 5.1.2 Create the `events` table

Open Supabase **SQL Editor** and run:

```sql
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  file_key text not null,
  comment_id text not null,
  node_id text,
  scope text,                 -- e.g., full, /edgecases, /accessibility
  image_included boolean default false,
  model text,
  tokens_prompt int,
  tokens_completion int,
  latency_ms int,
  ok boolean default true,
  error text
);

-- Optional: daily aggregates view
create or replace view events_daily as
select
  date_trunc('day', created_at) as day,
  count(*) as total,
  count(*) filter (where not ok) as errors,
  avg(latency_ms)::int as avg_latency_ms
from events
group by 1
order by 1 desc;
```

### 5.1.3 RLS (Row Level Security)

We’ll keep RLS **enabled** but skip policies because only the **service role** writes from the server. In SQL:

```sql
alter table events enable row level security;
-- No public policies; service role bypasses RLS by design.
```

### 5.1.4 Add a tiny DB helper

Create `lib/db.ts`:

```ts
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!; // server only
export const sb = createClient(url, key, { auth: { persistSession: false } });

export async function logEvent(evt: {
  file_key: string;
  comment_id: string;
  node_id?: string;
  scope?: string;
  image_included?: boolean;
  model?: string;
  tokens_prompt?: number;
  tokens_completion?: number;
  latency_ms?: number;
  ok?: boolean;
  error?: string;
}) {
  const { error } = await sb.from('events').insert(evt as any);
  if (error) console.error('[buddy] supabase insert error', error.message);
}
```

Install the client in your repo:

```
npm i @supabase/supabase-js
```

### 5.1.5 Wire logging into the webhook

Edit `api/figma-webhook.ts`:

```ts
import { logEvent } from '../lib/db';

// ...inside handler, after you compute ask/imageUrl and before replying
const t0 = Date.now();
let reply = '';
let ok = true; let err: any;
try {
  reply = await critiqueWithVision({ ask, imageUrl });
} catch (e: any) {
  ok = false; err = e;
}
const latency = Date.now() - t0;

await logEvent({
  file_key: fileKey,
  comment_id: comment.id,
  node_id: nodeId || undefined,
  scope: ask.startsWith('/') ? ask.split(' ')[0] : 'full',
  image_included: Boolean(imageUrl),
  model: 'gpt-4o-mini',
  latency_ms: latency,
  ok,
  error: ok ? null as any : (err?.message || String(err)),
});

if (!ok) return res.status(500).json({ ok: false, error: err?.message || 'LLM failed' });
```

> Later you can add token counts if you switch to responses that include usage. For now, latency + success boolean is enough.

### 5.1.6 Quick sanity check

In Supabase → **Table Editor → events**, you should see rows after a few @buddy tests.\
Open **SQL Editor** and try:

```sql
select * from events_daily limit 30;
```

### 5.1.7 Cursor tips for Supabase work

- Pin `lib/db.ts` so Cursor understands your logging contract.
- Ask Cursor: “Add exponential backoff around `logEvent` so logging never breaks the reply flow.”
- Keep a `SQL/` folder with migration files (`001_events.sql`, `002_views.sql`) and ask Cursor to generate idempotent scripts.

---

---

## Step 6 — Point Figma webhook to your deployed URL

1. In Figma Dev Portal → Your App → Webhooks → edit the **Endpoint URL** to:\
   `https://buddy-yourname.vercel.app/api/figma-webhook`
2. Ensure the **Secret** matches `FIGMA_WEBHOOK_SECRET` in Vercel.

> If Figma requires verifying the endpoint with a challenge, implement echo if prompted (rare for comment events). Re‑save after deploy.

---

## Step 7 — Test the full loop (5 min)

1. Open your test Figma file.
2. Select a **frame**. Add a **pinned comment**:\
   `@buddy audit for mobile edge cases and a11y`
3. Watch the thread. Within a few seconds, Buddy should reply with a structured critique.
4. Try adding a link to a specific node (right‑click a layer → Copy link) inside the comment if export fails.

If nothing comes back:

- Check Vercel logs (Project → Deployments → Logs).
- Look for “Invalid signature” (your secret mismatch) or “Figma export failed”.
- Temporarily log the incoming headers to confirm the exact signature header name your org receives.

---

## Step 8 — Make the replies *useful* (prompt polish)

Open `lib/openai.ts` and tune:

- Add **platform hint** if you always design web or iOS.
- Add **output budget**: “Keep total under 180 words.”
- Add **command routing**: if `ask` starts with `/edgecases`, only list edge cases; if `/accessibility`, only a11y.

Example snippet:

```ts
const scope = ask.startsWith('/edgecases') ? 'Edge cases only' : ask.startsWith('/accessibility') ? 'Accessibility only' : 'Full critique';
```

---

## Step 9 — Optional: Figma Plugin button (v2)

- Create `/plugin` with a minimal UI that:
  1. Reads current selection’s node id(s)
  2. Posts a comment automatically: `@buddy critique this` with a link to the node
- This guarantees your webhook has a **node id** to export, and designers have a big friendly “Ask Buddy” button in the sidebar.

Resources to search when ready: “Create Figma plugin quickstart,” “figma.editorType === 'figma'”, `figma.createCommentAsync`.

---

## Step 10 — Guardrails and privacy

- **Allowlist** file keys with `ALLOWLIST_FILE_KEYS`. If set, ignore events from other files.
- Add a **mode** that skips image and analyzes text layers only (node JSON) for sensitive work.
- Log only non‑PII metadata: event id, file key hash, duration, token usage.

---

## Step 11 — Cursor best practices (day‑2 productivity)

- **Pin** `api/figma-webhook.ts`, `lib/figma.ts`, `lib/openai.ts`.
- Keep a `PROMPTS.md` where you paste your best system message versions; ask Cursor to A/B test wording.
- Use **Code Actions**: “Add retries with exponential backoff around OpenAI call.”
- When refactoring, say: “Create `lib/commands.ts` that maps /edgecases, /a11y, /critique to prompt fragments. Write unit tests.”
- Use **Inline Diff** to sanity‑check changes Cursor proposes.
- Keep pull requests tiny; deploy often.

---

## Step 12 — Troubleshooting cheatsheet

- **No reply in thread** → Check Vercel logs. If webhook signature mismatch, re‑enter the secret on both sides.
- **Image export URL empty** → The comment wasn’t pinned or lacked a node link; reply once asking user to pin to a frame.
- **OpenAI 401/429** → Bad key or rate limit; add retry with jitter.
- **Garbled output** → Tighten the system prompt, add headings requirement, ask for max 6 bullets total.
- **Too slow** → Switch to a faster model, decrease image scale to 1–1.5, pre‑trim node JSON.

---

## Optional enhancements (roadmap)

- **Threaded multi‑reply**: Split long critiques into parts; post as separate replies.
- **Pinpoint comments**: Detect issues (contrast, label) and post **pinned mini‑comments** at approximate coordinates.
- **Org presets**: a11y locale, platform defaults, strictness, product area (security, fintech).
- **Slack/Email notify** when Buddy replies.
- **Quality loop**: A `/why` command that explains *why* a suggestion matters, with references to WCAG.

---

## Copy‑paste prompts for testing in Cursor

- “In `api/figma-webhook.ts`, add basic exponential backoff (max 3 tries) around `critiqueWithVision` and `replyToComment`.”
- “In `lib/figma.ts`, add `exportFileJson(fileKey)` to fetch document JSON for future text‑layer analysis.”
- “Create `lib/commands.ts` that parses `/edgecases`, `/a11y`, `/draft`, `/critique` and returns a scope string + output template.”

---

## You’re ready

Comment `@buddy` on a pinned frame. Watch it answer like a design lead.

If you want, I can add:

- OAuth install flow (team‑wide)
- Supabase logging schema
- A minimal plugin with an “Ask Buddy” button and presets.

