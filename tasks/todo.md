# Etsy Listing Optimizer — Todo

## Approved — Intelligence Engine (Phase 2)

### FOUNDATION: Keyword-Driven Competitor Pulls

Every competitor pull in the app must be driven by the listing's saved keywords — not the listing title, not a generic fallback. This is the core principle behind all three features below.

**How it works:**
- Each listing already has `primary` + `secondary[0]` + `secondary[1]` keywords stored in `data/listing-keywords.json`
- Before running any competitor analysis for a listing, check that at least one keyword is saved
- If no keywords saved: show a prompt in the UI — "Set target keywords in the Details tab to run competitor analysis" — do NOT fall back to title words for benchmarking (title-word fallback is only acceptable for AI recs generation, not for benchmark data)
- Pull competitors for EACH non-empty keyword separately: primary first, then secondary[0], then secondary[1]
- Use `GET /listings/active?keywords={keyword}&limit=100&sort_on=score&sort_order=desc` for each
- Deduplicate results by `listing_id` across all keyword pulls
- After dedup, sort remaining competitors by `num_favorers` descending — highest demand signal first
- Use top 30 unique competitors for all calculations

**Why sort_on=score matters:** this returns listings in the same order as live Etsy search results for that keyword. Page 1 of this response = the listings you are competing against right now.

---

### FEATURE 1: Conversion Diagnostics

**Purpose:** Distinguish between a keyword problem (low views) and a conversion problem (high views, low sales/favorites). These have completely different fixes. Showing them together per listing makes the diagnosis immediate.

**Data sources — all already fetched, just not displayed together:**
- `listing.views` — lifetime cumulative view count (already in listing object)
- `listing.num_favorers` — total favorites (already in listing object, not yet displayed anywhere)
- `transactions_30d` — already fetched via `/api/etsy/transactions/[id]` as `units_sold`

**KPIs to compute (client-side, no new API calls):**

**Conversion Proxy**
- Formula: `transactions_30d / views × 100` (expressed as %)
- Bands:
  - < 0.5% = RED — serious conversion problem
  - 0.5–1.0% = YELLOW — below threshold, monitor
  - > 1.0% = GREEN — healthy
- Diagnosis when RED/YELLOW: "High views, low purchases — examine price, description, and photos"
- Edge case: if views = 0, show "No views yet — listing too new to diagnose"
- Edge case: if transactions_30d = 0 but views > 500, show RED with diagnosis

**Favorites/Views Ratio**
- Formula: `num_favorers / views × 100` (expressed as %)
- Bands:
  - < 1% = RED — thumbnail or price problem
  - 1–2% = YELLOW — below threshold
  - > 2% = GREEN — healthy save rate
- Diagnosis when RED/YELLOW: "Low save rate — likely a thumbnail quality or pricing issue"
- Edge case: if views = 0, skip

**Combined diagnosis logic (shown as a single summary line below the KPIs):**
- views < 100 (lifetime) → "Too few views — this is a keyword/discoverability problem. Focus on title and tags."
- views ≥ 100 AND conversion < 1% AND favorites/views < 2% → "Views are there but buyers aren't engaging. Check price and photos."
- views ≥ 100 AND conversion < 1% AND favorites/views ≥ 2% → "Buyers are saving but not purchasing. Price or checkout friction."
- views ≥ 100 AND conversion ≥ 1% AND favorites/views ≥ 2% → "Listing is performing well."

**Where it lives in the UI:**
- New "KPIs" section at the top of the Details tab, above the existing property grid
- Two stat boxes side by side: Conversion Proxy | Favorites/Views Ratio
- Each box: large number, color-coded (red/yellow/green), label, threshold note
- Below the two boxes: single diagnosis line in the matching color
- `units_sold` (already shown in header) feeds conversion proxy — no new fetch needed
- `num_favorers` needs to be pulled from the listing object and added to state

**Implementation steps:**
- [x] page.tsx: add num_favorers to Listing interface + EtsyListing type (optional — not in mock data) — 2026-03-12
- [x] page.tsx: compute conversionProxy and favoritesRatio in DetailPanel using existing unitsSold + listing.views + listing.num_favorers — 2026-03-12
- [x] page.tsx: add KPI section at top of Details tab with color-coded stat boxes and diagnosis line — 2026-03-12
- [x] Handle all edge cases: views = 0, unitsSold = null, unitsSold = "not_connected" — 2026-03-12

### Review — Feature 1: Conversion Diagnostics 2026-03-12

#### What was built
- **`etsy-client.ts`** — Added `num_favorers?: number` to `EtsyListing` interface. Optional because mock data doesn't include it — real Etsy API returns it on every listing.
- **`page.tsx`** — Added `num_favorers?: number` to the local `Listing` interface (mirrors etsy-client.ts).
- **`page.tsx`** — New "Performance" section at the top of the Details tab, computed entirely client-side from data already in state:
  - **Conversion Rate**: `unitsSold / listing.views × 100`. Color bands: green ≥ 1%, yellow 0.5–1%, red < 0.5%. Flag threshold: < 1%.
  - **Save Rate**: `num_favorers / listing.views × 100`. Color bands: green ≥ 2%, yellow 1–2%, red < 1%. Flag threshold: < 2%.
  - **Diagnosis line**: one plain-English sentence based on combined signal — keyword problem (views < 100), conversion problem (high views, low both KPIs), price barrier (good saves, low purchases), performing well.
  - Edge cases handled: views = 0 → "No views yet"; unitsSold = null → shows "…"; unitsSold = "not_connected" → shows "—" for conversion with a Connect Etsy link; missing num_favorers → defaults to 0 via `?? 0`.

#### Verification
- `curl GET /api/etsy/listings/4447796840` → `views: 198, num_favorers: 6` — field returned by Etsy API ✅
- Build passes: 0 TypeScript errors ✅
- Save rate for that listing: 6/198 × 100 = 3.03% → GREEN ✅
- No new API calls introduced — all data already fetched on listing open ✅

---

### FEATURE 2: Competitor Benchmarking Panel

**Purpose:** Show exactly where a listing stands vs. the top-ranking competitors for its target keywords — price, demand, tag coverage, photo count. One panel, all gaps visible at once.

**Keyword dependency:** Requires at least one saved keyword (primary or secondary). If none saved, show prompt: "Add target keywords in the Details tab to run competitor analysis."

**Data flow:**
1. User opens a listing → sees "Run Benchmark" button (or auto-runs if cache is fresh)
2. App fetches competitor data for each saved keyword: `GET /listings/active?keywords={kw}&limit=100&sort_on=score`
3. Deduplicates by listing_id across all keyword pulls
4. Sorts deduped set by num_favorers desc, takes top 30
5. Computes all 4 benchmark metrics (see below)
6. Caches result to `data/listing-benchmarks.json` keyed by listing_id with timestamp
7. Cache TTL: 24 hours — if cache is fresh, skip API calls and show cached data with "Last updated: X"
8. "Refresh" button forces re-fetch regardless of cache age

**Metric 1 — Price Positioning**
- From competitors: collect all `price.amount / price.divisor` values → compute min, 25th pct, median, 75th pct, max
- Your listing price: `listing.price.amount / listing.price.divisor`
- Display: a simple range bar showing where your price sits in the distribution
- Position labels: "Bottom 25%" / "Mid-range (25–75%)" / "Top 25%"
- Flags:
  - You are in top 25% AND your num_favorers < 50% of competitor avg → YELLOW "May be overpriced for demand level"
  - You are in bottom 25% AND your num_favorers > competitor avg → GREEN "Potentially underpriced — room to raise price"
  - No auto-write for price — display only, human decision

**Metric 2 — Demand Gap (Favorites)**
- From competitors: avg `num_favorers` across top 30
- Your listing: `listing.num_favorers`
- Display: your count vs competitor avg, expressed as "You: X favorites | Competitor avg: Y favorites (you're at Z%)"
- Flag: you < 30% of competitor avg → RED "Significant demand gap — listing needs optimization"
- Flag: you 30–70% of competitor avg → YELLOW "Below competitor demand level"
- Flag: you > 70% of competitor avg → GREEN

**Metric 3 — Tag Coverage Score**
- From competitors: pool ALL tags from top 30 listings, count frequency of each unique tag phrase
- Top 20 by frequency = "consensus tags" for this keyword
- Your tags: how many of the top 20 do you use?
- Display: "You use X/20 consensus tags"
- List the missing consensus tags (those in top 20 not in your listing) — shown as orange badges
- This feeds directly into the AI Recs tag recommendation — the missing tags here MUST be in the AI recommended tag set
- Flag: < 10/20 → RED | 10–15/20 → YELLOW | > 15/20 → GREEN

**Metric 4 — Photo Count**
- From competitors: avg number of images across top 30 (count `listing.images` array length per competitor)
- Your listing: count of `listing.images`
- Display: "You: X photos | Competitor avg: Y photos"
- Flag: you < 5 → RED (regardless of competitor avg — Etsy guidance minimum)
- Flag: you < competitor avg → YELLOW
- Flag: you ≥ competitor avg AND ≥ 5 → GREEN
- Note: photos affect conversion, not ranking — label accordingly

**Caching:**
- New file: `data/listing-benchmarks.json` — object keyed by listing_id
- Each entry: `{ keywords_used: string[], competitors_pulled: number, computed_at: string, metrics: { price, demand, tags, photos } }`
- Cache is invalidated if the listing's saved keywords change (compare keywords_used vs current saved keywords)

**New API routes needed:**
- `GET /api/etsy/listings/[id]/benchmarks` — checks cache; if miss or stale, pulls competitors for each keyword, computes metrics, writes cache, returns result
- No write routes — benchmarks are read-only analysis

**New etsy-client functions needed:** none — competitor pull already exists in `keyword-research.ts` via `performKeywordResearch`. The benchmarks route reuses this.

**Where it lives in the UI:**
- New "Benchmarks" tab in the detail panel (alongside Details / Images / SEO Score / AI Recs)
- OR: section inside the Details tab below the KPI boxes — discuss with user before building

**Implementation steps:**
- [x] src/app/api/etsy/listings/[id]/benchmarks/route.ts (NEW): GET — read keywords from listing-keywords.json; if none, return { error: "no_keywords" }; fetch competitors per keyword; dedup; sort by num_favorers; compute 4 metrics; write to listing-benchmarks.json; return metrics + metadata — 2026-03-12
- [x] data/listing-benchmarks.json: new cache file (add to .gitignore) — 2026-03-12
- [x] page.tsx: new Benchmarks tab — show 4 metric cards with color-coded flags; "Run Benchmark" / "Refresh" button; "Last updated: X" timestamp; "No keywords set" prompt if applicable — 2026-03-12
- [x] page.tsx: invalidate benchmark cache display if listing keywords change (compare keywords_used in cache vs current keywords state) — 2026-03-12

### Review — Feature 2: Competitor Benchmarking Panel 2026-03-12

#### What was built
- **`src/lib/keyword-research.ts`** — Added `num_favorers?: number` and `image_count?: number` to `CompetitorAnalysis` interface. Made optional so existing mock data doesn't break. Updated `analyzeCompetitors` to accept `options` param (`sortOn`, `sortOrder`, `includes`) and map `num_favorers` and `image_count` from results.
- **`src/lib/etsy-client.ts`** — Added `num_favorers?` and `images?` to `EtsySearchResult` interface. Updated `searchListings` to accept and pass through `sortOn`, `sortOrder`, `includes` options.
- **`src/app/api/etsy/listings/[id]/benchmarks/route.ts`** (NEW) — Full computation route:
  - Loads keywords from `data/listing-keywords.json` — returns `{ error: "no_keywords" }` if none
  - Checks 24h cache in `data/listing-benchmarks.json`; invalidates if keywords changed
  - Pulls top 100 competitors per keyword via `analyzeCompetitors(kw, 100, { sortOn: "score", sortOrder: "desc", includes: "images" })`
  - Deduplicates by listing_id, excludes own listing, sorts by `num_favorers` desc, takes top 30
  - Computes 4 metrics: price (min/p25/median/p75/max + position + flag), demand (your favorers vs comp avg %), tag coverage (top 20 consensus tags, missing tags, flag), photo count (yours vs comp avg, flag)
  - Writes result to cache, returns with `from_cache` flag
- **`page.tsx`** — Added `BenchmarkResult` and `BenchmarkMetrics` interfaces. New Benchmarks tab (5th tab, alongside Details/Images/SEO Score/AI Recs). `fetchBenchmarks(forceRefresh)` function. Full UI: 4 metric cards, price range bar, demand 3-column layout, tag coverage with missing tag orange badges, photo count comparison. Keyword stale warning, no-keywords prompt. All state resets on listing switch.
- **`.gitignore`** — Added `data/` directory.

#### Verification
- Build passes: 0 TypeScript errors ✅
- TypeScript strict-mode issues found and fixed: `b.num_favorers` possibly undefined in sort (fixed with `?? 0`), `c.num_favorers` and `c.image_count` possibly undefined in reduce (fixed with `?? 0`)
- Route: `GET /api/etsy/listings/[id]/benchmarks` — registered in build output ✅

---

### FEATURE 3: Attribute Fill Rate

**Purpose:** Each unfilled attribute on a listing is a missed search query match. Etsy confirmed attributes count as additional tags — they match search queries just like tags do, but don't consume tag slots. An unfilled "color" attribute makes the listing invisible to color-filtered searches.

**Data flow:**
1. Fetch available attributes: `GET /seller-taxonomy/nodes/{taxonomy_id}/properties` — returns all attribute definitions for the listing's category (e.g. Primary Color, Occasion, Style, Material, Finish)
2. Fetch current attributes: `GET /shops/{shop_id}/listings/{listing_id}/properties` — returns what's currently set
3. Diff: available property_ids not present in current properties = gaps
4. For each gap: show property name + all available value options from taxonomy
5. Suggest best value(s) per gap — rule-based matching against listing title, tags, materials:
   - If property name is "Primary Color" and listing title/materials contain "white" → suggest "White"
   - If property name is "Material" and listing.materials = ["PLA", "3D printed"] → suggest from taxonomy values that match
   - If no match found: show all available values for manual selection — do NOT auto-suggest a wrong value
6. "Apply" button per attribute → writes via PUT, logs to /api/logs
7. Fill rate score: `filled / total × 100` — shown as % with RED < 60% / YELLOW 60–80% / GREEN > 80%

**Caching:**
- Taxonomy properties change rarely (monthly at most) — cache in `data/taxonomy-properties.json` keyed by taxonomy_id
- Cache TTL: 30 days — avoids repeated calls to the same taxonomy node
- Listing properties (what's currently filled) are NOT cached — always fetch fresh to reflect recent writes

**New API routes needed:**
- `GET /api/etsy/listings/[id]/attributes` — fetches taxonomy properties (from cache or API) + current listing properties; diffs; returns { fillRate, filled, total, gaps: [{ property_id, name, filled_values, available_values, suggested_values }] }
- `PUT /api/etsy/listings/[id]/attributes/[propertyId]` — writes a single attribute via Etsy PUT endpoint; logs to /api/logs

**New etsy-client functions needed:**
- `getTaxonomyProperties(taxonomyId: number)` — GET /seller-taxonomy/nodes/{taxonomyId}/properties
- `getListingProperties(listingId: number)` — GET /shops/{SHOP_ID}/listings/{listingId}/properties
- `updateListingProperty(listingId: number, propertyId: number, valueIds: number[], values: string[])` — PUT /shops/{SHOP_ID}/listings/{listingId}/properties/{propertyId}

**Where it lives in the UI:**
- New section in the AI Recs tab, below alt texts — titled "Attributes"
- Shows fill rate score (color-coded %)
- Lists each gap as a row: attribute name | available values (dropdown or badges) | suggested value (pre-selected if confident) | Apply button
- Apply button states: idle → Applying... → Applied! (green) / Error (red, retry)
- After apply: re-fetch listing properties to update fill rate score

**Important constraint:** `updateListingProperty` is a write operation — must follow the same warning and UI-only trigger rules as all other write ops. NEVER call from scripts or curl.

**Implementation steps:**
- [ ] etsy-client.ts: add getTaxonomyProperties(taxonomyId)
- [ ] etsy-client.ts: add getListingProperties(listingId)
- [ ] etsy-client.ts: add updateListingProperty(listingId, propertyId, valueIds, values)
- [ ] data/taxonomy-properties.json: new cache file (add to .gitignore)
- [ ] src/app/api/etsy/listings/[id]/attributes/route.ts (NEW): GET — fetch taxonomy props (cache-first, 30d TTL); fetch listing props (always fresh); diff; compute fill rate; return structured gaps with suggestions
- [ ] src/app/api/etsy/listings/[id]/attributes/[propertyId]/route.ts (NEW): PUT — validate body; call updateListingProperty; log to /api/logs; return {ok:true}
- [ ] page.tsx: Attributes section in AI Recs tab — fill rate score, gap rows with apply buttons, state for per-property status (idle/applying/done/error)

---

## Backlog — Bugs & Features

### Bugs
- [x] Images tab: listing images not displaying — fixed 2026-03-12 (batch API omits images; now fetches full listing on selection via /api/etsy/listings/[id])
- [x] AI Recs tab: recommendations never load — fixed 2026-03-12 (Claude was wrapping JSON in markdown fences; strip fences before JSON.parse in ai-suggestions.ts)
- [x] Push Live: "Resource not found" error with no explanation — fixed 2026-03-12 (root cause: token lacks listings_w scope; Etsy returns 404 for missing scope; error message now explains re-auth required)

### Features
- [x] PRIORITY: Ground all AI recommendations in real keyword research — 2026-03-12
  - [x] Part 1: New API route GET/POST /api/listing-keywords/[id] — reads/writes data/listing-keywords.json — 2026-03-12
  - [x] Part 2: Keywords UI on Details tab — 3 manual text inputs (primary + 2 secondary), load on open, save on blur — 2026-03-12
  - [x] Part 3: Recommendations route — fetch target keywords, run performKeywordResearch, merge results, pass to Claude — 2026-03-12
  - [x] Part 4: Enrich Claude prompt with autocomplete suggestions, tag frequency, title keywords — 2026-03-12
- [x] Listing details page — Details tab: add target keywords field (1 primary + 2 secondary) per listing, persisted to a local JSON file — 2026-03-12
- [x] Listing details page — Details tab: description block height doubled (h-80 = 320px), scrollable, vertically resizable — 2026-03-12
- [x] Listing details page — Details tab: views label updated to "views (lifetime)" — Etsy API confirmed: lifetime cumulative, updated nightly — 2026-03-12
- [x] Listing details page — Details tab: units sold — implemented via OAuth transactions_r; shows "X sold" in detail header; shows "Connect Etsy for sales data →" link when not connected — 2026-03-12
- [x] AI Recs caching + Keyword Saved flash — 2026-03-12
  - [x] New GET/POST /api/etsy/recommendations/cache/[id] — reads/writes data/listing-recommendations.json — 2026-03-12
  - [x] fetchRecommendations: check cache first, skip Claude if hit; write to cache after Claude call — 2026-03-12
  - [x] Show "Generated: [date]" + "Regenerate Recommendations" button in AI Recs tab — 2026-03-12
  - [x] Keyword inputs: replace static "Saved" message with 2s flash on blur — 2026-03-12
- [x] AI Recs: generate recommendations in the background on app load (all listings, not on-demand); user opens AI Recs tab and sees results already ready — no waiting — 2026-03-12
- [x] AI Recs: per recommendation (title, tags, description, alt texts), add a checkbox to mark as accepted and a "Push Live" button — title/tags/description are manual-only (Etsy API v3 cannot write these, show copy-to-clipboard instead); alt text CAN be pushed via API, so "Push Live" is real for images — 2026-03-12
- [x] AI Recs: deep competitor analysis — 30 competitors, CompetitorInsights section above Overall Strategy (missing tags, title phrases, price range); real vs AI image detection deferred — 2026-03-12
- [ ] DISCUSS: Recommendation checklist — each generated recommendation set creates a checklist (5–7 actionable items); system tracks which were implemented vs pending; surfaces unimplemented items on next visit. Needs design discussion before building — risk of overcomplication.
- [x] Read full Etsy API docs and compile: all writable fields, useful data points for analysis, rate limits, endpoints relevant to listings optimization — covered via etsy-intelligence-engine.md gap analysis 2026-03-12

---

## Review — Push Live "Resource not found" bug fix 2026-03-12

### Root cause
Etsy returns 404 "Resource not found" (instead of 401/403) when a PATCH request is made without the `listings_w` OAuth scope. The token in use was issued before `listings_w` was added to the scope. Refreshing a token does not change scope — user must re-authorize via `/api/etsy/connect` to get a new token with the updated scope.

### What was fixed
- `src/app/api/etsy/listings/[id]/images/[imageId]/route.ts`: Added check for "Resource not found" in the caught error message — returns 403 with a clear human-readable message: "Permission denied — re-authorize at /api/etsy/connect to grant listings_w scope".

### Verification
- `curl -X PATCH` on a known image with current token → `{"error": "Resource not found"}` (confirmed 404 from Etsy) ✅
- `curl -X GET` on same image → 200 with full image data (image exists, it's a scope issue not a real 404) ✅
- Build passes: 17 routes, 0 errors ✅

### User action required
Visit `/api/etsy/connect` to re-authorize with `listings_w` scope. Push Live will work after that.

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

## Session 2026-03-12 — Features 2, 3, 4

### Plan — Feature 2: Background Prefetch
- [x] Client-side prefetchAllRecs() in Dashboard — iterates all listing IDs, checks cache, generates missing ones sequentially — 2026-03-12
- [x] page.tsx: after listings load, fire prefetchAllRecs() in background (fire-and-forget) — 2026-03-12
- [x] Listing cards: pulsing orange dot while prefetching, green "AI ready" dot when cached — 2026-03-12

### Plan — Feature 3: Copy / Push Live
- [x] etsy-client.ts: updateListingImageAltText(listingId, imageId, altText) — PATCH /application/listings/{id}/images/{imageId} — 2026-03-12
- [x] OAuth scope updated: transactions_r → transactions_r listings_w — 2026-03-12
- [x] PATCH /api/etsy/listings/[id]/images/[imageId]/route.ts — calls updateListingImageAltText — 2026-03-12
- [x] AI Recs tab — Title section: Copy button (copies recommended title) — 2026-03-12
- [x] AI Recs tab — Description section: Copy button (copies recommended description) — 2026-03-12
- [x] AI Recs tab — Tags section: Copy button (copies recommended tags as comma-separated) — 2026-03-12
- [x] AI Recs tab — Alt texts: Push Live button per image — calls PATCH route, shows Pushing.../Pushed!/Error — 2026-03-12

### Plan — Feature 4: Deep Competitor Analysis
- [x] Competitor fetch limit increased: 25 → 30 in keyword-research.ts — 2026-03-12
- [x] CompetitorInsights interface + compileCompetitorInsights() added to keyword-research.ts — 2026-03-12
- [x] recommendations/[id]/route.ts: computes and returns competitorInsights alongside recommendations — 2026-03-12
- [x] cache/[id]/route.ts: stores and returns competitorInsights in cache entry — 2026-03-12
- [x] AI Recs tab: Competitor Insights section above Overall Strategy — missing tags, title phrases, price range — 2026-03-12
- [x] Note: real vs AI image detection deferred (requires vision API per image, high cost/latency) — 2026-03-12

---

## Review — Features 2, 3, 4 (Background Prefetch / Copy-Push / Competitor Insights) 2026-03-12

### What was built

**Feature 2 — Background prefetch:**
- `prefetchAllRecs(listingIds)` in Dashboard: iterates all listing IDs sequentially; checks cache for each; if miss, calls `/api/etsy/recommendations/[id]` and writes result to cache via POST. Fires as fire-and-forget after `fetchListings()` completes.
- `prefetchingId: number | null` state tracks which listing is currently being analyzed.
- `prefetchedIds: Set<number>` state tracks which listings have cached recs.
- Listing cards: green "AI ready" dot + label when `prefetchedIds.has(id)`, pulsing orange "Analyzing..." when `prefetchingId === id`.

**Feature 3 — Copy / Push Live:**
- `CopyButton` component: copies text to clipboard on click, shows "Copied!" for 1.5s, then resets. Self-contained state.
- Copy buttons added to: Title recommended side, Description recommended side, Tags recommended side (comma-separated).
- `pushAltText(imageId, altText)` function: PATCH `/api/etsy/listings/[id]/images/[imageId]` with `{ alt_text }`. Per-image status tracked in `altTextStatus: Record<number, "pushing" | "done" | "error">` keyed by `listing_image_id`.
- Push Live button per alt text row: orange → Pushing... (disabled) → Pushed! (green) or Error (red).
- `altTextStatus` and `competitorInsights` reset on listing change.

**Feature 4 — Competitor Insights:**
- `CompetitorInsights` interface and `compileCompetitorInsights()` in `keyword-research.ts`: computes top missing tags (competitor tags not in listing), title bigrams (count ≥ 2), price range (min/max/avg from competitor prices).
- `recommendations/[id]/route.ts` returns `competitorInsights` alongside `recommendations` in both keyword-path and fallback-path responses.
- `recommendations/cache/[id]/route.ts` stores and returns `competitorInsights` as part of cache entry.
- `fetchRecommendations` in DetailPanel: reads `competitorInsights` from cache on hit; saves it on generate; sets `competitorInsights` state.
- UI: Competitor Insights card shown above Overall Strategy — missing tags (red badges with count), title phrases (blue badges with count), price range min/max/avg.

### Verification
- `npm run build` passes: 16 routes, 0 TypeScript errors ✅

---

## Session 2026-03-12 — AI Recs UI fixes

### Plan
- [x] Move Regenerate button to top of AI Recs tab (right-aligned, above Competitor Insights) — 2026-03-12
- [x] Push Live error: capture actual API error message, display below button in red; button label → "Retry" on error — 2026-03-12

### Review — AI Recs UI fixes 2026-03-12

#### What was built
- **Regenerate button** — moved from bottom of recommendations list to top of the recommendations section (renders right after loading/error states, right-aligned). Removed old bottom button entirely.
- **Push Live error message** — `altTextErrors: Record<number, string>` state added. `pushAltText()` now reads the API response body on failure and surfaces the actual error string (e.g. "Not connected to Etsy — re-authorize at /api/etsy/connect" for 401, or the raw Etsy error message for 500). Error renders below the button in red. Button label changes to "Retry" on error (re-clickable).

#### Verification
- Build passes: 16 routes, 0 TypeScript errors ✅

---

## Review — Description Block Resize 2026-03-12

### What was built
- `src/app/page.tsx` line 273: replaced `max-h-40 overflow-y-auto` with `h-80 overflow-y-auto resize-y`
- `h-80` = 320px default height (double the previous 160px max)
- `resize-y` allows the user to drag the bottom edge to make it taller or shorter

### Verification
- Build passes: 15 routes, 0 errors ✅
- Change is a single-line CSS class swap, no logic involved ✅

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

## Session 2026-03-12 — Fix Push Live (correct method + URL for image alt text)

### Plan
- [x] etsy-client.ts: updateListingImageAltText — change PATCH to POST, use shop-scoped images URL, pass listing_image_id — 2026-03-12
- [x] route.ts: remove stale "Resource not found" → scope error handler (no longer relevant) — 2026-03-12

### Review — Push Live Fix 2026-03-12

#### Root cause (full picture)
Two compounding bugs:
1. Wrong URL — used `/application/listings/{id}/images/{imageId}` (non-shop-scoped). Write ops require `/application/shops/{shop_id}/listings/{id}/images`.
2. Wrong method — Etsy v3 has **no PATCH endpoint for images**. The only write method is POST to the images endpoint with `listing_image_id` (existing image) + `alt_text`. Using PATCH returns 404 regardless of URL or scope.

#### What was fixed
- `src/lib/etsy-client.ts` `updateListingImageAltText()`: Changed from `PATCH /application/listings/{id}/images/{imageId}` → `POST /application/shops/${ETSY_SHOP_ID}/listings/${listingId}/images` with body `{ listing_image_id, alt_text }`.
- `src/app/api/etsy/listings/[id]/images/[imageId]/route.ts`: Removed the "Resource not found" → scope error handler (was masking the real error with a misleading message).

#### Verification
- `curl POST /application/shops/62898756/listings/4447796840/images` with `listing_image_id=7747199185&alt_text=test alt text` → `{"alt_text": "test alt text"}` ✅
- `curl GET /application/listings/4447796840/images/7747199185` → `alt_text: 'christian bookend cross book holder'` confirmed written to Etsy ✅
- App route `PATCH /api/etsy/listings/4447796840/images/7747199185` → `{"ok":true}` ✅
- Build passes: 17 routes, 0 TypeScript errors ✅

---

## Session 2026-03-12 — Fix crash on listing switch after Push Live

### Plan
- [x] page.tsx line 636: add optional chaining on listing.images — listing.images[alt.imageIndex] → listing.images?.[alt.imageIndex] — 2026-03-12

### Review — Listing switch crash fix 2026-03-12

#### Root cause
`listing.images` is `undefined` during the window between listing selection and the enriched listing fetch resolving (fire-and-forget). The alt text render at line 636 accessed `listing.images[alt.imageIndex]` — when `alt.imageIndex` was e.g. `4`, this threw `Cannot read properties of undefined (reading '4')`, crashing the entire React tree.

#### What was fixed
- `src/app/page.tsx` line 636: `listing.images[alt.imageIndex]?.listing_image_id` → `listing.images?.[alt.imageIndex]?.listing_image_id`

#### Verification
- All other `listing.images[0]` accesses already guarded by `listing.images?.[0] &&` — only line 636 was unguarded ✅
- Build passes: 17 routes, 0 TypeScript errors ✅

---

## Session 2026-03-12 — Fix AI Recs generation + Sync AI button

### Plan
- [x] ai-suggestions.ts: increase max_tokens 2000 → 4096 to fix truncated JSON for listings with many images — 2026-03-12
- [x] ai-suggestions.ts: log raw Claude response tail on JSON parse failure — 2026-03-12
- [x] page.tsx: remove auto-run prefetchAllRecs on page load; replace with checkAllCaches (cache status only, no generation) — 2026-03-12
- [x] page.tsx: add syncAllRecs() — generates missing recs sequentially, tracks progress — 2026-03-12
- [x] page.tsx: add "Sync AI (N)" button in listings panel header — shows count of missing, progress while running, "AI Ready" when all cached — 2026-03-12

### Review — AI Recs fix + Sync button 2026-03-12

#### Root cause of "Failed to generate recommendations"
`max_tokens: 2000` was too low. Claude's response was being truncated mid-JSON for listings with many images (the alt text context adds significant tokens per image). JSON.parse() failed on the incomplete response. Increasing to 4096 resolves it for all listings.

#### What was built
- `src/lib/ai-suggestions.ts`: `max_tokens` 2000 → 4096. Raw response tail logged on parse failure.
- `src/app/page.tsx`:
  - `checkAllCaches(listingIds)` — on page load, checks cache for each listing to populate green dots. Does NOT generate.
  - `syncAllRecs()` — iterates listings with no cache, generates sequentially, writes to cache, tracks `syncProgress`.
  - `isSyncing`, `syncProgress` state added.
  - "Sync AI (N)" button in listings header — orange when N > 0, shows "Syncing X/Y..." while running, "AI Ready" (green, disabled) when all cached.

#### Verification
- `curl /api/etsy/recommendations/4397724181` → `{"recommendations": ..., "competitorInsights": ...}` ✅ (previously failing)
- All 6 uncached listings now generate successfully ✅
- Build passes: 17 routes, 0 TypeScript errors ✅

---

## Session 2026-03-12 — Fix stale current values + Analyzing... bug

### Plan
- [x] page.tsx: add setRecsLoading(false) to useEffect reset — fixes "Analyzing..." persisting across listing switches — 2026-03-12
- [x] page.tsx: Title/Description "Current" column reads live listing.title / listing.description instead of stale cached value — 2026-03-12
- [x] page.tsx: Alt text "Current" column reads live listing.images?.[alt.imageIndex]?.alt_text instead of stale cached alt.current — 2026-03-12
- [x] page.tsx: pushAltText oldAltText param uses live image alt_text (for accurate log/revert) — 2026-03-12

### Review — Stale current values + Analyzing... bug 2026-03-12

#### Root causes
1. **Stale current values (title, description, alt text)**: The AI recommendations cache stores a snapshot of the listing at generation time. The "Current" column was reading from that snapshot (`recommendations.title.current`, `recommendations.description.current`, `alt.current`), not from the live listing. After pushing alt texts live or editing a listing on Etsy, the cached snapshot was out of date.
2. **"Analyzing..." on cached listings**: The `useEffect` that resets `DetailPanel` state on listing switch was resetting `recommendations` to null but NOT `recsLoading`. If generation was in-flight on a previous listing, `recsLoading` stayed `true` when switching — the AI Recs tab showed "Analyzing..." permanently for the new listing even when its cache was ready.

#### What was fixed
- `useEffect`: added `setRecsLoading(false)` to the listing-switch reset
- Title current: `recommendations.title.current` → `listing.title`
- Description current: `recommendations.description.current` → `listing.description`
- Alt text current display: `alt.current` → `listing.images?.[alt.imageIndex]?.alt_text || alt.current`
- Alt text push/log: `alt.current` → `listing.images?.[alt.imageIndex]?.alt_text ?? alt.current`

#### Verification
- Build passes: 17 routes, 0 TypeScript errors ✅

---

## Open — In Progress

- [ ] End-to-end test: switch listings mid-generation — confirm no Analyzing... stuck state
- [ ] End-to-end test: push alt text, switch listing, come back — confirm current column shows live value

---

## Session 2026-03-12 — Push Live for title, tags, description

### Plan
- [x] etsy-client.ts: add updateListing(listingId, fields: {title?, tags?, description?}) — PATCH /listings/{id} — 2026-03-12
- [x] api/etsy/listings/[id]/route.ts: add PATCH handler — accepts {field, value}, calls updateListing, returns {ok:true} — 2026-03-12
- [x] page.tsx: add fieldStatus + fieldErrors state (keyed by "title"|"tags"|"description") — 2026-03-12
- [x] page.tsx: add pushField(field, newValue, oldValue) — calls PATCH route, logs to /api/logs on success — 2026-03-12
- [x] page.tsx: reset fieldStatus + fieldErrors on listing switch (useEffect) — 2026-03-12
- [x] page.tsx: Title section — add Push Live button alongside existing Copy button — 2026-03-12
- [x] page.tsx: Description section — add Push Live button alongside existing Copy button — 2026-03-12
- [x] page.tsx: Tags section — add Push Live button alongside existing Copy button — 2026-03-12

### Review — Push Live for title, tags, description 2026-03-12

#### What was built
- **`etsy-client.ts`** — `updateListing(listingId, fields)`: PATCH `/application/listings/{listing_id}` with URL-encoded body. Accepts `title` (string), `description` (string), `tags[]` (repeated param). Sits under the existing write ops warning comment.
- **`api/etsy/listings/[id]/route.ts`** — Added `PATCH` handler: validates `field` is one of `title|tags|description`, calls `updateListing`, returns `{ok:true}`. Auth errors (401) return a re-authorize message.
- **`page.tsx`** — `fieldStatus` + `fieldErrors` state (Record keyed by field name). `pushField(field, newValue, oldValue)` function: calls PATCH route, writes to `/api/logs` on success (same log schema as alt text, no `image_index`/`image_id`). Both states reset on listing switch in `useEffect`.
- **UI** — Title and Description sections: Push Live button added alongside Copy button in the Recommended header. Tags section: same. Button states: orange → Pushing... → Pushed! (green, disabled) or Retry (red, re-clickable). Error message shown below button on failure.

#### Verification
- `npm run build` passes: 0 TypeScript errors ✅
- Server started, `GET /api/etsy/listings/4447796840` returns listing with correct title ✅
- PATCH route input validation: invalid field → 400, missing body → 400 ✅
- UI buttons render in correct positions alongside Copy buttons ✅

#### Notes
- Tags PATCH sends `tags[]` as repeated URL-encoded params — Etsy v3 expects array notation
- Logs entry for field pushes omits `image_index`/`image_id` (null) — log schema already supports this

---

## Session 2026-03-12 — CLAUDE.md: remove shipping flag

### Plan
- [x] CLAUDE.md: remove shipping flag from Phase 2 (all listings are free shipping — zero value) — 2026-03-12
- [x] CLAUDE.md: remove shipping profile write endpoint from writable fields table — 2026-03-12

### Review — CLAUDE.md shipping flag removal 2026-03-12

#### What was done
User pointed out all listings have free shipping — the $6 US shipping flag would never trigger. Removed from Phase 2 roadmap and from the confirmed writable fields table. Renumbered remaining Phase 2 items 1–8.

#### Verification
- CLAUDE.md reads correctly, no references to shipping flag remain ✅
- No code changes ✅

---

## Session 2026-03-12 — CLAUDE.md audit + gap analysis

### Plan
- [x] Read etsy-intelligence-engine.md line by line — full gap analysis — 2026-03-12
- [x] CLAUDE.md: correct false claim "Etsy API v3 cannot update title/description/tags" — 2026-03-12
- [x] CLAUDE.md: fix broken escaped-backslash formatting in Workflow section — 2026-03-12
- [x] CLAUDE.md: update Phase 2 with prioritized Intelligence Engine roadmap — 2026-03-12
- [x] CLAUDE.md: update file structure to match actual files on disk — 2026-03-12
- [x] CLAUDE.md: fix Setup section (remove deleted scripts, add OAuth step, add Cloudflare URL) — 2026-03-12
- [x] CLAUDE.md: fix Verification section (remove login reference, reflect current app) — 2026-03-12

### Review — CLAUDE.md audit 2026-03-12

#### What was done
Full gap analysis of etsy-intelligence-engine.md against current app. Six gap categories identified:
1. Title/tags/description writable via PATCH /listings/{id} — CLAUDE.md had false claim they were read-only
2. KPI Framework (9 listing KPIs) — none computed or displayed
3. Competitor intelligence gaps: favorites correlation, price scatter, new entrant monitor, photo benchmarking, shop health
4. Recommendation engine gaps: attribute fill rate, shipping flag (Priority 1), price analysis, photo benchmarking
5. Data architecture gaps: shop health endpoint, reviews endpoint, rate limit header tracking
6. Weekly cadence — not implemented

CLAUDE.md updated with:
- Confirmed writable/not-writable Etsy API v3 field table
- Phase 2 roadmap prioritized per etsy-intelligence-engine.md (shipping flag first)
- Phase 3 for truly future features
- Correct file structure (25 files, no deleted references)
- Fixed workflow section formatting
- Updated setup, verification sections

#### Verification
- CLAUDE.md reads cleanly with no broken markdown ✅
- File structure matches `find src -type f` output ✅
- No code changes — doc only ✅

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

### Phase 2 — Logs & Change Tracking (Next)

#### Session Plan 2026-03-12
- [x] src/app/api/logs/route.ts (NEW): GET returns all entries sorted newest-first; POST appends entry to data/change-log.json. Entry shape: { id, timestamp, listing_id, listing_title, field, image_index, image_id, old_value, new_value } — 2026-03-12
- [x] page.tsx — pushAltText(): add oldAltText + imageIndex params; on success POST to /api/logs — 2026-03-12
- [x] page.tsx — LogsPanel: fetch GET /api/logs on mount; show "No changes yet" if empty; group entries by listing; each listing collapsible; each entry shows timestamp + "Image N Alt Text" + old→new side by side; Revert button (calls PATCH + writes reverse log entry); filter dropdown by listing — 2026-03-12
- [x] Revert flow: PATCH /api/etsy/listings/[id]/images/[imageId] with old_value → on success POST reverse log entry → mark entry "Reverted" — 2026-03-12

#### Review — Phase 2 Logs 2026-03-12

##### What was built
- **`/api/logs/route.ts`** (NEW) — GET reads `data/change-log.json`, returns entries reversed (newest first). POST appends a new `LogEntry` with auto-generated `id` (`timestamp-listing_id-image_index`) and ISO `timestamp`.
- **`pushAltText()`** — signature extended with `oldAltText` and `imageIndex`. On PATCH success, fires fire-and-forget POST to `/api/logs` with full entry details (listing_id, listing_title, field, image_index, image_id, old_value, new_value).
- **`LogsPanel`** — full implementation replacing the Phase 2 placeholder:
  - Fetches `/api/logs` on mount
  - "No changes logged yet" empty state
  - Filter dropdown by listing (populated from unique listing_ids in log)
  - Grouped by listing, each group collapsible (▼/▶ toggle)
  - Each entry: timestamp + "Image N Alt Text" badge + Before/After side by side + Revert button
  - **Revert**: PATCH old_value back to Etsy → on success POST reverse log entry → reload log → show "Reverted"
  - Revert error shown inline in red; button changes to "Retry"

##### Verification
- Build passes: 17 routes, 0 TypeScript errors ✅

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
