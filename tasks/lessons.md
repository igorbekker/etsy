# Lessons Learned

## 1. Don't over-engineer storage
**Correction:** User pushed back on SQL database suggestion — "why do we even need a DB for this?"
**Rule:** For single-user tools, default to the simplest storage (JSON files, env vars). Only suggest a database when there's a clear need for concurrent access, complex queries, or multi-user data.

## 2. Verify API claims before presenting them
**Correction:** User said "i think it does allow for keyword data in their api. do more digging" when I initially said Etsy had no keyword data.
**Rule:** When researching API capabilities, do a thorough deep dive before making definitive claims. Search official docs, GitHub issues, and community forums. Present findings with confidence levels, not absolutes.

## 3. Ask about the user's existing setup before assuming
**Correction:** User had a specific GitHub repo (`igorbekker/etsy`) already created. I initialized a local git repo without asking about their remote.
**Rule:** When setting up git, always ask for the remote repo URL first. Don't assume it doesn't exist yet.

## 4. Follow the CLAUDE.md workflow rigorously
**Correction:** User had to ask twice "re-read the MD and check that you followed it" — revealing missed task files, missing features, and workflow violations.
**Rule:** After completing work, systematically walk through every line of CLAUDE.md and verify compliance before declaring done. Create `tasks/todo.md` and `tasks/lessons.md` at project start, not as an afterthought.

## 5. Don't mark tasks complete until ALL sub-items are done
**Correction:** Marked tasks complete but dashboard was missing SEO scores, AI suggestions weren't built, side-by-side view was absent.
**Rule:** A feature is only done when every bullet point under it in the plan is implemented and verified. Partial implementation = in_progress, not completed.

## 7. Wrap all JSON.parse() calls from external sources in try-catch
**Pattern found:** Both `generateListingRecommendations` and `generateKeywordSuggestions` called `JSON.parse(textContent.text)` with no error handling. Any malformed AI response would crash the API route with a 500.
**Rule:** Any `JSON.parse()` on data from an external source (AI, API, user input) must be wrapped in try-catch. Internal/hardcoded JSON is fine without it.

## 8. Input validation must run before feature flags and mode checks
**Pattern found:** In `keywords/research/route.ts`, the `!keyword` validation ran after `if (DEMO_MODE)`, meaning demo mode returned `seedKeyword: undefined` on missing input.
**Rule:** Validate inputs at the very top of the handler, before any branching (DEMO_MODE, feature flags, connection checks). Invalid input should always return 400 immediately.

## 9. Never use recursive self-calls as a fallback
**Pattern found:** `getMockRecommendations(listingId)` called `getMockRecommendations(1001)` as its not-found fallback — infinite recursion if listing 1001 is ever removed.
**Rule:** Fallbacks must use direct data access (`MOCK_LISTINGS[0]`), not recursive calls. If there's truly no data, throw a clear error rather than silently loop.

## 10. Switch statements on typed unions still need a default return
**Pattern found:** `getSortedListings()` covered all 3 `SortMode` cases but had no `default` branch. TypeScript (depending on strictness settings) may not guarantee exhaustiveness and could infer `undefined` return type.
**Rule:** Always add a `default: return sorted` to switch statements that return values, even if the union appears exhaustive. Prevents TypeScript inference issues and runtime undefined returns.

## 11. Update lessons.md — don't wait to be reminded
**Pattern found:** After fixing bugs in a session, lessons.md was not updated until the user explicitly asked "fix it."
**Rule:** After ANY correction or bug fix, update `tasks/lessons.md` immediately — before committing. This is part of the Definition of Done per CLAUDE.md.

## 6. Self-verify LINE BY LINE, not section by section
**Correction:** User asked "re-read the MD and check" 4 consecutive times. Each time found a new gap: (1) missing workflow files + features, (2) outdated file structure, (3) backend without frontend wiring, (4) missing UI field + scoring gap.
**Rule:** When verifying against the CLAUDE.md, check EVERY SINGLE LINE — not just section headers. For each bullet point: (a) does the backend implement it? (b) does the frontend expose it to the user? (c) does the file structure doc match? A backend endpoint without a frontend button is NOT done. A data field without UI display is NOT done.
