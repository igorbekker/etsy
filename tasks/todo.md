# Etsy Listing Optimizer — Todo

## Backlog — Bugs & Features

### Bugs
- [ ] Images tab: listing images not displaying
- [ ] AI Recs tab: recommendations never load (stuck or silently failing)

### Features
- [ ] Listing details page — Details tab: add target keywords field (1 primary + 2 secondary) per listing, persisted to a local JSON file
- [ ] Listing details page — Details tab: shrink description block height by ~50% and make it scrollable
- [ ] Read full Etsy API docs and compile: all writable fields, useful data points for analysis, rate limits, endpoints relevant to listings optimization

---

## Review — Housekeeping 2026-03-12
- Archived Phase 1 completed tasks (2026-02-25) to Archive section ✅
- Merged lessons 4 + 10 into single rule; renumbered 11–18 → 10–17; total now 17 ✅
- todo.md restructured: Backlog at top, Open in-progress, Sessions, Archive ✅

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
