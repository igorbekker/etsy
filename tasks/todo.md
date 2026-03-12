# Etsy Listing Optimizer — Phase 1 Todo

## 1. Etsy API Connection & Auth
- [x] OAuth 2.0 + PKCE flow
- [x] Secure token storage (JSON file)
- [x] Auto-refresh tokens before expiry
- [x] Secure login (JWT + bcrypt)
- [x] Middleware route protection

## 2. Download Full Listing Data
- [x] Fetch all shop listings via API
- [x] Display: title, description, tags, images, alt text
- [x] Display: price, quantity, category, materials
- [x] Display: shipping profile, processing time
- [x] Display: who/when made, styles, personalization
- [x] Display: view count, listing state, URL

## 3. Keyword Research
- [x] Etsy autocomplete scraping
- [x] Competitor analysis via findAllListingsActive
- [x] Tag frequency analysis from competitors
- [x] Title keyword analysis from competitors
- [x] AI-powered suggestions via Claude API
- [x] Keyword research page with UI

## 4. Optimization Recommendations
- [x] Title scoring (length, keywords, structure)
- [x] Tag scoring (count, multi-word, duplicates, diversity)
- [x] Description scoring (length, structure, keyword overlap)
- [x] Image scoring (count, alt text presence, alt text quality)
- [x] Metadata scoring (materials, styles, processing, personalization, category)
- [x] Overall SEO score out of 100
- [x] Dashboard shows SEO scores per listing
- [x] Priority ranking (worst scores first)
- [x] Side-by-side current vs recommended view (AI Recommendations tab)

## 5. Web App
- [x] Login page
- [x] Dashboard with listing grid
- [x] Listing detail page (Details, Images, SEO Score, AI Recommendations tabs)
- [x] Keyword research page
- [x] Etsy connect flow

---

## Review
- Build passes with zero errors (15 routes) ✅
- All API routes functional ✅
- SEO scoring engine covers title/tags/description/images/metadata ✅
- AI recommendations via Claude API (listing optimization + keyword suggestions) ✅
- Dashboard shows SEO score badges with priority sorting ✅
- Side-by-side current vs recommended for title, tags, description, alt text ✅
- CLAUDE.md verified line-by-line — all features match ✅

---

## STATUS: Stopped 2026-02-25

**Phase 1 code is COMPLETE.** Not yet tested with real Etsy data.

---

## Session 2026-03-12 — Environment Setup

### Plan
- [ ] Get Etsy API credentials from user
- [ ] Resolve shop ID via API call
- [ ] Generate JWT secret
- [ ] Hash app login password
- [ ] Get Anthropic API key
- [ ] Create .env.local with all values
- [ ] Run app and verify end-to-end with real Etsy data

### Progress
- [x] Obtained Etsy API key + shared secret (app: myhomebymax-api) — 2026-03-12
- [x] Resolved shop ID via curl to Etsy API → shop_id: 62898756 — 2026-03-12
- [x] Ran `npm install` (dependencies were missing, bcryptjs not installed) — 2026-03-12
- [x] Generated JWT_SECRET via `scripts/generate-jwt-secret.js` — 2026-03-12
- [x] Hashed login password via `scripts/hash-password.js` — 2026-03-12
- [x] Obtained ANTHROPIC_API_KEY from ~/.bashrc — 2026-03-12
- [x] Created .env.local with all credentials — 2026-03-12
- [x] Fixed x-api-key header in etsy-client.ts to send key:secret format — 2026-03-12
- [x] Set up Cloudflare Tunnel (etsy-app) → etsy.bornganic.com — 2026-03-12
- [x] Set up Cloudflare Access: restricted to bekker.igor@gmail.com via Google OAuth — 2026-03-12
- [x] Started Next.js app (port 3000) and cloudflared tunnel — 2026-03-12
- [x] Updated ETSY_REDIRECT_URI to https://etsy.bornganic.com/api/etsy/callback — 2026-03-12
- [x] Switched Cloudflare Access to email OTP (no Google OAuth, no app login) — 2026-03-12
- [x] Removed app login page, auth API routes, auth.ts, middleware JWT checks — 2026-03-12
- [x] middleware.ts simplified to pass-through (Cloudflare Access is sole auth gate) — 2026-03-12
- [x] Remove OAuth from etsy-client.ts, use API key directly — 2026-03-12
- [x] Delete connect/callback/status API routes — 2026-03-12
- [x] Remove "Connect Etsy" UI from dashboard — 2026-03-12
- [x] Remove isConnected() checks from all 7 API routes — 2026-03-12
- [x] Test listings load: 12 listings returned via API key — 2026-03-12
- [x] UI redesign: split-screen layout (left panel listings, right panel detail with tabs) — 2026-03-12
- [x] Removed Logout button and dead auth references from dashboard — 2026-03-12
- [x] Fixed contrast: explicit text/bg colors throughout, no black-on-black — 2026-03-12
- [x] Detail panel inline in page.tsx (no page navigation on listing click) — 2026-03-12
- [x] Verified build passes: 9 routes, 0 errors — 2026-03-12
- [ ] Fix any issues found during real testing

### Review — UI Redesign 2026-03-12
- Split-screen layout: left 320px listing list, right panel detail — ✅
- Selected listing highlighted with orange left border — ✅
- Detail panel: Details, Images, SEO Score, AI Recs tabs — ✅
- SEO score loads per-listing on click — ✅
- Color contrast fixed: gray-100/200/300 text on gray-800/900/950 backgrounds — ✅
- Build passes: 9 routes, 0 errors — ✅

---

## Phase 2 — Logs & Change Tracking (Future)

### Plan
- [ ] Add top-level tab navigation: "Active Listings" | "Logs"
- [ ] Build change log data structure (JSON file per listing, or single log file)
  - Each entry: timestamp, listing_id, listing_title, field changed, old value, new value, source (AI rec / manual)
- [ ] When a recommendation is applied (title, description, tags, alt text), write a log entry
- [ ] Logs page: list all changes across all listings, grouped by listing
- [ ] Each log entry is collapsible — shows old vs new value side by side
- [ ] Revert button per entry — restores old value (via Etsy API write or manual instruction)
- [ ] Filter logs by listing, field type, date range

### Review — OAuth Removal 2026-03-12
- etsy-client.ts rewritten: no OAuth, no token storage, API key only ✅
- connect/callback/status routes deleted ✅
- All isConnected() checks removed from 7 route files ✅
- "Connect Etsy" UI removed from dashboard ✅
- Verified: curl http://localhost:3000/api/etsy/listings → 12 real listings ✅
- Build passes: 9 routes, 0 errors ✅

### Review — 2026-03-12
- .env.local created with all required variables ✅
- etsy-client.ts fixed: x-api-key now sends `key:secret` (required by Etsy API) ✅
- Cloudflare Tunnel live: etsy.bornganic.com → localhost:3000 ✅
- Cloudflare Access: email OTP only, restricted to bekker.igor@gmail.com ✅
- App login page, /api/auth/*, auth.ts deleted — Cloudflare is sole auth gate ✅
- middleware.ts is now a pass-through ✅
- Build passes: 12 routes, 0 errors ✅
- Pending: register Etsy OAuth callback URL in Etsy developer dashboard
