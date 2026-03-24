# Etsy Listing Optimizer — Todo

> Phase 1 and Phase 2 sessions archived to tasks/archive.md

## Open — In Progress

> **Session context (2026-03-24)**
> Last commit: `bbddee3` — Phase 3 complete (benchmark engine, AI recs wiring, BenchmarksTab UI)
> Phase 1, 2, and 3 fully shipped. Next: Phase 4 (see Phase 3 → Future in CLAUDE.md).
> App live at https://etsy.bornganic.com. Server PID 619469.

- [x] End-to-end test: switch listings mid-generation — confirm no Analyzing... stuck state — 2026-03-23
- [x] End-to-end test: push alt text, switch listing, come back — confirm current column shows live value — 2026-03-23

---

## Session 2026-03-24 — Bug Fix: False "Keywords changed" stale warning

- [x] Fix: "Keywords changed since last benchmark — hit Refresh to update." shown falsely after listing switch — 2026-03-24

### Review

#### Root cause
Race condition in `DetailPanel` `useEffect`: benchmark cache fetch resolves before the keywords fetch, so when `benchmarks` state is set, `keywords` is still the reset value `{ primary: "", secondary: ["", ""] }`. `BenchmarksTab` compared `b.keywords_used` against an empty array → mismatch → warning fired briefly on every listing switch.

#### What was built
- `DetailPanel.tsx`: added `keywordsLoaded` boolean state (default `false`), reset to `false` on listing switch, set to `true` in `.finally()` of the keywords fetch
- `BenchmarksTab.tsx`: added `keywordsLoaded` prop to interface + destructure; gated the stale warning with `&& keywordsLoaded` so it can only render after keywords are confirmed loaded

#### Verification
- Build passes: ✓ Compiled successfully, 0 TypeScript errors ✅

---

## Phase 3 — Unified Intelligence Engine

### Architecture Decision (2026-03-23)

**Benchmarks are the single source of truth for all competitor and listing analysis.**
AI Recommendations read exclusively from the benchmark cache — they do not run their own competitor pulls.

```
Benchmark (run once, cached 24h)
  └── Rich competitor data (100→30 by num_favorers, all metrics computed)
        ├── Benchmarks tab  ← display metrics to user
        └── AI Recs tab     ← Claude prompt fed entirely from benchmark cache
```

**If no benchmark cache exists when AI Recs are requested:** run the benchmark first, then generate recs. Never fall back to the old shallow 30-competitor pull.

**Why:** Benchmark pull is strictly superior (100 vs 30 competitors, re-sorted by demand signal). Feeding recs from cache eliminates redundant Etsy API calls and guarantees the Benchmarks tab and AI Recs tab are always consistent with each other.

---

### Phase 3A — Complete the Benchmark Engine

Benchmarks currently compute: price position, demand gap, tag coverage, photo count.
Missing vs. etsy-intelligence-engine.md: favorites correlation, tag threshold filter, attribute duplicate detection, title consensus analysis, description audit, image type classification.

---

#### 3A-Step 1: Price Percentile Fix (tighten flags to doc spec)

**Why:** Doc §05 specifies 10th/90th percentile for price flags. Current code uses 25th/75th, which is too broad — it flags listings that are only mildly off-price.

**Files to change:**
- `src/app/api/etsy/listings/[id]/benchmarks/route.ts`

**Micro steps:**
- [x] In `benchmarks/route.ts`: compute `priceP10 = percentile(prices, 10)` and `priceP90 = percentile(prices, 90)` alongside existing p25/p75/median
- [x] Update `pricePosition` to three values: `"bottom-10"` | `"mid-range"` | `"top-10"` (was bottom-25/top-25)
- [x] Update overpriced flag: `pricePosition === "top-10" AND yourFavorers < compAvgFavorers * 0.5`
- [x] Update underpriced flag: `pricePosition === "bottom-10" AND yourFavorers > compAvgFavorers`
- [x] Add three-scenario margin calc to metrics output: `{ current_price_net, median_price_net, p75_price_net }` using formula `net = price - (price × 0.065) - (price × 0.03) - 0.25` (no COGS — user doesn't have it; show gross margin only)
- [x] Update `BenchmarkResult` type in `src/types.ts` — add `p10`, `p90`, updated `position` union, `margin_scenarios`
- [x] Update `BenchmarksTab.tsx` — replace "Bottom 25% / Top 25%" labels with "Bottom 10% / Top 10%", add margin scenario table under price card

---

#### 3A-Step 2: Tag Threshold Filter (primary target identification)

**Why:** Doc §04 says tags appearing in 30%+ of top-ranked competitors are primary keyword targets. Currently we show all consensus tags equally — no threshold distinction.

**Files to change:**
- `src/app/api/etsy/listings/[id]/benchmarks/route.ts`
- `src/types.ts`
- `src/components/detail/tabs/BenchmarksTab.tsx`

**Micro steps:**
- [x] In `benchmarks/route.ts` tag computation: for each consensus tag, compute `pct = count / allCompetitors.length`
- [x] Add `pct` field to each entry in `consensus_tags` array
- [x] Add `primary_targets` field to `metrics.tags`: consensus tags where `pct >= 0.30` — these are the highest-priority additions
- [x] Add `secondary_targets` field: consensus tags where `0.15 <= pct < 0.30`
- [x] Update `BenchmarkResult.metrics.tags` type in `src/types.ts` to include `pct` on each tag + `primary_targets` + `secondary_targets` arrays
- [x] Update `BenchmarksTab.tsx` tag coverage card: show primary targets (≥30%) in red/orange badges, secondary targets (15–30%) in yellow badges, lower-frequency in gray — visually distinct tiers

---

#### 3A-Step 3: Favorites Correlation (highest-signal keyword method)

**Why:** Doc §03 — tags that co-occur with high-favorers listings are conversion-correlated. This is the strongest keyword signal available from the Etsy API. Currently not computed anywhere.

**Method:**
- Split the top 30 competitors into two groups: top 10 by `num_favorers` (high-demand) and bottom 20
- Pool tags from the top 10 group, count frequency
- Tags that appear in ≥50% of the top-10 group = favorites-correlated tags
- Cross-reference against your listing tags — show which you're missing

**Files to change:**
- `src/app/api/etsy/listings/[id]/benchmarks/route.ts`
- `src/types.ts`
- `src/components/detail/tabs/BenchmarksTab.tsx`

**Micro steps:**
- [x] In `benchmarks/route.ts`: after sorting by `num_favorers` and taking top 30, split: `highDemandGroup = allCompetitors.slice(0, 10)`, `restGroup = allCompetitors.slice(10)`
- [x] Compute `highDemandTagCounts: Map<string, number>` — pool all tags from `highDemandGroup`, count frequency
- [x] Compute `favoritesCorrelatedTags` = entries where `count / highDemandGroup.length >= 0.5`, sorted by count desc
- [x] Cross-reference against `yourTags` — produce `missingFavoritesCorrelatedTags` array
- [x] Add `metrics.favorites_correlation: { high_demand_group_size: number, correlated_tags: {tag: string, count: number, pct: number}[], missing_from_your_listing: {tag: string, count: number, pct: number}[] }` to result
- [x] Update `BenchmarkResult` type in `src/types.ts`
- [x] Add "Demand-Correlated Tags" section to `BenchmarksTab.tsx` — new card below tag coverage, shows missing correlated tags as purple badges with favorers icon, explains what this means

---

#### 3A-Step 4: Attribute Duplicate Detection (wasted tag slot identification)

**Why:** Doc §05 Tags scoring — tags that duplicate already-set attributes waste tag slots. Etsy confirmed attributes act as tags; having both the tag AND the attribute set provides zero additional ranking benefit.

**Files to change:**
- `src/app/api/etsy/listings/[id]/benchmarks/route.ts`
- `src/lib/etsy-client.ts` (already has `getListingProperties` — reuse it)
- `src/types.ts`
- `src/components/detail/tabs/BenchmarksTab.tsx`

**Micro steps:**
- [x] In `benchmarks/route.ts`: after fetching listing via `getListing()`, also call `getListingProperties(listingId)` to get currently-set attributes
- [x] Extract attribute values: for each filled property, collect all `values` strings (e.g. "White", "Wood", "Modern")
- [x] Normalize to lowercase, compare against `listing.tags` (normalized lowercase)
- [x] Build `wasted_tag_slots: string[]` — tags that exactly or closely match an attribute value
- [x] Add `metrics.tags.wasted_tag_slots` to result + `attribute_values_set: string[]` (for transparency)
- [x] Update `BenchmarkResult` type in `src/types.ts`
- [x] In `BenchmarksTab.tsx` tag coverage card: if `wasted_tag_slots.length > 0`, show warning section — "X tag slots wasted (duplicate attributes): [tag list]" — with explanation that replacing these with competitor consensus tags would improve coverage

---

#### 3A-Step 5: Title Consensus Analysis (competitive title gap detection)

**Why:** Doc §03 + §05 — consensus phrases from competitor titles are the strongest title optimization signal. Currently not computed in benchmarks (only in `compileCompetitorInsights` which uses a shallower pool). Need this in benchmarks with the full 30-competitor set.

**Files to change:**
- `src/app/api/etsy/listings/[id]/benchmarks/route.ts`
- `src/types.ts`
- `src/components/detail/tabs/BenchmarksTab.tsx`

**Micro steps:**
- [x] In `benchmarks/route.ts`: after building `allCompetitors` (top 30), extract bigrams AND trigrams from all competitor titles
  - Tokenize each title: lowercase, split on `[\s,|/\-–—]+`, filter tokens > 2 chars, remove stopwords (same list as `keyword-research.ts`)
  - Count bigrams: every adjacent pair of tokens
  - Count trigrams: every adjacent triple of tokens
  - Compute `pct = count / allCompetitors.length` for each phrase
- [x] Build `consensus_phrases` = phrases where `pct >= 0.20` (appears in 20%+ of competitor titles), sorted by pct desc, top 15
- [x] Tokenize YOUR listing title (same method), build set of your bigrams + trigrams
- [x] Build `missing_from_your_title` = consensus phrases not present in your title bigrams/trigrams set
- [x] Compute your title quality flags:
  - `title_length: number` (chars)
  - `title_too_long: boolean` (> 140 chars)
  - `primary_keyword_front_loaded: boolean` — does the primary saved keyword appear in the first 5 words of your title?
  - `consensus_coverage: number` — how many consensus phrases you use / total consensus phrases
- [x] Add `metrics.title: { consensus_phrases: {phrase: string, count: number, pct: number}[], missing_from_your_title: string[], title_length: number, title_too_long: boolean, primary_keyword_front_loaded: boolean, consensus_coverage: number }` to result
- [x] Update `BenchmarkResult` type in `src/types.ts`
- [x] Add "Title Analysis" card to `BenchmarksTab.tsx`:
  - Show your title, flag if > 140 chars
  - Show primary keyword front-load status (green check / red X)
  - Show consensus coverage score (X / Y phrases)
  - List missing consensus phrases as orange badges
  - Explain: "These phrases appear in X% of top-ranked competitor titles but are absent from yours"

---

#### 3A-Step 6: Description Audit (rules-based quality check)

**Why:** Can't see competitor descriptions via API, but we can audit your own against the doc's scoring rules. Flags actionable problems. Doc §05 Description scoring.

**Files to change:**
- `src/app/api/etsy/listings/[id]/benchmarks/route.ts`
- `src/types.ts`
- `src/components/detail/tabs/BenchmarksTab.tsx`

**Micro steps:**
- [x] In `benchmarks/route.ts`: fetch full listing via `getListing()` (already done) — description is available
- [x] Compute description flags:
  - `word_count: number` — split on whitespace, count words
  - `too_short: boolean` — word_count < 100
  - `first_sentence_copies_title: boolean` — first sentence (up to first `.` or `\n`) is identical or >80% word overlap with listing title
  - `starts_with_boilerplate: boolean` — first 30 chars match patterns: "This listing is for", "This is a", "Welcome to", "I am selling"
  - `top_tags_in_opening: boolean` — do any of your top 5 tags (by competitor frequency from benchmark) appear in the first 3 sentences of the description?
  - `missing_keywords: string[]` — top 5 competitor tags that don't appear anywhere in the description
- [x] Compute `description_score: number` — start at 0, -1 per flag triggered (min -5)
- [x] Add `metrics.description: { word_count: number, score: number, flags: string[], missing_keywords: string[] }` to result
- [x] Update `BenchmarkResult` type in `src/types.ts`
- [x] Add "Description Audit" card to `BenchmarksTab.tsx`:
  - Show word count, color-coded (red < 100, green ≥ 100)
  - Show score badge
  - List each flag that fired as a red warning line with plain-English explanation
  - List missing keywords as orange badges: "These top competitor tags don't appear in your description"

---

#### 3A-Step 7: Image Type Classification (Claude Vision)

**Why:** Can't assess image quality from Etsy API. But we have your image URLs and can pass them to Claude Vision. Identifies which of the 7 essential photo types you have and which are missing. Doc §05 Photos.

**7 essential types per Etsy photography guide:**
1. Hero shot (clean product on white/neutral background)
2. Detail / texture (close-up of material, finish, or craftsmanship)
3. Scale reference (product next to recognizable object or with dimensions shown)
4. Lifestyle / in-use (product in a real-world setting or being used)
5. Variants (different colors, sizes, or options shown)
6. Packaging (how the product arrives — box, wrap, bag)
7. Dimensions diagram (flat graphic showing measurements)

**Constraint:** This adds a Claude API call to the benchmark run. Cost is low (vision is cheap per image), but latency increases. Run it as part of the main benchmark, cache result in same JSON entry (same 24h TTL).

**Files to change:**
- `src/app/api/etsy/listings/[id]/benchmarks/route.ts`
- `src/lib/ai-suggestions.ts` (add new exported function `classifyListingImages`)
- `src/types.ts`
- `src/components/detail/tabs/BenchmarksTab.tsx`

**Micro steps:**
- [x] `src/lib/ai-suggestions.ts`: add `classifyListingImages(images: {url: string, alt_text: string}[])` function
  - Build Claude message with all image URLs as `image` content blocks (type: `"image"`, source: `{ type: "url", url }`)
  - Prompt: "You are analyzing product photos for an Etsy listing. For each image, identify which of these 7 types it is: hero_shot, detail_texture, scale_reference, lifestyle, variants, packaging, dimensions_diagram, or other. Also note any obvious quality issues (blurry, dark, cluttered background). Respond in valid JSON only."
  - Response schema: `{ images: [{index: number, type: string, quality_notes: string | null}], missing_types: string[], coverage_score: number }`
  - Wrap JSON.parse in try-catch per standard rule
  - Max tokens: 1024 (classification only, no long text)
- [x] In `benchmarks/route.ts`: after fetching listing, if `listing.images && listing.images.length > 0`, call `classifyListingImages(listing.images.map(img => ({ url: img.url_570xN, alt_text: img.alt_text || "" })))`
  - If classification fails (catch), set `image_audit` to `null` — benchmark still succeeds without it
- [x] Add `metrics.images: { your_count: number, comp_avg: number, flag: "red"|"yellow"|"green", classification: { images: {index: number, type: string, quality_notes: string|null}[], missing_types: string[], coverage_score: number } | null }` to result
  - Merge existing photo count metric into this new combined `metrics.images` object
- [x] Update `BenchmarkResult` type in `src/types.ts` — replace old `metrics.photos` with `metrics.images`
- [x] Update `BenchmarksTab.tsx` photo count card → expand to "Image Analysis" card:
  - Photo count vs competitor avg (existing)
  - Image type coverage score (X/7 types covered)
  - Grid of your images with type label badge on each
  - Missing types listed as red warning badges: "Missing: lifestyle shot, packaging shot"
  - Quality notes shown per image if any flagged

---

### Phase 3B — Wire Benchmarks → AI Recommendations

**Goal:** AI recs read exclusively from benchmark cache. No separate competitor pull.

---

#### 3B-Step 1: Restructure the recommendations route

**Files to change:**
- `src/app/api/etsy/recommendations/[id]/route.ts`

**Micro steps:**
- [x] Remove `performKeywordResearch` import and all calls to it
- [x] Remove `compileCompetitorInsights` import (competitor insights now come from benchmark)
- [x] Add benchmark cache read at top of handler: load `data/listing-benchmarks.json` for this listing_id
- [x] If benchmark cache exists AND is fresh (< 24h) AND keywords match → proceed with benchmark data
- [x] If benchmark cache is missing OR stale OR keywords don't match → call `fetchBenchmarks()` inline (same logic as `benchmarks/route.ts`) to generate fresh benchmark, then proceed
- [x] If benchmark generation fails → return `{ error: "benchmark_required" }` with 400 — surface in UI as "Run benchmarks first"
- [x] Pass full benchmark result object to `generateListingRecommendations()`

---

#### 3B-Step 2: Restructure the Claude prompt

**Files to change:**
- `src/lib/ai-suggestions.ts`

**Micro steps:**
- [x] Change `generateListingRecommendations` signature: replace `competitors: CompetitorAnalysis[]` and `keywordData?: KeywordData` with `benchmarks: BenchmarkResult`
- [x] Build new prompt sections from benchmark data:
  - **Title gaps section:** "Consensus title phrases missing from your title: [list from `benchmarks.metrics.title.missing_from_your_title`]"
  - **Tag gaps section:** "Primary target tags (≥30% of competitors) you are missing: [from `primary_targets` minus your tags]" + "Demand-correlated tags missing: [from `favorites_correlation.missing_from_your_listing`]" + "Wasted tag slots (duplicate attributes): [from `wasted_tag_slots`]"
  - **Description gaps section:** "Description audit flags: [from `metrics.description.flags`]" + "Missing keywords not in your description: [from `metrics.description.missing_keywords`]"
  - **Image gaps section:** "Missing photo types: [from `metrics.images.classification.missing_types`]" — only include if classification is not null
  - **Price position section:** "Your price is in the [position] of the market. Competitor median: $X. Your margin at current price: $Y."
  - **Demand gap section:** "Your favorites: X. Competitor avg: Y. You are at Z% of competitor demand level."
- [x] Keep the existing "CRITICAL RULE: every recommendation must describe THIS specific product" anchor
- [x] Remove the old competitor listing dump (10 competitor titles/tags) — that data is now represented in the structured metrics above, which is more useful and uses fewer tokens
- [x] Update `AIRecommendations` interface if any new fields needed (e.g. add `photo_strategy` field for image-specific guidance)

---

#### 3B-Step 3: Remove the old shallow competitor pull

**Files to change:**
- `src/app/api/etsy/recommendations/[id]/route.ts`
- `src/lib/keyword-research.ts` (no deletion, but `performKeywordResearch` is now only used by the Keywords panel)

**Micro steps:**
- [x] Confirm `performKeywordResearch` is still used by `src/app/api/keywords/research/route.ts` — do NOT delete it
- [x] Confirm `compileCompetitorInsights` is no longer called from recommendations route — remove that import only
- [x] `competitorInsights` state in `DetailPanel.tsx` is now sourced from benchmark data — update `fetchRecommendations` to read competitor insights from benchmark rather than from the recs API response
- [x] Remove `competitorInsights` from the recs cache write (it's now in benchmark cache, not recs cache)
- [x] Update `src/app/api/etsy/recommendations/cache/[id]/route.ts` — remove `competitorInsights` from stored fields

---

#### 3B-Step 4: Update DetailPanel and RecsTab

**Files to change:**
- `src/components/detail/DetailPanel.tsx`
- `src/components/detail/tabs/RecsTab.tsx`

**Micro steps:**
- [x] `DetailPanel.tsx`: `fetchRecommendations()` — remove `competitorInsights` from recs response handling; read competitor insights for display from `benchmarks` state instead
- [x] `DetailPanel.tsx`: if `benchmarks === null` when AI Recs tab is clicked, auto-trigger `fetchBenchmarks()` first, then `fetchRecommendations()` — show "Running benchmark first..." loading state
- [x] `RecsTab.tsx`: `competitorInsights` prop now sourced from benchmark data — update prop type if needed
- [x] `RecsTab.tsx`: add a note in the UI when recs were generated from benchmark data: "Based on benchmark data from [date]"

---

### Phase 3C — BenchmarksTab UI Overhaul

After all new metrics are added to the route, the BenchmarksTab needs a full layout update to display everything.

**Files to change:**
- `src/components/detail/tabs/BenchmarksTab.tsx`

**Micro steps:**
- [x] Reorganize cards into logical sections with section headers:
  - **Search Ranking Signals** — title analysis, tag coverage (with tiers), favorites-correlated tags
  - **Conversion Signals** — price position (with margin scenarios), demand gap, image analysis
  - **Listing Quality** — description audit, wasted tag slots, photo type coverage
- [x] Each section header explains in one line what affects ranking vs. conversion (doc distinction)
- [x] Ensure all new metric types from Steps 1–7 are rendered
- [x] Add "What this means" tooltip or subtext per card for user education
- [x] Confirm component stays ≤ 250 lines — extract sub-components if needed

---

### Phase 3 Implementation Order

Build in this sequence (each step is independently deployable):

1. **3A-Step 1** — Price percentile fix (15 min, isolated change)
2. **3A-Step 2** — Tag threshold filter (20 min, additive)
3. **3A-Step 3** — Favorites correlation (30 min, new computation)
4. **3A-Step 4** — Attribute duplicate detection (30 min, new API call)
5. **3A-Step 5** — Title consensus analysis (45 min, new computation)
6. **3A-Step 6** — Description audit (30 min, rules-only)
7. **3A-Step 7** — Image type classification (60 min, Claude vision)
8. **3B-Steps 1–4** — Wire benchmarks → AI recs (90 min, architectural change)
9. **3C** — BenchmarksTab UI overhaul (60 min, display only)

**Do not start 3B until all 3A steps are complete and verified.** The recs route restructure depends on the full benchmark schema being stable.

---

## Session 2026-03-23 — Benchmarks disappear on listing switch

### Plan
- [x] Bug: benchmarks reset to null on listing switch and never auto-reload from cache — 2026-03-23

### Review — Benchmarks bug fix 2026-03-23

#### Root cause
`DetailPanel.tsx` `useEffect` resets `setBenchmarks(null)` on every `listing.listing_id` change (correct), but unlike keywords, transactions, and checklist, it never auto-fetches benchmarks back from the server-side cache. The benchmark data was persisted in `data/listing-benchmarks.json` but the UI discarded it on every listing switch.

#### What was fixed
- `src/components/detail/DetailPanel.tsx` — added a 3-line cache-first fetch inside the `useEffect` (after the checklist fetch). Calls `GET /api/etsy/listings/{id}/benchmarks` with no `?refresh=1`, so the server returns cached data immediately if fresh (24h TTL). Sets `benchmarks` state on success; silently ignores errors (no cache or no keywords — user sees the "Run Benchmark" button as before).

#### Verification
- Build passes: `✓ Compiled successfully`, 0 TypeScript errors ✅
- Pattern matches existing keywords/transactions/checklist fetch pattern in same useEffect ✅

---

## Session 2026-03-24 — Bug Fix: Benchmark Competitor Relevance Filter

### Task
- [x] Fix BenchmarksTab data quality bugs: 0/20 tag coverage, wrong-listing keywords in title analysis, irrelevant price range, off-topic description audit — 2026-03-24

### Root Cause
Secondary keywords (e.g. `"hand decor"`) were pulling irrelevant competitors into the pool. Searching "hand decor" returned Halloween/gothic/hamsa products with high favoriter counts, which dominated the top 30. Result: consensus tags were `halloween decor`, `spooky decor`, `witch hand decor` — none present in a bookend listing's tags (0/20 coverage), hamsa appearing in title analysis for a hand bookend listing, price range spanning unrelated niches ($3–$8992).

### What was built
- **`src/lib/benchmark-engine.ts`** — Added relevance filter after deduplication, before sort/slice:
  - Tokenize primary keyword
  - Try ALL-token match first (every primary token must appear in competitor title)
  - Fall back to ANY-token match if < 10 results
  - Fall back to unfiltered if still < 10
- Cleared `data/listing-benchmarks.json` so all listings recompute with filtered competitors

### Verification
- Build passes: ✓ Compiled successfully — 2026-03-24
- App restarted (PID 621089), server responding 200 ✅
- Cache cleared — all benchmarks will recompute on next visit ✅

---

## Session 2026-03-24 — Phase 3 Complete

### What was built

**3A: Complete Benchmark Engine** — all 7 steps implemented in a single session:
- Extracted all computation from route to `src/lib/benchmark-engine.ts` (route now ~60 lines)
- **3A-Step 1**: Price p10/p90 flags, margin scenarios (`current_price_net`, `median_price_net`, `p75_price_net`)
- **3A-Step 2**: Tag threshold filter — `primary_targets` (≥30%), `secondary_targets` (15–30%), `pct` on all consensus tags
- **3A-Step 3**: Favorites correlation — top 10 by num_favorers → correlated tags → missing from listing
- **3A-Step 4**: Attribute duplicate detection — `wasted_tag_slots` vs attribute values, non-fatal fallback
- **3A-Step 5**: Title consensus analysis — bigrams + trigrams, missing_from_your_title, front-load check
- **3A-Step 6**: Description audit — word count, boilerplate check, opening keyword presence
- **3A-Step 7**: Claude Vision image classification — 7 photo types, missing_types, coverage_score (non-fatal)

**3B: Wire Benchmarks → AI Recs** — all 4 steps:
- Recs route reads benchmark cache first; calls `computeBenchmarks()` inline if missing/stale
- `generateListingRecommendations` signature changed: `(listing, benchmarks)` — no more competitor list
- Prompt rebuilt from structured benchmark metrics (title gaps, tag gaps, desc gaps, image gaps, price/demand)
- `competitorInsights` removed from recs cache and all component state; sourced from `benchmarks` state instead
- DetailPanel: auto-fetches benchmarks before recs if benchmarks not loaded
- RecsTab: "Competitor Insights" section now reads from `benchmarks` prop

**3C: BenchmarksTab UI Overhaul** — incorporated into 3A:
- Cards organized into 3 sections: Search Ranking Signals / Conversion Signals / Listing Quality
- All 7 new metric types rendered (tags with tiers, favorites correlation, title analysis, price with margins, demand, image analysis, description audit)
- File: 246 lines — within ≤250 limit

**New files:** `src/lib/benchmark-engine.ts`
**Updated types:** `BenchmarkMetrics` (full new schema), `ImageClassification` added to `src/types.ts`
**Schema migration:** old benchmark cache entries with `metrics.photos` auto-invalidated (schema check added)

### Verification
- Build passes: ✓ Compiled successfully, 0 TypeScript errors, 21 routes ✅
- Server restarted, new PID 619469 ✅
- `GET /api/etsy/listings/4447796840/benchmarks` → all 7 new metrics returned (from_cache: false) ✅
- `metrics.images.classification` present (Claude Vision ran) ✅
- `metrics.title.missing_from_your_title`, `metrics.favorites_correlation`, `metrics.description.flags` all computed ✅
- `GET /api/etsy/recommendations/4447796840` → benchmark-driven recs returned, 13 tags, strategy grounded in listing ✅

