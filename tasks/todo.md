# Etsy Listing Optimizer — Todo

## Backlog — Bugs & Features

### Bugs
- [x] Images tab: listing images not displaying — fixed 2026-03-12 (batch API omits images; now fetches full listing on selection via /api/etsy/listings/[id])
- [x] AI Recs tab: recommendations never load — fixed 2026-03-12 (Claude was wrapping JSON in markdown fences; strip fences before JSON.parse in ai-suggestions.ts)

### Features
- [x] PRIORITY: Ground all AI recommendations in real keyword research — 2026-03-12
  - [x] Part 1: New API route GET/POST /api/listing-keywords/[id] — reads/writes data/listing-keywords.json — 2026-03-12
  - [x] Part 2: Keywords UI on Details tab — 3 manual text inputs (primary + 2 secondary), load on open, save on blur — 2026-03-12
  - [x] Part 3: Recommendations route — fetch target keywords, run performKeywordResearch, merge results, pass to Claude — 2026-03-12
  - [x] Part 4: Enrich Claude prompt with autocomplete suggestions, tag frequency, title keywords — 2026-03-12
- [x] Listing details page — Details tab: add target keywords field (1 primary + 2 secondary) per listing, persisted to a local JSON file — 2026-03-12
- [x] Listing details page — Details tab: shrink description block height by ~50% and make it scrollable — 2026-03-12
- [x] Listing details page — Details tab: views label updated to "views (lifetime)" — Etsy API confirmed: lifetime cumulative, updated nightly — 2026-03-12
- [x] Listing details page — Details tab: units sold — implemented via OAuth transactions_r; shows "X sold" in detail header; shows "Connect Etsy for sales data →" link when not connected — 2026-03-12
- [ ] Read full Etsy API docs and compile: all writable fields, useful data points for analysis, rate limits, endpoints relevant to listings optimization
- [x] AI Recs caching + Keyword Saved flash — 2026-03-12
  - [x] New GET/POST /api/etsy/recommendations/cache/[id] — reads/writes data/listing-recommendations.json — 2026-03-12
  - [x] fetchRecommendations: check cache first, skip Claude if hit; write to cache after Claude call — 2026-03-12
  - [x] Show "Generated: [date]" + "Regenerate Recommendations" button in AI Recs tab — 2026-03-12
  - [x] Keyword inputs: replace static "Saved" message with 2s flash on blur — 2026-03-12
- [ ] AI Recs: generate recommendations in the background on app load (all listings, not on-demand); user opens AI Recs tab and sees results already ready — no waiting
- [ ] AI Recs: per recommendation (title, tags, description, alt texts), add a checkbox to mark as accepted and a "Push Live" button — title/tags/description are manual-only (Etsy API v3 cannot write these, show copy-to-clipboard instead); alt text CAN be pushed via API, so "Push Live" is real for images
- [ ] AI Recs: deep competitor analysis for each listing — scrape 20–30 top competitors (ranked by sales velocity over 90 days); analyze what top competitors share in titles, descriptions, tags; detect probabilistic patterns I'm missing; also analyze listing images (count, size, quality, real vs AI); surface findings as actionable insights in the AI Recs tab
- [ ] DISCUSS: Recommendation checklist — each generated recommendation set creates a checklist (5–7 actionable items); system tracks which were implemented vs pending; surfaces unimplemented items on next visit. Needs design discussion before building — risk of overcomplication.

---

## Review — P1: Keyword-Grounded Recommendations 2026-03-12

### What was built
- **Part 1** — `src/app/api/listing-keywords/[id]/route.ts` (NEW): GET reads `data/listing-keywords.json` returning `{ primary, secondary }` for the listing; POST writes it. Creates `data/` dir if missing.
- **Part 2** — `src/app/page.tsx`: Added `keywords` state in `DetailPanel`, loads on listing open via GET, saves on input blur via POST. Three plain text inputs (Primary, Secondary 1, Secondary 2) displayed in a "Target Keywords" section on the Details tab below the Properties grid.
- **Part 3** — `src/app/api/etsy/recommendations/[id]/route.ts`: Now reads saved keywords before calling Claude. If primary keyword exists, runs `performKeywordResearch()` in parallel for all seeds, merges tagFrequency (sum counts), autocompleteSuggestions (dedupe), competitors (dedupe by listing_id). Falls back to title-word search if no keywords saved.
- **Part 4** — `src/lib/ai-suggestions.ts`: Updated `generateListingRecommendations` signature to accept optional `keywordData?`. Claude prompt now includes `## Keyword Research` section with autocomplete suggestions, top competitor tags by frequency, and top title words when keyword data is present.

### Verification
- `GET /api/listing-keywords/4414203319` → `{"primary":"","secondary":["",""]}` ✅
- `POST /api/listing-keywords/4414203319` with bookend keywords → `{"ok":true}` ✅
- `GET /api/listing-keywords/4414203319` → `{"primary":"bookend","secondary":["book holder","shelf decor"]}` ✅
- Build passes: 10 routes, 0 errors ✅

### Notes
- User clarified mid-plan: keywords are **manually entered by the user**, not auto-suggested by the system. Implementation matches this — inputs are blank text fields.
- Keywords state resets when a different listing is selected (useEffect on listing_id change).

---

## Review — AI Recs Caching + Keyword Save Flash 2026-03-12

### What was built
- **Cache route** — `src/app/api/etsy/recommendations/cache/[id]/route.ts` (NEW): GET reads `data/listing-recommendations.json` returning cached recommendations + timestamp; POST writes them. Creates `data/` dir if missing.
- **Cache logic in recommendations route** — `src/app/api/etsy/recommendations/[id]/route.ts`: Now checks cache on GET first; if hit, returns cached data with `cached: true`. After Claude call, writes result to cache.
- **UI — Generated date + Regenerate button** — `src/app/page.tsx`: AI Recs tab shows "Generated: [date]" when cached recommendations are displayed, plus a "Regenerate Recommendations" button that forces a fresh Claude call (POST to cache route to clear, then re-fetches).
- **Keyword save flash** — `src/app/page.tsx`: Keyword input `onBlur` now shows a 2-second "Saved ✓" flash instead of the previous static "Saved" message. Flash resets after 2s via `setTimeout`.

### Verification
- Build passes: 11 routes, 0 errors ✅
- Cache GET (miss) → `{"recommendations":null}` ✅
- Cache POST → `{"ok":true}`, persists all 6 recommendation fields + `generatedAt` ✅
- Cache GET (hit) → full data returned with correct shape ✅
- `fetchRecommendations()` reads cache first, sets `recsGeneratedAt`, returns early on hit ✅
- `fetchRecommendations(true)` skips cache check (Regenerate button) ✅
- Keyword save flash: `setTimeout` at 2000ms clears `keywordsSaved` ✅

---

## Review — Bug Fixes 2026-03-12

### Images bug
- Root cause: Etsy batch listings endpoint (`/shops/{id}/listings/active`) ignores `includes=images` — returns null regardless of format tested
- Fix: `selectListing()` in page.tsx now fires a parallel fetch to `/api/etsy/listings/{id}` (single-listing endpoint, which DOES return images) and merges into `enrichedListings` state
- DetailPanel uses enriched listing if available, falls back to base listing
- Verified: `curl http://localhost:3000/api/etsy/listings/4414203319` → 19 images returned ✅

### AI Recs bug
- Root cause: Claude was wrapping its JSON response in markdown code fences (` ```json ... ``` `), causing `JSON.parse()` to throw
- Fix: strip fences with `.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "")` before parsing — applied to both `generateListingRecommendations` and `generateKeywordSuggestions`
- Verified: `curl http://localhost:3000/api/etsy/recommendations/4414203319` → full recommendations returned, no error ✅
- Build passes: 8 routes, 0 errors ✅

---

## Review — Housekeeping 2026-03-12
- Archived Phase 1 completed tasks (2026-02-25) to Archive section ✅
- Merged lessons 4 + 10 into single rule; renumbered 11–18 → 10–17; total now 17 ✅
- todo.md restructured: Backlog at top, Open in-progress, Sessions, Archive ✅

---

## Session 2026-03-12 — Description shrink + Views label + Units sold research

### Plan
- [x] Description block: add max-h-40 + overflow-y-auto to description <p> in Details tab — 2026-03-12
- [x] Views label: update all 3 occurrences (detail header, listing card, competitor card) from "X views" → "X views (lifetime)" — 2026-03-12
- [x] Units sold: API research done — field does not exist on listing; requires OAuth transactions_r scope to sum transactions. Flagged to user. — 2026-03-12

---

## Session 2026-03-12 — Re-add OAuth for Transactions (units sold)

### Plan
- [x] etsy-client.ts: restore PKCE OAuth helpers (generatePKCE, getCodeVerifier, token load/save/refresh, getValidToken, oauthFetch) — scope: transactions_r only — 2026-03-12
- [x] Re-add src/app/api/etsy/connect/route.ts — redirects to Etsy OAuth URL — 2026-03-12
- [x] Re-add src/app/api/etsy/callback/route.ts — exchanges code for tokens, redirects to / — 2026-03-12
- [x] Re-add src/app/api/etsy/status/route.ts — returns { connected: boolean } — 2026-03-12
- [x] Add src/app/api/etsy/transactions/[id]/route.ts — paginates getShopReceiptTransactionsByListing, sums quantity, returns { units_sold } — 2026-03-12
- [x] Details tab UI: show "X sold" in header; if not connected show "Connect Etsy for sales data →" link — 2026-03-12
- [x] ETSY_REDIRECT_URI already set in .env.local — 2026-03-12

### Review — Re-add OAuth for Transactions 2026-03-12

#### What was built
- **etsy-client.ts** — Added PKCE helpers (`generatePKCE`, `getCodeVerifier`), token storage (`loadTokens`, `saveTokens`), auto-refresh (`refreshAccessToken`, `getValidToken`), `isConnected()`, `getAuthUrl()` (scope: `transactions_r`), `exchangeCodeForTokens()`, `oauthFetch()`, and `getListingUnitsSold()` (paginates transactions, sums `quantity`).
- **connect/route.ts** (NEW) — GET redirects to Etsy OAuth URL.
- **callback/route.ts** (NEW) — GET exchanges `code`+`state` for tokens, stores to `data/etsy-tokens.json`, redirects to `/`.
- **status/route.ts** (NEW) — GET returns `{ connected: boolean }`.
- **transactions/[id]/route.ts** (NEW) — GET returns `{ units_sold }` or `{ error: "not_connected" }` (401).
- **page.tsx** — `DetailPanel` fetches `/api/etsy/transactions/[id]` on listing open; shows "X sold" in header when connected, or "Connect Etsy for sales data →" link (points to `/api/etsy/connect`) when not.

#### Verification
- Build passes: 15 routes, 0 errors ✅
- `GET /api/etsy/status` → `{"connected":false}` ✅
- `GET /api/etsy/transactions/4447796840` → `{"error":"not_connected"}` (401) ✅
- `GET /api/etsy/connect` → 307 to `https://www.etsy.com/oauth/connect` with `scope=transactions_r`, `redirect_uri=https://etsy.bornganic.com/api/etsy/callback`, valid PKCE challenge ✅

#### Notes
- OAuth flow is only used for transactions. All listing reads continue to use API key only (no change to existing behaviour).
- User must visit `/api/etsy/connect` once to authorise and store tokens. After that, units sold loads automatically per listing.

---

## Review — Description Shrink + Views Label 2026-03-12

### What was built
- **Description block** — `src/app/page.tsx` line 259: added `max-h-40 overflow-y-auto` to description `<p>` — shrinks to ~160px, scrollable.
- **Views label** — Updated 3 occurrences: detail panel header (line 215), listing card in left panel (line 1110), competitor card in keywords panel (line 711). All now read "X views (lifetime)".

### Verification
- Build passes ✅
- Etsy API confirmed: `views` field is lifetime cumulative, tabulated nightly, active listings only.

---

## Review — OAuth Bug Fixes 2026-03-12

### What was built / fixed
- **Callback redirect fix** — `src/app/api/etsy/callback/route.ts`: Added `getPublicBaseUrl()` helper that reads `x-forwarded-proto` and `x-forwarded-host` headers to reconstruct the public URL. Previously used `request.url` which resolves to `localhost:3000` behind Cloudflare Tunnel, causing redirect to `localhost:3000/?connected=true` — unreachable from the browser.
- **oauthFetch header fix** — `src/lib/etsy-client.ts`: `oauthFetch` was sending `"x-api-key": ETSY_API_KEY` (key only). Etsy requires `key:secret` format even when using OAuth bearer token. Fixed to `"x-api-key": \`${ETSY_API_KEY}:${ETSY_SHARED_SECRET}\``.

### Verification
- Build passes: 15 routes, 0 errors ✅
- `GET /api/etsy/transactions/4447796840` → `{"units_sold":8}` ✅
- `GET /api/etsy/status` → `{"connected":true}` ✅

### Issues logged
- Committed callback fix without running /pre — violation logged as lesson 20 ✅

---

## Open — In Progress

- [ ] End-to-end test with real Etsy data in browser

---

## Session 2026-03-12 — Tab Navigation Redesign + Glossary

### Plan
- [x] Add top-level tab bar: Listings | Keywords | Logs | Glossary — 2026-03-12
- [x] Widen left listing panel from w-80 (320px) to w-[480px] (480px) — 2026-03-12
- [x] Inline KeywordsPanel component into page.tsx (move from /keywords/page.tsx) — 2026-03-12
- [x] Add Logs tab placeholder — 2026-03-12
- [x] Add Glossary tab with all scoring rules from scoring.ts — 2026-03-12
- [x] Delete src/app/keywords/page.tsx — 2026-03-12
- [x] Verify build passes: 8 routes, 0 errors — 2026-03-12

### Review — Tab Navigation + Glossary 2026-03-12
- Top-level tab bar: Listings | Keywords | Logs | Glossary — in header, orange underline on active ✅
- Left listing panel widened from w-80 (320px) to w-[480px] (480px) ✅
- KeywordsPanel inlined into page.tsx — same API calls, no separate page route ✅
- /keywords/page.tsx deleted — build confirms route is gone ✅
- Logs tab: placeholder card with Phase 2 note ✅
- Glossary tab: 7 sections covering all scoring rules with point values and score bands ✅
- Build passes: 8 routes, 0 errors ✅
- Known issues logged to backlog: images not displaying, AI recs not loading ✅

---

## Session 2026-03-12 — Environment Setup + Auth + UI Redesign

### Review — UI Redesign 2026-03-12
- Split-screen layout: left 320px listing list, right panel detail — ✅
- Selected listing highlighted with orange left border — ✅
- Detail panel: Details, Images, SEO Score, AI Recs tabs — ✅
- SEO score loads per-listing on click — ✅
- Color contrast fixed: gray-100/200/300 text on gray-800/900/950 backgrounds — ✅
- Build passes: 9 routes, 0 errors — ✅
- Fix crash: deleted stale /listings/[id]/page.tsx, rebuilt, restarted — ✅

### Review — OAuth Removal 2026-03-12
- etsy-client.ts rewritten: no OAuth, no token storage, API key only ✅
- connect/callback/status routes deleted ✅
- All isConnected() checks removed from 7 route files ✅
- "Connect Etsy" UI removed from dashboard ✅
- Verified: curl http://localhost:3000/api/etsy/listings → 12 real listings ✅
- Build passes: 9 routes, 0 errors ✅

### Review — Environment Setup 2026-03-12
- .env.local created with all required variables ✅
- etsy-client.ts fixed: x-api-key now sends `key:secret` (required by Etsy API) ✅
- Cloudflare Tunnel live: etsy.bornganic.com → localhost:3000 ✅
- Cloudflare Access: email OTP only, restricted to bekker.igor@gmail.com ✅
- App login page, /api/auth/*, auth.ts deleted — Cloudflare is sole auth gate ✅
- middleware.ts is now a pass-through ✅
- Build passes: 9 routes, 0 errors ✅

---

## Archive — Phase 1 (completed 2026-02-25)

### Phase 2 — Logs & Change Tracking (Future)
- [ ] Add top-level tab navigation: "Active Listings" | "Logs"
- [ ] Build change log data structure (JSON file per listing, or single log file)
  - Each entry: timestamp, listing_id, listing_title, field changed, old value, new value, source (AI rec / manual)
- [ ] When a recommendation is applied (title, description, tags, alt text), write a log entry
- [ ] Logs page: list all changes across all listings, grouped by listing
- [ ] Each log entry is collapsible — shows old vs new value side by side
- [ ] Revert button per entry — restores old value (via Etsy API write or manual instruction)
- [ ] Filter logs by listing, field type, date range

### 1. Etsy API Connection & Auth
- [x] OAuth 2.0 + PKCE flow
- [x] Secure token storage (JSON file)
- [x] Auto-refresh tokens before expiry
- [x] Secure login (JWT + bcrypt)
- [x] Middleware route protection

### 2. Download Full Listing Data
- [x] Fetch all shop listings via API
- [x] Display: title, description, tags, images, alt text
- [x] Display: price, quantity, category, materials
- [x] Display: shipping profile, processing time
- [x] Display: who/when made, styles, personalization
- [x] Display: view count, listing state, URL

### 3. Keyword Research
- [x] Etsy autocomplete scraping
- [x] Competitor analysis via findAllListingsActive
- [x] Tag frequency analysis from competitors
- [x] Title keyword analysis from competitors
- [x] AI-powered suggestions via Claude API
- [x] Keyword research page with UI

### 4. Optimization Recommendations
- [x] Title scoring (length, keywords, structure)
- [x] Tag scoring (count, multi-word, duplicates, diversity)
- [x] Description scoring (length, structure, keyword overlap)
- [x] Image scoring (count, alt text presence, alt text quality)
- [x] Metadata scoring (materials, styles, processing, personalization, category)
- [x] Overall SEO score out of 100
- [x] Dashboard shows SEO scores per listing
- [x] Priority ranking (worst scores first)
- [x] Side-by-side current vs recommended view (AI Recommendations tab)

### 5. Web App
- [x] Login page
- [x] Dashboard with listing grid
- [x] Listing detail page (Details, Images, SEO Score, AI Recommendations tabs)
- [x] Keyword research page
- [x] Etsy connect flow

### Phase 1 Review (2026-02-25)
- Build passes with zero errors (15 routes) ✅
- All API routes functional ✅
- SEO scoring engine covers title/tags/description/images/metadata ✅
- AI recommendations via Claude API (listing optimization + keyword suggestions) ✅
- Dashboard shows SEO score badges with priority sorting ✅
- Side-by-side current vs recommended for title, tags, description, alt text ✅
- CLAUDE.md verified line-by-line — all features match ✅
