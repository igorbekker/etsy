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

## Phase 1 — Core Features (COMPLETE — 2026-02-25)

All Phase 1 features are shipped. See tasks/todo.md Archive section for details.

- Etsy API connection (OAuth PKCE for transactions_r + listings_w scope)
- Full listing data display (all fields)
- Keyword research (competitor analysis + AI suggestions)
- SEO scoring engine (title, tags, description, images, metadata)
- AI recommendations via Claude API
- Web app via Cloudflare Tunnel (https://etsy.bornganic.com), auth via Cloudflare Access email OTP

---

## Phase 2 — Intelligence Engine (COMPLETE — 2026-03-13)

**Core principle: all competitor analysis is keyword-driven.**
Every listing has primary + 2 secondary keywords in data/listing-keywords.json.
All competitor pulls use those keywords via `GET /listings/active?keywords={kw}&sort_on=score`.
If no keywords saved → prompt user. No title-word fallback for benchmarks.

**All Phase 2 features shipped:**

1. **Push Live** — PATCH /listings/{id} for title, tags, description; POST for alt text; PUT for attributes. All changes logged to data/change-log.json with revert support.

2. **Conversion Diagnostics** — Details tab, Performance section. Conversion proxy (transactions_30d / views × 100) and Save Rate (num_favorers / views × 100), color-coded with combined diagnosis line.

3. **Competitor Benchmarking Panel** — Benchmarks tab. Pulls top 100 competitors per keyword, deduped + sorted by num_favorers, takes top 30. 4 metrics: price position (range bar), demand gap, tag coverage (X/20 consensus tags), photo count. Cached 24h in data/listing-benchmarks.json.

4. **Attribute Fill Rate** — AI Recs tab, Attributes section. Diffs taxonomy properties vs filled properties, shows gaps with suggested values, Apply button per attribute. Taxonomy cached 30d.

5. **Recommendation Checklist** — AI Recs tab, above Competitor Insights. Tracks 7 optimization items per listing (Tags, Attributes, Title, Description, Alt Text, Photos, Price). Auto-checked when Push Live / Apply succeeds. Photos + Price are manual checkboxes. Persisted in data/listing-checklist.json across sessions and recs regeneration.

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
- **No app-level auth** — Cloudflare Access (email OTP) is the sole gate; middleware.ts is a pass-through
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
├── data/                             # JSON storage (all gitignored)
│   ├── etsy-tokens.json              # OAuth tokens (transactions_r + listings_w)
│   ├── listing-keywords.json         # Per-listing target keywords (manual input)
│   ├── listing-recommendations.json  # Cached AI recommendations + competitor insights
│   ├── listing-benchmarks.json       # Cached competitor benchmarks (24h TTL)
│   ├── listing-checklist.json        # Per-listing optimization checklist state
│   ├── taxonomy-properties.json      # Cached Etsy taxonomy attributes (30d TTL)
│   └── change-log.json               # Push Live history (for Logs tab + revert)
├── src/
│   ├── types.ts                      # ALL shared interfaces and type aliases (single source of truth)
│   ├── middleware.ts                  # Pass-through (Cloudflare Access handles auth)
│   ├── app/
│   │   ├── page.tsx                  # Dashboard shell only (~300 lines): layout, listing list, top-tab routing
│   │   ├── layout.tsx
│   │   └── api/
│   │       ├── checklist/[id]/route.ts          # GET/POST per-listing checklist state
│   │       ├── etsy/
│   │       │   ├── connect/route.ts             # OAuth redirect to Etsy
│   │       │   ├── callback/route.ts            # OAuth code exchange, token save
│   │       │   ├── status/route.ts              # { connected: boolean }
│   │       │   ├── listings/route.ts            # GET all active listings
│   │       │   ├── listings/[id]/route.ts       # GET single listing; PATCH title/tags/description
│   │       │   ├── listings/[id]/images/[imageId]/route.ts   # POST alt text (Push Live)
│   │       │   ├── listings/[id]/attributes/route.ts         # GET attribute fill rate + gaps
│   │       │   ├── listings/[id]/attributes/[propertyId]/route.ts  # PUT single attribute
│   │       │   ├── listings/[id]/benchmarks/route.ts         # GET competitor benchmarks (cached)
│   │       │   ├── transactions/[id]/route.ts               # GET units sold (OAuth)
│   │       │   ├── recommendations/[id]/route.ts            # Generate AI recs via Claude
│   │       │   ├── recommendations/cache/[id]/route.ts      # Read/write recs cache
│   │       │   ├── score/[id]/route.ts          # SEO score for one listing
│   │       │   └── scores/route.ts              # SEO scores for all listings
│   │       ├── keywords/
│   │       │   ├── research/route.ts            # Competitor pull + tag frequency
│   │       │   └── ai-suggest/route.ts          # Claude keyword suggestions
│   │       ├── listing-keywords/[id]/route.ts   # Read/write per-listing target keywords
│   │       └── logs/route.ts                    # Read/append change log; exports appendLogEntry()
│   ├── components/
│   │   ├── CopyButton.tsx            # Reusable: copy-to-clipboard button
│   │   ├── AttributeRow.tsx          # Reusable: attribute gap row with dropdown + Apply
│   │   ├── KeywordsPanel.tsx         # Top-level panel: keyword research tab
│   │   ├── LogsPanel.tsx             # Top-level panel: change logs tab
│   │   ├── GlossaryPanel.tsx         # Top-level panel: glossary/scoring rules tab
│   │   └── detail/
│   │       ├── DetailPanel.tsx       # Owns ALL listing detail state + async functions
│   │       └── tabs/
│   │           ├── DetailsTab.tsx    # Performance KPIs, description, tags, properties, keywords
│   │           ├── ImagesTab.tsx     # Image grid with alt text display
│   │           ├── SEOTab.tsx        # SEO score breakdown
│   │           ├── RecsTab.tsx       # Checklist, competitor insights, recs, push live, attributes
│   │           └── BenchmarksTab.tsx # Competitor benchmark metrics
│   └── lib/
│       ├── utils.ts                  # Pure display helpers: formatPrice, formatDate, scoreColor, scoreBadge, scoreBar
│       ├── etsy-client.ts            # Etsy API wrapper (OAuth, listings, write ops, taxonomy, attributes)
│       ├── keyword-research.ts       # Competitor analysis + tag/title frequency mining
│       ├── ai-suggestions.ts         # Claude API: listing recs + keyword suggestions
│       ├── scoring.ts                # SEO scoring engine (title, tags, desc, images, metadata)
│       └── mock-data.ts              # Demo mode fallback data
└── tasks/
    ├── todo.md
    └── lessons.md
```

---

## Development Standards

These rules govern all future development. Enforce them on every file touched.

### File Size
- `src/app/page.tsx` — Dashboard shell only. Must stay ≤ 350 lines. If it grows, extract a component.
- Tab components (`src/components/detail/tabs/`) — pure render, no state, ≤ 250 lines each.
- `DetailPanel.tsx` — may own state and async functions, but extract a new tab if any tab's JSX exceeds 250 lines.
- API routes — single responsibility, ≤ 80 lines. Extract shared logic to `src/lib/`.
- `src/lib/` files — no line limit, but split by concern. A lib file that does two unrelated things should be two files.

### Where Things Live
- **All TypeScript interfaces and type aliases** → `src/types.ts`. Never define types inline in a component file or route.
- **Pure display helpers** (format, color, badge functions) → `src/lib/utils.ts`. Import via `@/lib/utils`.
- **Reusable UI components** (used in 2+ places) → `src/components/`. PascalCase filename.
- **Tab content** (render-only, props-driven) → `src/components/detail/tabs/`. One file per tab.
- **Panel state + async functions** → `src/components/detail/DetailPanel.tsx` (or a new top-level panel component). Tabs receive everything via props — they own no state.
- **Shared server-side logic** → `src/lib/`. Import directly into routes — never HTTP-call your own server.

### Component Conventions
- Tab components are **pure render**: no `useState`, no `useEffect`, no `fetch`. All data and callbacks come via props.
- `DetailPanel` owns all listing-level state. Tabs are dumb display layers.
- Top-level panels (`KeywordsPanel`, `LogsPanel`, etc.) own their own state — they are self-contained.
- New panels go in `src/components/`, new tab slots go in `src/components/detail/tabs/` + wired in `DetailPanel.tsx`.

### Naming Conventions
- Components: `PascalCase` — `DetailPanel`, `RecsTab`, `CopyButton`
- Files: match the component name exactly — `DetailPanel.tsx`, `RecsTab.tsx`
- API routes: follow Next.js App Router convention — `route.ts` inside `[param]/` folders
- Exported server-side helpers: `camelCase` — `appendLogEntry`, `getValidToken`
- Constants: `SCREAMING_SNAKE_CASE` — `MAX_RETRIES`, `CHECKLIST_ITEMS`, `TOP_TABS`

### API Route Rules
- Never `fetch("http://localhost:3000/api/...")` from inside another route. Import the function directly.
- Every route handler validates inputs at the top, before any branching or logic.
- 429 retry loops use `MAX_RETRIES` constant — never recursive self-calls.
- All `JSON.parse()` on external data (AI responses, Etsy API) is wrapped in try-catch.

### Adding New Features
1. **New top-level tab** → add panel component in `src/components/`, add entry to `TOP_TABS` in `page.tsx`, add render block in Dashboard body.
2. **New detail tab** → add tab component in `src/components/detail/tabs/`, add entry to `TABS` in `DetailPanel.tsx`, add props interface, add render block in DetailPanel's tab content area.
3. **New type** → add to `src/types.ts`. Never define locally.
4. **New display helper** → add to `src/lib/utils.ts`.
5. **New API endpoint** → add `route.ts` under `src/app/api/`, add shared logic to `src/lib/` if reused.

---

## Verification
1. Open https://etsy.bornganic.com → Cloudflare Access email OTP → dashboard loads active listings (currently 3 active)
2. Click a listing → Details / Images / SEO Score / AI Recs / Benchmarks tabs all render
3. Details tab → Performance section shows Conversion Rate + Save Rate KPIs
4. Details tab → Target Keywords section (3 inputs, manual entry, saved on blur)
5. AI Recs tab → Optimization Checklist (7 items) + Competitor Insights + recommendations
6. AI Recs tab → Attributes section → "Check Attributes" → fill rate + gap rows with Apply buttons
7. Benchmarks tab → "Run Benchmark" (requires saved keywords) → 4 metric cards
8. Push Live any field → button goes orange → Pushed! (green) → Logs tab shows entry with Revert
9. Sync AI button (listings panel header) → generates recs for all uncached listings sequentially

**Note on listing count:** Only 3 listings show as active. The other 9 are inactive/draft on Etsy's side — check Etsy Shop Manager if this is unexpected. The API endpoint is `/listings/active` — draft/inactive listings do not appear.
