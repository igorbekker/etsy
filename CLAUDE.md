\## Workflow Orchestration



\### 1. Plan Node Default

\- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)

\- If something goes sideways, STOP and re-plan immediately – don't keep pushing

\- Use plan mode for verification steps, not just building

\- Write detailed specs upfront to reduce ambiguity



\### 2. Subagent Strategy

\- Use subagents liberally to keep main context window clean

\- Offload research, exploration, and parallel analysis to subagents

\- For complex problems, throw more compute at it via subagents

\- One task per subagent for focused execution



\### 3. Self-Improvement Loop

\- After ANY correction from the user: update `tasks/lessons.md` with the pattern

\- Write rules for yourself that prevent the same mistake

\- Ruthlessly iterate on these lessons until mistake rate drops

\- Review lessons at session start for relevant project



\### 4. Verification Before Done

\- Never mark a task complete without proving it works

\- Diff behavior between main and your changes when relevant

\- Ask yourself: "Would a staff engineer approve this?"

\- Run tests, check logs, demonstrate correctness



\### 5. Demand Elegance (Balanced)

\- For non-trivial changes: pause and ask "is there a more elegant way?"

\- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"

\- Skip this for simple, obvious fixes – don't over-engineer

\- Challenge your own work before presenting it



\### 6. Autonomous Bug Fixing

\- When given a bug report: just fix it. Don't ask for hand-holding

\- Point at logs, errors, failing tests – then resolve them

\- Zero context switching required from the user

\- Go fix failing CI tests without being told how



\## Task Management



1\. \*\*Plan First\*\*: Write plan to `tasks/todo.md` with checkable items

2\. \*\*Verify Plan\*\*: Check in before starting implementation

3\. \*\*Track Progress\*\*: Mark items complete as you go

4\. \*\*Explain Changes\*\*: High-level summary at each step

5\. \*\*Document Results\*\*: Add review section to `tasks/todo.md`

6\. \*\*Capture Lessons\*\*: Update `tasks/lessons.md` after corrections



\## Core Principles



\- \*\*Simplicity First\*\*: Make every change as simple as possible. Impact minimal code.

\- \*\*No Laziness\*\*: Find root causes. No temporary fixes. Senior developer standards.

\- \*\*Minimal Impact\*\*: Changes should only touch what's necessary. Avoid introducing bugs.



---------------------


# Etsy Listing Optimizer — Project Plan

## Context
Build a web tool for the Etsy shop **MyHomeByMax** that connects to the Etsy API, pulls full listing data, performs keyword research, and generates actionable optimization recommendations to improve listing rankings.

**Shop:** https://www.etsy.com/shop/MyHomeByMax
**Local folder:** `C:\Users\IgorBekker\Dropbox\Business and Projects\Claude\etsy`
**API limitations:** Etsy API v3 cannot update title/description/tags — recommendations for those will be manual. Images and alt-text CAN be updated via API.

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

## Phase 2 — Future (Not Now)
- A/B testing framework
- Historical tracking & trend charts
- Bulk recommendation export
- Auto-update images/alt-text via API
- Scheduled re-analysis

---

## Tech Stack
- **Next.js 16** (React + API routes, App Router)
- **TypeScript**
- **Tailwind CSS** for styling
- **Simple JWT auth** (bcryptjs + jsonwebtoken, no NextAuth)
- **JSON files** for persistent config/data (no database)
- **Git** for version control
- **Railway** for hosting (persistent filesystem, no serverless timeouts)

## Setup
1. `npm install`
2. `node scripts/generate-jwt-secret.js` → copy output to `.env.local`
3. `node scripts/hash-password.js <your-password>` → copy output to `.env.local`
4. Fill in Etsy API keys in `.env.local` (ETSY_API_KEY, ETSY_SHARED_SECRET, ETSY_SHOP_ID)
5. `npm run dev` → open http://localhost:3000

---

## GitHub Repo
https://github.com/igorbekker/etsy

## Key Files Structure
```
etsy/
├── CLAUDE.md
├── package.json
├── next.config.ts
├── .env.local                # API keys, auth secrets (gitignored)
├── scripts/
│   ├── generate-jwt-secret.js
│   └── hash-password.js
├── src/
│   ├── middleware.ts          # Route protection (JWT check)
│   ├── app/
│   │   ├── page.tsx           # Dashboard (SEO scores, priority sort)
│   │   ├── login/page.tsx     # Login page
│   │   ├── keywords/page.tsx  # Keyword research page
│   │   ├── listings/[id]/page.tsx  # Listing detail (Details, Images, SEO, AI Recommendations)
│   │   └── api/
│   │       ├── auth/          # Login/logout routes
│   │       ├── etsy/          # Connect, callback, listings, status, score, scores, recommendations
│   │       └── keywords/      # Research + AI suggest endpoints
│   ├── lib/
│   │   ├── auth.ts            # JWT auth logic (verify, create, hash)
│   │   ├── etsy-client.ts     # Etsy API wrapper (OAuth, listings, search)
│   │   ├── keyword-research.ts  # Autocomplete scraping + competitor analysis
│   │   ├── ai-suggestions.ts  # Claude API integration (listing + keyword recommendations)
│   │   ├── scoring.ts         # SEO scoring engine (title, tags, desc, images, metadata)
│   │   └── mock-data.ts       # Demo mode mock data (listings, recommendations, keywords)
├── data/                      # JSON storage (etsy-tokens.json, gitignored)
└── tasks/
    ├── todo.md                # Phase 1 checklist + review
    └── lessons.md             # Lessons from corrections
```

---

## Verification
1. Login → see dashboard with all shop listings loaded from Etsy API
2. Click a listing → see full data + SEO score + recommendations
3. Run keyword research for a seed term → see autocomplete suggestions + competitor data
4. Recommendations are specific and actionable (not generic)
