# SESSION START PROTOCOL — EXECUTE THIS BEFORE ANYTHING ELSE

1. Read this entire file top to bottom
2. Read tasks/todo.md — show current open/pending tasks
3. Read tasks/lessons.md — review all past lessons
4. Confirm out loud: "CLAUDE.md loaded. todo.md and lessons.md reviewed. Ready."
5. Do NOT begin any work until steps 1–4 are confirmed

VIOLATIONS: If I skip todo.md, lessons.md, or any step above — stop me immediately.
Point to the exact rule I broke. Do not apologize. Fix it on the spot.

---

## REQUIRED: Task Management

REQUIRED: Before any task — write plan to tasks/todo.md with checkable items
REQUIRED: Check in with user before starting implementation
REQUIRED: Mark items complete in todo.md as you go
REQUIRED: Add review section to tasks/todo.md before committing
REQUIRED: After ANY user correction — update tasks/lessons.md immediately, before continuing
REQUIRED: At session end — both files must reflect everything done this session

NEVER commit without todo.md review section written
NEVER ignore a correction without logging it to lessons.md
NEVER start work without confirming this file was read in full

---

## REQUIRED: Quality Gates

REQUIRED order: Edit → Verify → Commit. Never commit then verify.
REQUIRED: Run the actual function/test and confirm output before committing
REQUIRED: One bug = one commit. Atomic fixes, clean git history.
REQUIRED: Run full CLAUDE.md audit on every file touched before committing
REQUIRED: After replace_all — immediately verify the constant declaration was not self-replaced

NEVER mark a task complete without proving it works
NEVER fix data without fixing the code that wrote it
NEVER audit only the main file — audit EVERY file changed this session

---

## Workflow Orchestration

### 1. Plan Mode Default
- Enter plan mode for ANY task with 3+ steps or architectural decisions
- If something goes sideways: STOP and re-plan. Do not keep pushing.
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy
- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- One task per subagent for focused execution

### 3. Self-Improvement Loop
- After ANY correction from the user: update `tasks/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Review lessons.md at every session start

### 4. Verification Before Done
- Never mark a task complete without proving it works
- Run the actual endpoint/function and confirm output before committing
- Ask yourself: "Would a staff engineer approve this?"

### 5. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- Skip this for simple, obvious fixes — don't over-engineer

### 6. Autonomous Bug Fixing
- When given a bug report: just fix it. No hand-holding required.
- Trace the full path before fixing: input → processing → output
- Fix all broken links in one pass, not one at a time

## Core Principles
- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Only touch what's necessary. Avoid introducing bugs.

---


# Etsy Listing Optimizer — Project Plan

## Context
Build a web tool for the Etsy shop **MyHomeByMax** that connects to the Etsy API, pulls full listing data, performs keyword research, and generates actionable optimization recommendations to improve listing rankings.

**Shop:** https://www.etsy.com/shop/MyHomeByMax
**Local folder:** `/home/personal/projects/etsy`

**Etsy API v3 — confirmed writable fields (all require OAuth `listings_w` scope):**
- `PATCH /listings/{listing_id}` → title, tags (array of 13), description, price
- `POST /application/shops/{shop_id}/listings/{listing_id}/images` → image alt text (pass `listing_image_id` + `alt_text`; omit `overwrite` flag)
- `PUT /shops/{shop_id}/listings/{listing_id}/properties/{property_id}` → attributes

**Etsy API v3 — NOT writable / not available:**
- Keyword search volume — no endpoint exists
- Etsy autocomplete — not available via API
- Competitor transaction count / revenue — private
- Impression count / CTR — Etsy internal only
- Price — writable but requires explicit human approval before any PATCH

---

## Phase 1 — Core Features (Now)

### 1. Etsy API Connection & Auth
- OAuth 2.0 + PKCE flow to connect to Etsy API
- Secure token storage (access + refresh tokens)
- Auto-refresh tokens before expiry (1hr access, 90-day refresh)
- Secure login for the web app (simple username/password)

### 2. Download Full Listing Data
Pull and display all data for every listing in the shop:
- Title
- Description
- Tags (up to 13)
- Images (up to 10 per listing)
- Image alt text
- Price
- Quantity / inventory
- Category (taxonomy)
- Materials
- Shipping profile
- Processing time
- Who made / when made
- Styles
- Personalization settings
- View count (lifetime)
- Listing state (active/draft/inactive)
- URL

### 3. Keyword Research
- **Etsy autocomplete scraping** — pull search suggestions from Etsy's search bar for seed keywords
- **Competitor analysis** — use `findAllListingsActive` API endpoint to analyze top-ranking listings for target keywords (their titles, tags, descriptions)
- **AI-powered suggestions** — use Claude to analyze your listings vs competitors and suggest keyword improvements
- Display keyword ideas with context (which competitors use them, frequency)

### 4. Optimization Recommendations
For each listing, generate actionable recommendations:
- **Title optimization** — keyword placement, length, readability
- **Tag optimization** — missing high-value tags, redundant tags, tag diversity
- **Description optimization** — keyword usage, structure, completeness
- **Image alt-text optimization** — SEO-relevant alt text suggestions
- **Category/taxonomy check** — is the listing in the best category
- Score each listing (e.g., SEO score out of 100)
- Priority ranking: which listings need the most work

### 5. Web App with Secure Login
- Web-accessible dashboard
- Simple auth (username/password with hashed credentials)
- Dashboard showing all listings with optimization scores
- Detail view per listing with side-by-side current vs recommended

---

## Phase 2 — Intelligence Engine (Next)
1. **Tag Push Live** — PATCH /listings/{id} with full 13-tag array; already have copy button, add Push Live
2. **Title Push Live** — PATCH /listings/{id} with new title; already have copy button, add Push Live
3. **Description Push Live** — PATCH /listings/{id} with new description; already have copy button, add Push Live
4. **Attribute fill rate** — GET /seller-taxonomy/nodes/{taxonomy_id}/properties; diff vs listing properties; auto-write missing attributes
5. **Tag scoring improvements** — attribute duplicate detection, single-word tag replacement with multi-word phrases
6. **KPI panel** — compute per listing: revenue 30d, conversion proxy, favorites/views ratio, sales velocity, listing age, days until expiry, tag completeness
7. **Photo benchmarking** — competitor avg photo count vs yours; flag if < 5 or below category avg
8. **Price analysis** — competitor price distribution (25th/75th percentile); underpriced/overpriced flags; margin formula; human approval required before any write

## Phase 3 — Future
- A/B testing framework
- Historical tracking & trend charts
- New entrant monitor (sort_on=created weekly pull)
- Favorites correlation analysis
- Scheduled re-analysis

---

## Tech Stack
- **Next.js 16** (React + API routes, App Router)
- **TypeScript**
- **Tailwind CSS** for styling
- **Simple JWT auth** (bcryptjs + jsonwebtoken, no NextAuth)
- **JSON files** for persistent config/data (no database)
- **Git** for version control
- **VPS** for hosting (persistent filesystem, running via `npm run start` + Cloudflare Tunnel)

## Setup
1. `npm install`
2. Fill in `.env.local` (ETSY_API_KEY, ETSY_SHARED_SECRET, ETSY_SHOP_ID, ETSY_REDIRECT_URI)
3. `npm run dev` → open http://localhost:3000
4. Visit `/api/etsy/connect` once to authorize OAuth (scope: `transactions_r listings_w`)
5. App served publicly via Cloudflare Tunnel at https://etsy.bornganic.com (Cloudflare Access: email OTP, bekker.igor@gmail.com only)

---

## GitHub Repo
https://github.com/igorbekker/etsy

## Key Files Structure
```
etsy/
├── CLAUDE.md
├── package.json
├── next.config.ts
├── .env.local                        # API keys (gitignored)
├── data/                             # JSON storage (gitignored)
│   ├── etsy-tokens.json              # OAuth tokens
│   ├── listing-keywords.json         # Per-listing target keywords (manual input)
│   ├── listing-recommendations.json  # Cached AI recommendations + competitor insights
│   └── change-log.json               # Push Live history (for Logs tab + revert)
├── src/
│   ├── middleware.ts                  # Pass-through (Cloudflare Access handles auth)
│   ├── app/
│   │   ├── page.tsx                  # Full app: Listings | Keywords | Logs | Glossary tabs
│   │   ├── layout.tsx
│   │   └── api/
│   │       ├── etsy/
│   │       │   ├── connect/route.ts          # OAuth redirect to Etsy
│   │       │   ├── callback/route.ts         # OAuth code exchange, token save
│   │       │   ├── status/route.ts           # { connected: boolean }
│   │       │   ├── listings/route.ts         # GET all active listings
│   │       │   ├── listings/[id]/route.ts    # GET single listing (with images)
│   │       │   ├── listings/[id]/images/[imageId]/route.ts  # PATCH alt text (Push Live)
│   │       │   ├── transactions/[id]/route.ts               # GET units sold
│   │       │   ├── recommendations/[id]/route.ts            # Generate AI recs
│   │       │   ├── recommendations/cache/[id]/route.ts      # Read/write recs cache
│   │       │   ├── score/[id]/route.ts       # SEO score for one listing
│   │       │   └── scores/route.ts           # SEO scores for all listings
│   │       ├── keywords/
│   │       │   ├── research/route.ts         # Competitor pull + tag frequency
│   │       │   └── ai-suggest/route.ts       # Claude keyword suggestions
│   │       ├── listing-keywords/[id]/route.ts  # Read/write per-listing target keywords
│   │       └── logs/route.ts                 # Read/append change log
│   └── lib/
│       ├── etsy-client.ts            # Etsy API wrapper (OAuth, listings, write ops)
│       ├── keyword-research.ts       # Competitor analysis + tag/title frequency mining
│       ├── ai-suggestions.ts         # Claude API: listing recs + keyword suggestions
│       ├── scoring.ts                # SEO scoring engine (title, tags, desc, images, metadata)
│       └── mock-data.ts              # Demo mode fallback data
└── tasks/
    ├── todo.md
    └── lessons.md
```

---

## Verification
1. Open https://etsy.bornganic.com → Cloudflare Access email OTP → dashboard loads all listings
2. Click a listing → Details / Images / SEO Score / AI Recs tabs all render
3. AI Recs tab: shows cached recommendations or "Sync AI" button to generate
4. Push Live (alt text) → Logs tab shows the change with revert option
5. Keywords tab → competitor tag frequency + AI keyword suggestions
